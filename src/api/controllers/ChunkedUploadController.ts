/**
 * Chunked Upload Controller
 * Handles chunked upload endpoints for large video files
 */

import { Response } from 'express'
import crypto from 'crypto'
import { AuthRequest } from '../middlewares/auth'
import { ChunkedUploadService } from '../../services/ChunkedUploadService'
import { UploadInitRequest } from '../../types/upload.types'
import { logger } from '../../utils/logger'
import database from '../../database/connection'
import { videoProcessingQueue } from '../../jobs/queue'

export class ChunkedUploadController {
  constructor(
    private uploadService: ChunkedUploadService
  ) {}

  /**
   * POST /api/upload/init
   * Initialize a chunked upload session
   */
  async initializeUpload(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }

      const { fileName, fileSize, fileMimeType, fileChecksum, metadata } =
        req.body as UploadInitRequest

      // Validate required fields
      if (!fileName || !fileSize || !fileMimeType) {
        res.status(400).json({
          error: 'Missing required fields: fileName, fileSize, fileMimeType',
        })
        return
      }

      // Validate file type
      const allowedMimeTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo']
      if (!allowedMimeTypes.includes(fileMimeType)) {
        res.status(400).json({
          error: `Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`,
        })
        return
      }

      const initRequest: UploadInitRequest = {
        fileName,
        fileSize,
        fileMimeType,
        fileChecksum,
        metadata,
      }

      const response = await this.uploadService.initializeUpload(
        userId,
        initRequest
      )

      res.status(200).json(response)
    } catch (error) {
      logger.error(`Upload initialization error: ${error}`)
      res
        .status(500)
        .json({ error: error instanceof Error ? error.message : 'Unknown error' })
    }
  }

  /**
   * POST /api/upload/chunk/:uploadId
   * Upload a single chunk
   */
  async uploadChunk(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }

      const { uploadId } = req.params
      const { chunkIndex, checksum } = req.body
      const chunkData = req.file?.buffer

      if (!chunkData) {
        res.status(400).json({ error: 'No chunk data provided' })
        return
      }

      if (chunkIndex === undefined || !checksum) {
        res.status(400).json({
          error: 'Missing required fields: chunkIndex, checksum',
        })
        return
      }

      // Verify checksum is a valid MD5 hash
      if (!/^[a-f0-9]{32}$/.test(checksum)) {
        res.status(400).json({ error: 'Invalid checksum format (must be MD5 hex)' })
        return
      }

      const response = await this.uploadService.saveChunk(
        uploadId,
        parseInt(chunkIndex, 10),
        chunkData,
        checksum
      )

      res.status(200).json(response)
    } catch (error) {
      logger.error(`Chunk upload error: ${error}`)
      res
        .status(500)
        .json({ error: error instanceof Error ? error.message : 'Unknown error' })
    }
  }

  /**
   * POST /api/upload/complete/:uploadId
   * Complete the upload and assemble chunks
   */
  async completeUpload(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }

      const { uploadId } = req.params
      const { metadata } = req.body

      // Assemble chunks
      const filePath = await this.uploadService.assembleChunks(uploadId)

      // Create post record in database
      const postId = crypto.randomUUID()
      const now = new Date()

      const post = {
        id: postId,
        user_id: userId,
        title: metadata?.title || 'Untitled Video',
        description: metadata?.description || '',
        media_type: 'video',
        media_url: filePath,
        processing_status: 'pending',
        created_at: now,
        updated_at: now,
      }

      await this.db.query(
        `INSERT INTO posts (id, user_id, title, description, media_type, media_url, processing_status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          post.id,
          post.user_id,
          post.title,
          post.description,
          post.media_type,
          post.media_url,
          post.processing_status,
          post.created_at,
          post.updated_at,
        ]
      )

      // Queue video processing job
      const jobData = {
        postId,
        userId,
        uploadId,
        filePath,
        fileName: post.title,
        metadata: metadata || {},
        options: {
          quality: metadata?.quality || 'medium',
          platform: metadata?.platform || 'twitter',
          generateThumbnail: true,
        },
      }

      const job = await videoProcessingQueue.add('process-video', jobData, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: false,
        removeOnFail: false,
      })

      // Store job ID in upload service
      await this.uploadService.setProcessingJobId(uploadId, job.id || '')

      logger.info(`Upload completed: ${uploadId}, processing job: ${job.id}`)

      res.status(200).json({
        uploadId,
        postId,
        videoUrl: filePath,
        status: 'processing',
        processingJobId: job.id,
      })
    } catch (error) {
      logger.error(`Upload completion error: ${error}`)
      res
        .status(500)
        .json({ error: error instanceof Error ? error.message : 'Unknown error' })
    }
  }

  /**
   * GET /api/upload/status/:uploadId
   * Get upload status
   */
  async getUploadStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }

      const { uploadId } = req.params

      const status = await this.uploadService.getUploadStatus(uploadId)

      res.status(200).json(status)
    } catch (error) {
      logger.error(`Get upload status error: ${error}`)
      res
        .status(500)
        .json({ error: error instanceof Error ? error.message : 'Unknown error' })
    }
  }

  /**
   * DELETE /api/upload/cancel/:uploadId
   * Cancel an upload
   */
  async cancelUpload(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }

      const { uploadId } = req.params

      await this.uploadService.cancelUpload(uploadId)

      logger.info(`Upload cancelled: ${uploadId}`)

      res.status(200).json({ message: 'Upload cancelled successfully' })
    } catch (error) {
      logger.error(`Cancel upload error: ${error}`)
      res
        .status(500)
        .json({ error: error instanceof Error ? error.message : 'Unknown error' })
    }
  }
}
