/**
 * Chunked Upload Service
 * Manages chunked file uploads with Redis persistence and chunk validation
 */

import { promises as fs } from 'fs'
import path from 'path'
import crypto from 'crypto'
import { v4 as uuidv4 } from 'uuid'
import {
  UploadInitRequest,
  UploadInitResponse,
  UploadChunkResponse,
  UploadStatusResponse,
  UploadSession,
} from '../types/upload.types'
import { logger } from '../utils/logger'

interface RedisClient {
  get(key: string): Promise<string | null>
  set(key: string, value: string, options?: any): Promise<any>
  del(key: string): Promise<number>
  expire(key: string, seconds: number): Promise<number>
  sadd(key: string, member: string): Promise<number>
  smembers(key: string): Promise<string[]>
  scard(key: string): Promise<number>
}

export class ChunkedUploadService {
  private redis: RedisClient
  private tempChunkDir: string
  private chunkSizeMb: number
  private maxUploadSizeMb: number
  private sessionTtlHours: number
  private maxConcurrentChunks: number

  constructor(
    redisClient: RedisClient,
    tempChunkDir: string = './uploads/temp/chunks',
    chunkSizeMb: number = 5,
    maxUploadSizeMb: number = 5120,
    sessionTtlHours: number = 24,
    maxConcurrentChunks: number = 4
  ) {
    this.redis = redisClient
    this.tempChunkDir = tempChunkDir
    this.chunkSizeMb = chunkSizeMb
    this.maxUploadSizeMb = maxUploadSizeMb
    this.sessionTtlHours = sessionTtlHours
    this.maxConcurrentChunks = maxConcurrentChunks
  }

  /**
   * Initialize a new chunked upload session
   */
  async initializeUpload(
    userId: string,
    request: UploadInitRequest
  ): Promise<UploadInitResponse> {
    // Validate file size
    if (request.fileSize > this.maxUploadSizeMb * 1024 * 1024) {
      throw new Error(
        `File size exceeds maximum allowed size of ${this.maxUploadSizeMb}MB`
      )
    }

    // Generate upload ID
    const uploadId = uuidv4()

    // Calculate total chunks
    const chunkSizeBytes = this.chunkSizeMb * 1024 * 1024
    const totalChunks = Math.ceil(request.fileSize / chunkSizeBytes)

    // Create upload session
    const session: UploadSession = {
      uploadId,
      userId,
      fileName: request.fileName,
      fileSize: request.fileSize,
      chunkSize: chunkSizeBytes,
      totalChunks,
      uploadedChunks: new Set(),
      checksum: request.fileChecksum,
      createdAt: new Date(),
      lastActivityAt: new Date(),
      expiresAt: new Date(Date.now() + this.sessionTtlHours * 60 * 60 * 1000),
      metadata: request.metadata,
    }

    // Save session to Redis
    const ttlSeconds = this.sessionTtlHours * 60 * 60
    await this.redis.set(
      `upload:${uploadId}:session`,
      JSON.stringify(session),
      { EX: ttlSeconds }
    )

    // Create temp directory for this upload
    const uploadTempDir = path.join(this.tempChunkDir, uploadId)
    await fs.mkdir(uploadTempDir, { recursive: true })

    logger.info(`Upload session initialized: ${uploadId} for user ${userId}`)

    return {
      uploadId,
      chunkSize: chunkSizeBytes,
      totalChunks,
      expiresAt: session.expiresAt,
    }
  }

  /**
   * Save an uploaded chunk
   */
  async saveChunk(
    uploadId: string,
    chunkIndex: number,
    chunkData: Buffer,
    providedChecksum: string
  ): Promise<UploadChunkResponse> {
    // Validate session exists
    const sessionStr = await this.redis.get(`upload:${uploadId}:session`)
    if (!sessionStr) {
      throw new Error(`Upload session not found: ${uploadId}`)
    }

    const session = JSON.parse(sessionStr) as UploadSession

    // Validate chunk index
    if (chunkIndex < 0 || chunkIndex >= session.totalChunks) {
      throw new Error(`Invalid chunk index: ${chunkIndex}`)
    }

    // Validate chunk checksum (MD5)
    const calculatedChecksum = crypto
      .createHash('md5')
      .update(chunkData)
      .digest('hex')

    if (calculatedChecksum !== providedChecksum) {
      throw new Error(`Checksum mismatch for chunk ${chunkIndex}`)
    }

    // Check concurrent chunk uploads limit
    const activeChunks = await this.redis.scard(`upload:${uploadId}:processing`)
    if (activeChunks >= this.maxConcurrentChunks) {
      throw new Error(
        `Too many concurrent chunk uploads. Maximum is ${this.maxConcurrentChunks}`
      )
    }

    // Mark chunk as processing
    await this.redis.sadd(`upload:${uploadId}:processing`, chunkIndex.toString())

    try {
      // Save chunk to disk
      const chunkPath = path.join(
        this.tempChunkDir,
        uploadId,
        `chunk-${chunkIndex}`
      )
      await fs.writeFile(chunkPath, chunkData)

      // Add to uploaded chunks set
      await this.redis.sadd(
        `upload:${uploadId}:chunks`,
        chunkIndex.toString()
      )

      // Update last activity time
      session.lastActivityAt = new Date()
      const ttlSeconds = this.sessionTtlHours * 60 * 60
      await this.redis.set(
        `upload:${uploadId}:session`,
        JSON.stringify(session),
        { EX: ttlSeconds }
      )

      // Get uploaded chunks count
      const uploadedChunks = await this.redis.scard(
        `upload:${uploadId}:chunks`
      )
      const progress = Math.round((uploadedChunks / session.totalChunks) * 100)

      logger.info(
        `Chunk ${chunkIndex} saved for upload ${uploadId}. Progress: ${progress}%`
      )

      return {
        uploadId,
        chunkIndex,
        uploadedChunks,
        totalChunks: session.totalChunks,
        progress,
      }
    } finally {
      // Remove from processing set
      const processingKey = `upload:${uploadId}:processing`
      await this.redis.del(processingKey)
    }
  }

  /**
   * Assemble chunks into a complete file
   */
  async assembleChunks(uploadId: string): Promise<string> {
    // Validate all chunks are uploaded
    const sessionStr = await this.redis.get(`upload:${uploadId}:session`)
    if (!sessionStr) {
      throw new Error(`Upload session not found: ${uploadId}`)
    }

    const session = JSON.parse(sessionStr) as UploadSession
    const uploadedChunkIndices = await this.redis.smembers(
      `upload:${uploadId}:chunks`
    )

    if (uploadedChunkIndices.length !== session.totalChunks) {
      throw new Error(
        `Not all chunks uploaded. Expected ${session.totalChunks}, got ${uploadedChunkIndices.length}`
      )
    }

    // Create output file path
    const timestamp = Date.now()
    const outputDir = path.join('./uploads/videos')
    await fs.mkdir(outputDir, { recursive: true })
    const outputPath = path.join(
      outputDir,
      `${uploadId}_${timestamp}_${session.fileName}`
    )

    // Assemble chunks in order
    const outputStream = await fs.open(outputPath, 'w')

    try {
      for (let i = 0; i < session.totalChunks; i++) {
        const chunkPath = path.join(
          this.tempChunkDir,
          uploadId,
          `chunk-${i}`
        )
        const chunkData = await fs.readFile(chunkPath)
        await outputStream.write(chunkData)
      }

      logger.info(
        `Chunks assembled for upload ${uploadId} to ${outputPath}`
      )

      return outputPath
    } finally {
      await outputStream.close()
    }
  }

  /**
   * Get upload status
   */
  async getUploadStatus(uploadId: string): Promise<UploadStatusResponse> {
    const sessionStr = await this.redis.get(`upload:${uploadId}:session`)
    if (!sessionStr) {
      throw new Error(`Upload session not found: ${uploadId}`)
    }

    const session = JSON.parse(sessionStr) as UploadSession
    const uploadedChunks = await this.redis.scard(`upload:${uploadId}:chunks`)
    const uploadedBytes = uploadedChunks * session.chunkSize
    const progress = Math.round((uploadedChunks / session.totalChunks) * 100)

    // Determine status
    let status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed' | 'expired' =
      uploadedChunks === 0 ? 'pending' : 'uploading'

    const processingJobId = await this.redis.get(`upload:${uploadId}:jobId`)
    if (processingJobId) {
      status = 'processing'
    }

    const error = await this.redis.get(`upload:${uploadId}:error`)

    return {
      uploadId,
      status,
      fileName: session.fileName,
      fileSize: session.fileSize,
      uploadedBytes: Math.min(uploadedBytes, session.fileSize),
      uploadedChunks,
      totalChunks: session.totalChunks,
      progress,
      uploadedAt: session.createdAt,
      expiresAt: session.expiresAt,
      error: error || undefined,
    }
  }

  /**
   * Cancel an upload and clean up resources
   */
  async cancelUpload(uploadId: string): Promise<void> {
    // Get session to know how many chunks to delete
    const sessionStr = await this.redis.get(`upload:${uploadId}:session`)
    if (sessionStr) {
      const session = JSON.parse(sessionStr) as UploadSession

      // Delete all chunks
      for (let i = 0; i < session.totalChunks; i++) {
        const chunkPath = path.join(
          this.tempChunkDir,
          uploadId,
          `chunk-${i}`
        )
        try {
          await fs.unlink(chunkPath)
        } catch (err) {
          logger.warn(`Failed to delete chunk ${i}: ${err}`)
        }
      }

      // Delete temp directory
      try {
        await fs.rmdir(path.join(this.tempChunkDir, uploadId))
      } catch (err) {
        logger.warn(`Failed to delete temp directory: ${err}`)
      }
    }

    // Clean up Redis keys
    await this.redis.del(`upload:${uploadId}:session`)
    await this.redis.del(`upload:${uploadId}:chunks`)
    await this.redis.del(`upload:${uploadId}:processing`)
    await this.redis.del(`upload:${uploadId}:jobId`)
    await this.redis.del(`upload:${uploadId}:error`)

    logger.info(`Upload cancelled: ${uploadId}`)
  }

  /**
   * Set processing job ID for an upload
   */
  async setProcessingJobId(uploadId: string, jobId: string): Promise<void> {
    const ttlSeconds = this.sessionTtlHours * 60 * 60
    await this.redis.set(`upload:${uploadId}:jobId`, jobId, { EX: ttlSeconds })
  }

  /**
   * Set error message for an upload
   */
  async setUploadError(uploadId: string, error: string): Promise<void> {
    const ttlSeconds = this.sessionTtlHours * 60 * 60
    await this.redis.set(`upload:${uploadId}:error`, error, { EX: ttlSeconds })
  }

  /**
   * Clean up expired uploads (should be called periodically)
   */
  async cleanupExpiredUploads(): Promise<number> {
    let cleanedCount = 0

    try {
      const uploadDirs = await fs.readdir(this.tempChunkDir)

      for (const uploadId of uploadDirs) {
        const sessionStr = await this.redis.get(`upload:${uploadId}:session`)

        if (!sessionStr) {
          // Session expired, clean up
          const uploadPath = path.join(this.tempChunkDir, uploadId)
          try {
            await this.deleteDirectory(uploadPath)
            cleanedCount++
            logger.info(`Cleaned up expired upload: ${uploadId}`)
          } catch (err) {
            logger.error(`Failed to clean up upload ${uploadId}: ${err}`)
          }
        }
      }
    } catch (err) {
      logger.error(`Error during cleanup: ${err}`)
    }

    return cleanedCount
  }

  /**
   * Recursively delete directory
   */
  private async deleteDirectory(dirPath: string): Promise<void> {
    const files = await fs.readdir(dirPath)

    for (const file of files) {
      const filePath = path.join(dirPath, file)
      const stat = await fs.stat(filePath)

      if (stat.isDirectory()) {
        await this.deleteDirectory(filePath)
      } else {
        await fs.unlink(filePath)
      }
    }

    await fs.rmdir(dirPath)
  }
}

// Export singleton instance
let chunkUploadService: ChunkedUploadService | null = null

export function getChunkedUploadService(
  redisClient?: RedisClient,
  tempChunkDir?: string,
  chunkSizeMb?: number,
  maxUploadSizeMb?: number,
  sessionTtlHours?: number,
  maxConcurrentChunks?: number
): ChunkedUploadService {
  if (!chunkUploadService) {
    if (!redisClient) {
      throw new Error('Redis client is required')
    }

    chunkUploadService = new ChunkedUploadService(
      redisClient,
      tempChunkDir,
      chunkSizeMb,
      maxUploadSizeMb,
      sessionTtlHours,
      maxConcurrentChunks
    )
  }

  return chunkUploadService
}
