/**
 * Chunked Upload Routes
 * API endpoints for resumable chunk-based file uploads
 */

import { Router, Response, NextFunction } from 'express'
import multer from 'multer'
import { AuthRequest, authMiddleware } from '../middlewares/auth'
import { ChunkedUploadController } from '../controllers/ChunkedUploadController'
import { ChunkedUploadService } from '../../services/ChunkedUploadService'
import { config } from '../../config'
import cacheService from '../../services/CacheService'
import { logger } from '../../utils/logger'

const router = Router()

// Initialize cache service and then upload service
let uploadService: ChunkedUploadService
let controller: ChunkedUploadController

// Redis adapter interface to match ChunkedUploadService requirements
interface RedisClient {
  get(key: string): Promise<string | null>
  set(key: string, value: string, options?: any): Promise<any>
  del(key: string): Promise<number>
  expire(key: string, seconds: number): Promise<number>
  sadd(key: string, member: string): Promise<number>
  smembers(key: string): Promise<string[]>
  scard(key: string): Promise<number>
  srem(key: string, member: string): Promise<number>
}

async function initializeServices() {
  try {
    // Connect to Redis cache service
    await cacheService.connect()

    // Create Redis adapter from cache service
    const redisAdapter: RedisClient = {
      get: async (key: string): Promise<string | null> => {
        const result = await cacheService.get<string>(key);
        return result || null;
      },
      set: async (key: string, value: string, options?: any): Promise<any> => {
        const ttl = options?.EX || 3600
        return cacheService.set(key, value, ttl)
      },
      del: async (key: string): Promise<number> => {
        await cacheService.del(key);
        return 1;
      },
      expire: async (key: string, seconds: number): Promise<number> => {
        await cacheService.expire(key, seconds);
        return 1;
      },
      sadd: async (key: string, member: string): Promise<number> => {
        // For set operations, we'll use a simple implementation
        const current = await cacheService.get<string[]>(key) || []
        if (!current.includes(member)) {
          current.push(member)
          await cacheService.set(key, current, 3600)
          return 1
        }
        return 0
      },
      smembers: async (key: string): Promise<string[]> => {
        const result = await cacheService.get<string[]>(key);
        return result || [];
      },
      scard: async (key: string): Promise<number> => {
        const members = await cacheService.get<string[]>(key) || []
        return members.length
      },
      srem: async (key: string, member: string): Promise<number> => {
        const current = await cacheService.get<string[]>(key) || []
        const filtered = current.filter((item) => item !== member)
        if (filtered.length === 0) {
          await cacheService.del(key)
        } else {
          await cacheService.set(key, filtered, 3600)
        }
        return current.length - filtered.length
      },
    }

    uploadService = new ChunkedUploadService(
      redisAdapter,
      config.upload.tempChunkDir,
      config.upload.chunkSizeMb,
      config.upload.maxUploadSizeMb,
      config.upload.sessionTtlHours,
      config.upload.maxConcurrentChunks
    )

    controller = new ChunkedUploadController(uploadService)
  } catch (error) {
    logger.error('Failed to initialize chunked upload services:', error)
    throw error
  }
}

// Initialize services on module load
initializeServices().catch(error => {
  logger.error('Error during chunked upload service initialization:', error)
})

const chunkSizeBytes = config.upload.chunkSizeMb * 1024 * 1024
const chunkLimitBytes = Math.ceil(chunkSizeBytes * 1.1) // Allow small overhead above configured chunk size

// Multer configuration for chunk uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: chunkLimitBytes,
  },
  fileFilter: (_req, _file, cb) => {
    // Accept chunk uploads from any content type
    cb(null, true)
  },
})

// Middleware to ensure services are initialized
const ensureServicesInitialized = (_req: AuthRequest, res: Response, next: NextFunction) => {
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
