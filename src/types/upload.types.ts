/**
 * Upload Type Definitions
 * Comprehensive types for chunked and resumable uploads
 */

export interface UploadInitRequest {
  fileName: string
  fileSize: number
  fileMimeType: string
  fileChecksum?: string
  metadata?: Record<string, any>
}

export interface UploadInitResponse {
  uploadId: string
  chunkSize: number
  totalChunks: number
  expiresAt: Date
}

export interface UploadChunkRequest {
  uploadId: string
  chunkIndex: number
  chunkSize: number
  checksum: string // MD5 hash of chunk
}

export interface UploadChunkResponse {
  uploadId: string
  chunkIndex: number
  uploadedChunks: number
  totalChunks: number
  progress: number // percentage
}

export interface UploadCompleteRequest {
  uploadId: string
  fileChecksum: string
  metadata?: {
    title?: string
    description?: string
    tags?: string[]
    platform?: 'twitter' | 'instagram' | 'youtube' | 'tiktok'
    quality?: 'high' | 'medium' | 'low'
  }
}

export interface UploadCompleteResponse {
  uploadId: string
  postId: string
  videoUrl: string
  thumbnailUrl?: string
  status: 'processing' | 'completed'
  processingJobId: string
}

export interface UploadStatusResponse {
  uploadId: string
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed' | 'expired'
  fileName: string
  fileSize: number
  uploadedBytes: number
  uploadedChunks: number
  totalChunks: number
  progress: number
  uploadedAt: Date
  expiresAt: Date
  error?: string
}

export interface ChunkedUploadRecord {
  id: string
  uploadId: string
  userId: string
  fileName: string
  fileSize: number
  chunkSize: number
  totalChunks: number
  uploadedChunks: number[]
  checksum?: string
  status: 'pending' | 'uploading' | 'completed' | 'failed' | 'expired'
  metadata?: Record<string, any>
  createdAt: Date
  updatedAt: Date
  expiresAt: Date
}

export interface UploadProgress {
  uploadId: string
  uploadedBytes: number
  totalBytes: number
  progress: number // 0-100
  uploadedChunks: number
  totalChunks: number
  uploadSpeed: number // bytes per second
  remainingTime: number // milliseconds
  isActive: boolean
  isPaused: boolean
  error?: string
}

export interface UploadTask {
  uploadId: string
  userId?: string
  file: File
  metadata: Record<string, any>
  progress: UploadProgress
  status: 'pending' | 'uploading' | 'paused' | 'completed' | 'failed'
  chunks: ChunkInfo[]
  createdAt: Date
  queuedAt?: Date
  startedAt?: Date
  completedAt?: Date
  updatedAt?: Date
  error?: string
}

export interface ChunkInfo {
  index: number
  start: number
  end: number
  size: number
  checksum?: string
  uploaded: boolean
  attempts: number
  lastAttemptTime?: Date
}

export interface UploadQueue {
  tasks: UploadTask[]
  activeUploads: Map<string, UploadTask>
  maxConcurrentUploads: number
  maxQueuedUploads: number
}

export interface VideoProcessingJob {
  id: string
  postId: string
  userId: string
  uploadId: string
  filePath: string
  fileName: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  metadata: {
    originalSize: number
    duration: number
    resolution: string
    bitrate: number
  }
  options: {
    quality: 'high' | 'medium' | 'low'
    platform: 'twitter' | 'instagram' | 'youtube' | 'tiktok'
    generateThumbnail: boolean
  }
  processedUrl?: string
  thumbnailUrl?: string
  error?: string
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
}

export interface BandwidthThrottleConfig {
  maxUploadSpeedMbps: number // 0 = unlimited
  minUploadSpeedMbps: number
  chunkTimeoutMs: number
  tokenBucketCapacity: number
  tokenRefillRatePerSecond: number
}

export interface UploadSession {
  uploadId: string
  userId: string
  fileName: string
  fileSize: number
  chunkSize: number
  totalChunks: number
  uploadedChunks: Set<number>
  checksum?: string
  createdAt: Date
  lastActivityAt: Date
  expiresAt: Date
  metadata?: Record<string, any>
}
