/**
 * Resumable Upload Manager
 * Manages resumable uploads with queue, bandwidth throttling, and persistence
 */

import {
  UploadTask,
  UploadProgress,
  ChunkInfo,
  UploadCompleteResponse,
} from '../../../src/types/upload.types'
import { getUploadStorage, UploadStorage } from './uploadStorage'

interface UploadManagerConfig {
  maxConcurrentUploads: number
  maxQueuedUploads: number
  chunkSize: number // in bytes
  maxUploadSpeedMbps: number // 0 = unlimited
  maxRetries: number
  retryBackoffMs: number
}

interface UploadEventCallbacks {
  onProgress?: (uploadId: string, progress: UploadProgress) => void
  onChunkComplete?: (uploadId: string, chunkIndex: number) => void
  onUploadComplete?: (uploadId: string, videoUrl: string) => void
  onUploadFailed?: (uploadId: string, error: string) => void
  onStatusChange?: (uploadId: string, status: UploadTask['status']) => void
}

export class ResumableUploadManager {
  private uploadQueue: Map<string, UploadTask> = new Map()
  private activeUploads: Map<string, UploadTask> = new Map()
  private storage: UploadStorage
  private config: UploadManagerConfig
  private callbacks: UploadEventCallbacks = {}
  private uploadStartTimes: Map<string, number> = new Map()
  private uploadedBytes: Map<string, number> = new Map()
  private bandwidthLimiters: Map<string, BandwidthLimiter> = new Map()

  constructor(
    config: Partial<UploadManagerConfig> = {},
    callbacks: UploadEventCallbacks = {}
  ) {
    this.storage = getUploadStorage()
    this.config = {
      maxConcurrentUploads: config.maxConcurrentUploads || 2,
      maxQueuedUploads: config.maxQueuedUploads || 10,
      chunkSize: config.chunkSize || 5 * 1024 * 1024, // 5MB default
      maxUploadSpeedMbps: config.maxUploadSpeedMbps || 0,
      maxRetries: config.maxRetries || 3,
      retryBackoffMs: config.retryBackoffMs || 1000,
    }
    this.callbacks = callbacks
  }

  /**
   * Add a file to the upload queue
   */
  async addToQueue(
    file: File,
    metadata: Record<string, any> = {}
  ): Promise<string> {
    const uploadId = this.generateUploadId()
    const totalChunks = Math.ceil(file.size / this.config.chunkSize)

    const chunks: ChunkInfo[] = Array.from({ length: totalChunks }, (_, i) => ({
      index: i,
      start: i * this.config.chunkSize,
      end: Math.min((i + 1) * this.config.chunkSize, file.size),
      size: Math.min(
        this.config.chunkSize,
        file.size - i * this.config.chunkSize
      ),
      uploaded: false,
      attempts: 0,
    }))

    const uploadTask: UploadTask = {
      uploadId,
      file,
      metadata,
      progress: {
        uploadId,
        uploadedBytes: 0,
        totalBytes: file.size,
        progress: 0,
        uploadedChunks: 0,
        totalChunks,
        uploadSpeed: 0,
        remainingTime: 0,
        isActive: false,
        isPaused: false,
      },
      status: 'pending',
      chunks,
      createdAt: new Date(),
      error: undefined,
    }

    // Check total limits (queued + active)
    const totalUploads = this.uploadQueue.size + this.activeUploads.size
    if (totalUploads >= this.config.maxQueuedUploads) {
      throw new Error(
        `Upload queue is full. Maximum ${this.config.maxQueuedUploads} uploads allowed.`
      )
    }

    this.uploadQueue.set(uploadId, uploadTask)
    await this.storage.saveUpload(uploadTask)
    await this.storage.addToQueue(uploadTask)
    this.callbacks.onStatusChange?.(uploadId, 'pending')

    // Automatically start if space available, but yield so callers can observe queue state.
    setTimeout(() => {
      void this.processQueue()
    }, 0)

    return uploadId
  }

  /**
   * Start an upload from the queue
   */
  async startUpload(uploadId: string): Promise<void> {
    const task = this.uploadQueue.get(uploadId)
    if (!task) {
      throw new Error(`Upload not found: ${uploadId}`)
    }

    if (this.activeUploads.size >= this.config.maxConcurrentUploads) {
      throw new Error('Maximum concurrent uploads reached')
    }

    // Move from queue to active
    this.uploadQueue.delete(uploadId)
    this.activeUploads.set(uploadId, task)

    task.status = 'uploading'
    task.startedAt = new Date()
    task.progress.isActive = true
    task.progress.isPaused = false

    this.uploadStartTimes.set(uploadId, Date.now())
    this.uploadedBytes.set(uploadId, 0)

    // Create bandwidth limiter if needed
    if (this.config.maxUploadSpeedMbps > 0) {
      this.bandwidthLimiters.set(
        uploadId,
        new BandwidthLimiter(this.config.maxUploadSpeedMbps)
      )
    }

    await this.storage.saveUpload(task)
    await this.storage.removeFromQueue(uploadId)
    this.callbacks.onStatusChange?.(uploadId, 'uploading')

    // Start uploading chunks
    await this.uploadChunks(uploadId)
  }

  /**
   * Upload chunks with parallel uploads
   */
  private async uploadChunks(uploadId: string): Promise<void> {
    const task = this.activeUploads.get(uploadId)
    if (!task) {
      throw new Error(`Upload not found: ${uploadId}`)
    }

    // Initialize upload on server
    await this.initializeServerUpload(task)

    // Upload chunks in parallel (max 4 concurrent)
    const maxParallelChunks = 4
    const pendingChunks = task.chunks.filter((c) => !c.uploaded)

    for (let i = 0; i < pendingChunks.length; i += maxParallelChunks) {
      const chunkBatch = pendingChunks.slice(
        i,
        i + maxParallelChunks
      )

      const uploadPromises = chunkBatch.map((chunk) =>
        this.uploadChunk(uploadId, chunk, task.file)
      )

      try {
        await Promise.all(uploadPromises)
      } catch (error) {
        if (task.status === 'paused') {
          return // Upload was paused
        }
        throw error
      }

      // Update progress
      this.updateProgress(uploadId)
    }

    // Complete upload
    if (task.status !== 'paused') {
      await this.completeUpload(uploadId, task)
    }
  }

  /**
   * Upload a single chunk
   */
  private async uploadChunk(
    uploadId: string,
    chunk: ChunkInfo,
    file: File
  ): Promise<void> {
    const task = this.activeUploads.get(uploadId)
    if (!task || task.status === 'paused') {
      return
    }

    const maxRetries = this.config.maxRetries
    let lastError: Error | null = null

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Extract chunk data
        const chunkData = file.slice(chunk.start, chunk.end)

        // Calculate checksum (SHA-256)
        const checksum = await this.calculateChecksum(chunkData)

        // Apply bandwidth limiting if configured
        const limiter = this.bandwidthLimiters.get(uploadId)
        if (limiter) {
          await limiter.waitForCapacity(chunk.size)
        }

        // Upload chunk to server
        const formData = new FormData()
        formData.append('chunk', chunkData)
        formData.append('chunkIndex', chunk.index.toString())
        formData.append('checksum', checksum)

        const response = await fetch(
          `/api/upload/chunk/${uploadId}`,
          {
            method: 'POST',
            body: formData,
          }
        )

        if (!response.ok) {
          const errorMessage = await this.getErrorMessage(
            response,
            'Chunk upload failed'
          )
          throw new Error(errorMessage)
        }

        // Mark chunk as uploaded
        chunk.uploaded = true
        chunk.attempts = attempt
        chunk.lastAttemptTime = new Date()

        await this.storage.markChunkUploaded(uploadId, chunk.index)
        this.callbacks.onChunkComplete?.(uploadId, chunk.index)

        // Track uploaded bytes for bandwidth calculation
        const uploadedSoFar = this.uploadedBytes.get(uploadId) || 0
        this.uploadedBytes.set(uploadId, uploadedSoFar + chunk.size)

        return // Success
      } catch (error) {
        lastError = error as Error
        chunk.attempts = attempt + 1

        if (attempt < maxRetries - 1) {
          // Exponential backoff
          const waitTime = this.config.retryBackoffMs * Math.pow(2, attempt)
          await new Promise((resolve) => setTimeout(resolve, waitTime))
        }
      }
    }

    // All retries failed
    throw new Error(
      `Failed to upload chunk ${chunk.index} after ${maxRetries} attempts: ${lastError?.message}`
    )
  }

  /**
   * Initialize upload session on server
   */
  private async initializeServerUpload(
    task: UploadTask
  ): Promise<any> {
    const response = await fetch('/api/upload/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: task.file.name,
        fileSize: task.file.size,
        fileMimeType: task.file.type,
        metadata: task.metadata,
      }),
    })

    if (!response.ok) {
      const errorMessage = await this.getErrorMessage(
        response,
        'Failed to initialize upload'
      )
      throw new Error(errorMessage)
    }

    return await response.json()
  }

  /**
   * Complete upload
   */
  private async completeUpload(uploadId: string, task: UploadTask): Promise<void> {
    const response = await fetch(`/api/upload/complete/${uploadId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        metadata: task.metadata,
      }),
    })

    if (!response.ok) {
      const errorMessage = await this.getErrorMessage(
        response,
        'Failed to complete upload'
      )
      throw new Error(errorMessage)
    }

    const result = (await response.json()) as UploadCompleteResponse

    // Update task
    task.status = 'completed'
    task.completedAt = new Date()
    task.progress.isActive = false
    task.progress.progress = 100

    await this.storage.deleteUpload(uploadId)
    this.activeUploads.delete(uploadId)
    this.bandwidthLimiters.delete(uploadId)
    this.uploadStartTimes.delete(uploadId)
    this.uploadedBytes.delete(uploadId)

    this.callbacks.onUploadComplete?.(uploadId, result.videoUrl)
    this.callbacks.onStatusChange?.(uploadId, 'completed')

    // Process next in queue
    await this.processQueue()
  }

  /**
   * Pause an upload
   */
  async pauseUpload(uploadId: string): Promise<void> {
    const task = this.activeUploads.get(uploadId)
    const queuedTask = this.uploadQueue.get(uploadId)

    if (!task && !queuedTask) {
      throw new Error(`Upload not found: ${uploadId}`)
    }

    const targetTask = task || queuedTask
    if (!targetTask) {
      throw new Error(`Upload not found: ${uploadId}`)
    }

    targetTask.status = 'paused'
    targetTask.progress.isPaused = true
    targetTask.progress.isActive = false

    await this.storage.saveUpload(targetTask)
    this.callbacks.onStatusChange?.(uploadId, 'paused')
  }

  /**
   * Resume a paused upload
   */
  async resumeUpload(uploadId: string): Promise<void> {
    let task = this.uploadQueue.get(uploadId) || this.activeUploads.get(uploadId)

    if (!task) {
      // Try to recover from storage
      const storedTask = await this.storage.getUpload(uploadId)
      if (!storedTask) {
        throw new Error(`Upload not found: ${uploadId}`)
      }
      const chunks = await this.storage.getUploadChunks(uploadId)
      task = { ...storedTask, chunks }
      this.uploadQueue.set(uploadId, task)
    }

    if (task.status === 'paused' || task.status === 'pending') {
      if (this.activeUploads.has(uploadId)) {
        task.status = 'uploading'
        task.progress.isActive = true
        task.progress.isPaused = false
        await this.storage.saveUpload(task)
        this.callbacks.onStatusChange?.(uploadId, 'uploading')
        await this.uploadChunks(uploadId)
      } else if (this.activeUploads.size < this.config.maxConcurrentUploads) {
        await this.startUpload(uploadId)
      } else {
        // Re-queue
        this.uploadQueue.set(uploadId, task)
        await this.storage.addToQueue(task)
        this.callbacks.onStatusChange?.(uploadId, 'pending')
      }
    }
  }

  /**
   * Cancel an upload
   */
  async cancelUpload(uploadId: string): Promise<void> {
    const inQueue = this.uploadQueue.has(uploadId)
    const inActive = this.activeUploads.has(uploadId)

    if (inQueue) {
      this.uploadQueue.delete(uploadId)
    } else if (inActive) {
      const task = this.activeUploads.get(uploadId)!
      task.status = 'paused' // Pause first to stop current uploads
      this.activeUploads.delete(uploadId)
    }

    // Clean up resources
    this.bandwidthLimiters.delete(uploadId)
    this.uploadStartTimes.delete(uploadId)
    this.uploadedBytes.delete(uploadId)

    // Delete from server (skip in non-browser environments)
    if (typeof window !== 'undefined') {
      try {
        await fetch(`/api/upload/cancel/${uploadId}`, { method: 'DELETE' })
      } catch (error) {
        console.warn(`Failed to cancel upload on server: ${error}`)
      }
    }

    // Delete from storage
    await this.storage.deleteUpload(uploadId)
    await this.storage.removeFromQueue(uploadId)

    this.callbacks.onStatusChange?.(uploadId, 'paused')
  }

  /**
   * Get upload progress
   */
  getUploadProgress(uploadId: string): UploadProgress | undefined {
    const task = this.activeUploads.get(uploadId) || this.uploadQueue.get(uploadId)
    return task?.progress
  }

  /**
   * Update progress metrics
   */
  private updateProgress(uploadId: string): void {
    const task = this.activeUploads.get(uploadId)
    if (!task) return

    const uploadedChunks = task.chunks.filter((c) => c.uploaded).length
    const uploadedBytes = this.uploadedBytes.get(uploadId) || 0
    const progress = Math.round((uploadedChunks / task.chunks.length) * 100)

    const startTime = this.uploadStartTimes.get(uploadId) || Date.now()
    const elapsedSeconds = (Date.now() - startTime) / 1000
    const uploadSpeed =
      elapsedSeconds > 0 ? uploadedBytes / elapsedSeconds : 0

    const remainingBytes = task.file.size - uploadedBytes
    const remainingSeconds = uploadSpeed > 0 ? remainingBytes / uploadSpeed : 0

    task.progress = {
      uploadId,
      uploadedBytes,
      totalBytes: task.file.size,
      progress,
      uploadedChunks,
      totalChunks: task.chunks.length,
      uploadSpeed,
      remainingTime: remainingSeconds * 1000,
      isActive: task.status === 'uploading',
      isPaused: task.status === 'paused',
    }

    this.callbacks.onProgress?.(uploadId, task.progress)
  }

  /**
   * Process the upload queue
   */
  private async processQueue(): Promise<void> {
    while (
      this.uploadQueue.size > 0 &&
      this.activeUploads.size < this.config.maxConcurrentUploads
    ) {
      const nextEntry = Array.from(this.uploadQueue.entries()).find(
        ([, queuedTask]) => queuedTask.status !== 'paused'
      )
      if (!nextEntry) {
        return
      }
      const [uploadId] = nextEntry
      try {
        await this.startUpload(uploadId)
      } catch (error) {
        const task = this.uploadQueue.get(uploadId)
        if (task) {
          task.status = 'failed'
          task.error = error instanceof Error ? error.message : String(error)
          await this.storage.saveUpload(task)
          this.callbacks.onUploadFailed?.(uploadId, task.error)
        }
        this.uploadQueue.delete(uploadId)
      }
    }
  }

  /**
   * Recover unfinished uploads from storage
   */
  async recoverUnfinishedUploads(): Promise<string[]> {
    const pausedUploads = await this.storage.getUploadsByStatus('paused')
    const pendingUploads = await this.storage.getUploadsByStatus('pending')

    const toRecover = [...pausedUploads, ...pendingUploads]

    for (const upload of toRecover) {
      try {
        const chunks = await this.storage.getUploadChunks(upload.uploadId)
        this.uploadQueue.set(upload.uploadId, {
          ...upload,
          chunks,
        })
      } catch (error) {
        console.warn(`Failed to recover upload ${upload.uploadId}: ${error}`)
      }
    }

    return toRecover.map((u) => u.uploadId)
  }

  private async getErrorMessage(
    response: Response,
    fallback: string
  ): Promise<string> {
    try {
      const data = (await response.json()) as { error?: string }
      if (data && typeof data === 'object' && typeof data.error === 'string') {
        return data.error
      }
    } catch {
      // Ignore parse failures and fall back to default message.
    }

    return fallback
  }

  /**
   * Calculate checksum hash of a chunk (SHA-256)
   */
  private async calculateChecksum(data: Blob): Promise<string> {
    const buffer = await data.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  }

  /**
   * Generate upload ID
   */
  private generateUploadId(): string {
    return `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Get all active uploads
   */
  getActiveUploads(): UploadTask[] {
    return Array.from(this.activeUploads.values())
  }

  /**
   * Get queued uploads
   */
  getQueuedUploads(): UploadTask[] {
    return Array.from(this.uploadQueue.values())
  }
}

/**
 * Bandwidth Limiter - Token bucket algorithm
 */
class BandwidthLimiter {
  private tokens: number
  private lastRefillTime: number
  private readonly tokenRefillRate: number // tokens per millisecond

  constructor(maxSpeedMbps: number) {
    this.tokenRefillRate = (maxSpeedMbps * 1024 * 1024) / 1000 // bytes per millisecond
    this.tokens = this.tokenRefillRate * 100 // Start with 100ms of capacity
    this.lastRefillTime = Date.now()
  }

  async waitForCapacity(bytes: number): Promise<void> {
    while (this.tokens < bytes) {
      const now = Date.now()
      const timeSinceRefill = now - this.lastRefillTime
      this.tokens += timeSinceRefill * this.tokenRefillRate
      this.lastRefillTime = now

      if (this.tokens < bytes) {
        // Wait a bit and try again
        await new Promise((resolve) =>
          setTimeout(resolve, (bytes - this.tokens) / this.tokenRefillRate)
        )
      }
    }

    this.tokens -= bytes
  }
}
