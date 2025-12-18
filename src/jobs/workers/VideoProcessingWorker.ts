/**
 * Video Processing Worker
 * Background job worker for processing uploaded videos
 * Handles compression, thumbnail generation, and metadata extraction
 */

import { Worker, Job } from 'bullmq'
import Redis from 'redis'
import { VideoProcessingService } from '../../services/VideoProcessingService'
import { StorageService } from '../../services/StorageService'
import { S3StorageService } from '../../services/S3StorageService'
import { Database } from '../../database'
import { redisConnection } from '../../cache/redis'
import { config } from '../../config'
import { logger } from '../../utils/logger'
import { VideoProcessingJob } from '../../types/upload.types'

export class VideoProcessingWorker {
  private worker: Worker<VideoProcessingJob>
  private videoProcessingService: VideoProcessingService
  private storageService: StorageService
  private db: Database

  constructor() {
    this.videoProcessingService = new VideoProcessingService()
    this.storageService = new StorageService()
    this.db = new Database()

    this.worker = new Worker<VideoProcessingJob>(
      'videoProcessingQueue',
      async (job: Job<VideoProcessingJob>) => this.processVideo(job),
      {
        connection: redisConnection,
        concurrency: config.VIDEO_PROCESSING_CONCURRENCY || 2,
      }
    )

    // Event listeners
    this.setupEventListeners()
  }

  /**
   * Main video processing logic
   */
  private async processVideo(job: Job<VideoProcessingJob>): Promise<void> {
    const { postId, userId, uploadId, filePath, fileName, metadata, options } =
      job.data

    try {
      logger.info(`Starting video processing: ${postId}`)

      // Update job progress
      job.progress(10)

      // Validate file exists
      const fileExists = await this.storageService.fileExists(filePath)
      if (!fileExists) {
        throw new Error(`Video file not found: ${filePath}`)
      }

      // Extract video metadata
      logger.info(`Extracting metadata for ${postId}`)
      job.progress(20)

      const videoMetadata = await this.videoProcessingService.extractMetadata(
        filePath
      )

      // Process video (compress/transcode)
      logger.info(`Processing video: ${postId}`)
      job.progress(30)

      const processedFilePath = await this.videoProcessingService.processVideo(
        filePath,
        {
          quality: options.quality || 'medium',
          platform: options.platform || 'twitter',
        }
      )

      job.progress(60)

      // Generate thumbnail
      logger.info(`Generating thumbnail for ${postId}`)
      job.progress(70)

      let thumbnailPath: string | undefined
      if (options.generateThumbnail) {
        thumbnailPath = await this.videoProcessingService.generateThumbnail(
          processedFilePath,
          {
            timestamp: '10%',
            size: '1280x720',
            format: 'jpg',
          }
        )
      }

      job.progress(80)

      // Upload to S3 if enabled
      let uploadedVideoUrl: string | undefined
      let uploadedThumbnailUrl: string | undefined

      if (config.AWS_S3_ENABLED) {
        logger.info(`Uploading to S3: ${postId}`)
        job.progress(85)

        const s3Service = new S3StorageService()

        // Upload video
        uploadedVideoUrl = await s3Service.uploadVideo(
          processedFilePath,
          `videos/${userId}/${postId}.mp4`,
          {
            ContentType: 'video/mp4',
            Metadata: {
              userId,
              postId,
              uploadId,
            },
          }
        )

        // Upload thumbnail if exists
        if (thumbnailPath) {
          uploadedThumbnailUrl = await s3Service.uploadThumbnail(
            thumbnailPath,
            `thumbnails/${userId}/${postId}.jpg`,
            {
              ContentType: 'image/jpeg',
              Metadata: {
                userId,
                postId,
              },
            }
          )
        }
      }

      job.progress(90)

      // Update database with processed video information
      logger.info(`Updating database for ${postId}`)

      const mediaUrl = uploadedVideoUrl || processedFilePath
      const thumbnailUrl = uploadedThumbnailUrl || thumbnailPath

      await this.db.query(
        `UPDATE posts SET
          media_url = $1,
          thumbnail_url = $2,
          processing_status = $3,
          video_duration = $4,
          video_size = $5,
          video_metadata = $6,
          updated_at = NOW()
        WHERE id = $7`,
        [
          mediaUrl,
          thumbnailUrl,
          'ready',
          videoMetadata.duration,
          videoMetadata.size,
          JSON.stringify(videoMetadata),
          postId,
        ]
      )

      // Update chunked upload record
      await this.db.query(
        `UPDATE chunked_uploads SET
          status = $1,
          updated_at = NOW()
        WHERE upload_id = $2`,
        ['completed', uploadId]
      )

      job.progress(100)

      logger.info(`Video processing completed: ${postId}`)

      // Return job result
      return {
        postId,
        videoUrl: mediaUrl,
        thumbnailUrl,
        duration: videoMetadata.duration,
        processingTime: Date.now() - job.timestamp,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error(`Video processing failed for ${postId}: ${errorMessage}`)

      // Update database with error status
      await this.db.query(
        `UPDATE posts SET
          processing_status = $1,
          error_message = $2,
          updated_at = NOW()
        WHERE id = $3`,
        ['failed', errorMessage, postId]
      )

      // Update chunked upload record with error
      await this.db.query(
        `UPDATE chunked_uploads SET
          status = $1,
          error_message = $2,
          updated_at = NOW()
        WHERE upload_id = $3`,
        ['failed', errorMessage, uploadId]
      )

      throw error
    }
  }

  /**
   * Setup worker event listeners
   */
  private setupEventListeners(): void {
    this.worker.on('completed', (job: Job<VideoProcessingJob>) => {
      logger.info(`Video processing job completed: ${job.id}`)
    })

    this.worker.on('failed', (job: Job<VideoProcessingJob> | undefined, error: Error) => {
      if (job) {
        logger.error(
          `Video processing job failed: ${job.id} - ${error.message}`
        )
      }
    })

    this.worker.on('active', (job: Job<VideoProcessingJob>) => {
      logger.info(`Video processing job started: ${job.id}`)
    })

    this.worker.on('progress', (job: Job<VideoProcessingJob>, progress: number) => {
      logger.debug(
        `Video processing progress: ${job.id} - ${progress}%`
      )
    })
  }

  /**
   * Close the worker
   */
  async close(): Promise<void> {
    await this.worker.close()
    logger.info('Video processing worker closed')
  }

  /**
   * Get worker instance
   */
  getWorker(): Worker<VideoProcessingJob> {
    return this.worker
  }
}

// Export worker instance
let videoProcessingWorker: VideoProcessingWorker | null = null

export function getVideoProcessingWorker(): VideoProcessingWorker {
  if (!videoProcessingWorker) {
    videoProcessingWorker = new VideoProcessingWorker()
  }
  return videoProcessingWorker
}

/**
 * Initialize the worker (should be called once on application startup)
 */
export async function initializeVideoProcessingWorker(): Promise<VideoProcessingWorker> {
  const worker = getVideoProcessingWorker()
  logger.info(
    `Video processing worker initialized with concurrency: ${config.VIDEO_PROCESSING_CONCURRENCY || 2}`
  )
  return worker
}
