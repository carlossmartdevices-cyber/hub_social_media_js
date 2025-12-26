/**
 * Chunked Upload Routes
 * API endpoints for resumable chunk-based file uploads
 */

import { Router, Response } from 'express'
import multer from 'multer'
import { AuthRequest, authMiddleware } from '../middlewares/auth'
import { ChunkedUploadController } from '../controllers/ChunkedUploadController'
import { ChunkedUploadService } from '../../services/ChunkedUploadService'
<<<<<<< HEAD
=======
import { authMiddleware as authenticateToken } from '../middlewares/auth'
import { Database } from '../../database'
import { redisClient } from '../../cache/redis'
>>>>>>> ebee11fc3699faae17b8c6e0b477937d7a6d844e
import { config } from '../../config'
import cacheService from '../../services/CacheService'

const router = Router()

// Initialize cache service and then upload service
let uploadService: ChunkedUploadService
let controller: ChunkedUploadController

async function initializeServices() {
  try {
    // Connect to Redis cache service
    await cacheService.connect()

    // Create Redis adapter from cache service
    const redisAdapter = {
      get: (key: string) => cacheService.get(key),
      set: (key: string, value: string, options?: any) => {
        const ttl = options?.EX || 3600
        return cacheService.set(key, value, ttl)
      },
      del: (key: string) => cacheService.del(key),
      expire: (key: string, seconds: number) => cacheService.expire(key, seconds),
      sadd: async (key: string, member: string) => {
        // For set operations, we'll use a simple implementation
        const current = await cacheService.get<string[]>(key) || []
        if (!current.includes(member)) {
          current.push(member)
          await cacheService.set(key, current, 3600)
          return 1
        }
        return 0
      },
      smembers: (key: string) => cacheService.get<string[]>(key) || Promise.resolve([]),
      scard: async (key: string) => {
        const members = await cacheService.get<string[]>(key) || []
        return members.length
      }
    }

    uploadService = new ChunkedUploadService(
      redisAdapter as any,
      config.upload.tempChunkDir,
      config.upload.chunkSizeMb,
      config.upload.maxUploadSizeMb,
      config.upload.sessionTtlHours,
      config.upload.maxConcurrentChunks
    )

    controller = new ChunkedUploadController(uploadService)
  } catch (error) {
    console.error('Failed to initialize chunked upload services:', error)
    throw error
  }
}

// Initialize services on module load
initializeServices().catch(error => {
  console.error('Error during chunked upload service initialization:', error)
})

// Multer configuration for chunk uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 6 * 1024 * 1024, // 6MB per chunk (slightly larger than 5MB default)
  },
  fileFilter: (_req, _file, cb) => {
    // Accept chunk uploads from any content type
    cb(null, true)
  },
})

// Middleware to ensure services are initialized
const ensureServicesInitialized = (_req: AuthRequest, res: Response, next: any) => {
  if (!uploadService || !controller) {
    res.status(503).json({
      error: 'Upload service is not ready. Please try again in a moment.'
    })
    return
  }
  next()
}

// Apply middleware to all routes
router.use(ensureServicesInitialized)

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
router.post('/init', authMiddleware, (req: AuthRequest, res: Response) =>
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
  authMiddleware,
  upload.single('chunk'),
  (req: AuthRequest, res: Response) => controller.uploadChunk(req, res)
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
  authMiddleware,
  (req: AuthRequest, res: Response) => controller.completeUpload(req, res)
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
router.get('/status/:uploadId', authMiddleware, (req: AuthRequest, res: Response) =>
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
  authMiddleware,
  (req: AuthRequest, res: Response) => controller.cancelUpload(req, res)
)

export default router
