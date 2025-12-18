/**
 * Chunked Upload Routes
 * API endpoints for resumable chunk-based file uploads
 */

import { Router, Request, Response } from 'express'
import multer from 'multer'
import { ChunkedUploadController } from '../controllers/ChunkedUploadController'
import { ChunkedUploadService } from '../../services/ChunkedUploadService'
import { authMiddleware as authenticateToken } from '../middlewares/auth'
import { Database } from '../../database'
import { redisClient } from '../../cache/redis'
import { config } from '../../config'

const router = Router()

// Initialize services
const uploadService = new ChunkedUploadService(
  redisClient,
  config.TEMP_CHUNK_DIR || './uploads/temp/chunks',
  config.CHUNK_SIZE_MB || 5,
  config.MAX_UPLOAD_SIZE_MB || 5120,
  config.UPLOAD_SESSION_TTL_HOURS || 24,
  config.MAX_CONCURRENT_CHUNKS || 4
)

const database = new Database()
const controller = new ChunkedUploadController(uploadService, database)

// Multer configuration for chunk uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 6 * 1024 * 1024, // 6MB per chunk (slightly larger than 5MB default)
  },
  fileFilter: (req, file, cb) => {
    // Accept chunk uploads from any content type
    cb(null, true)
  },
})

/**
 * POST /api/upload/init
 * Initialize a chunked upload session
 *
 * Request body:
 * {
 *   "fileName": "video.mp4",
 *   "fileSize": 1073741824,
 *   "fileMimeType": "video/mp4",
 *   "fileChecksum": "abc123...",
 *   "metadata": {
 *     "title": "My Video",
 *     "description": "Description",
 *     "platform": "twitter"
 *   }
 * }
 *
 * Response:
 * {
 *   "uploadId": "uuid",
 *   "chunkSize": 5242880,
 *   "totalChunks": 200,
 *   "expiresAt": "2025-12-19T12:00:00Z"
 * }
 */
router.post('/init', authenticateToken, (req: Request, res: Response) =>
  controller.initializeUpload(req, res)
)

/**
 * POST /api/upload/chunk/:uploadId
 * Upload a single chunk
 *
 * Query params:
 * - chunkIndex: number (0-based index)
 * - checksum: string (MD5 hash of chunk)
 *
 * Body: binary chunk data
 *
 * Response:
 * {
 *   "uploadId": "uuid",
 *   "chunkIndex": 0,
 *   "uploadedChunks": 1,
 *   "totalChunks": 200,
 *   "progress": 0.5
 * }
 */
router.post(
  '/chunk/:uploadId',
  authenticateToken,
  upload.single('chunk'),
  (req: Request, res: Response) => controller.uploadChunk(req, res)
)

/**
 * POST /api/upload/complete/:uploadId
 * Complete the upload and assemble chunks
 *
 * Request body:
 * {
 *   "metadata": {
 *     "title": "My Video",
 *     "description": "Description",
 *     "quality": "high",
 *     "platform": "twitter"
 *   }
 * }
 *
 * Response:
 * {
 *   "uploadId": "uuid",
 *   "postId": "uuid",
 *   "videoUrl": "/uploads/videos/...",
 *   "status": "processing",
 *   "processingJobId": "job-id"
 * }
 */
router.post(
  '/complete/:uploadId',
  authenticateToken,
  (req: Request, res: Response) => controller.completeUpload(req, res)
)

/**
 * GET /api/upload/status/:uploadId
 * Get upload status
 *
 * Response:
 * {
 *   "uploadId": "uuid",
 *   "status": "uploading",
 *   "fileName": "video.mp4",
 *   "fileSize": 1073741824,
 *   "uploadedBytes": 536870912,
 *   "uploadedChunks": 100,
 *   "totalChunks": 200,
 *   "progress": 50,
 *   "uploadedAt": "2025-12-18T12:00:00Z",
 *   "expiresAt": "2025-12-19T12:00:00Z"
 * }
 */
router.get('/status/:uploadId', authenticateToken, (req: Request, res: Response) =>
  controller.getUploadStatus(req, res)
)

/**
 * DELETE /api/upload/cancel/:uploadId
 * Cancel an upload and clean up resources
 *
 * Response:
 * {
 *   "message": "Upload cancelled successfully"
 * }
 */
router.delete(
  '/cancel/:uploadId',
  authenticateToken,
  (req: Request, res: Response) => controller.cancelUpload(req, res)
)

export default router
