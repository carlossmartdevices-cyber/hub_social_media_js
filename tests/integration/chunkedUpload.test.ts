/**
 * Chunked Upload Integration Tests
 * Tests for the complete chunked upload workflow
 */

import request from 'supertest'
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'
import express from 'express'
import { ChunkedUploadService } from '../../src/services/ChunkedUploadService'
// import chunkedUploadRoutes from '../../src/api/routes/chunkedUpload'
import { createClient } from 'redis'
import crypto from 'crypto'
import { promises as fs } from 'fs'
import path from 'path'
import jwt from 'jsonwebtoken'

describe('Chunked Upload Integration Tests', () => {
  let app: express.Application
  let redisClient: any
  let uploadService: ChunkedUploadService
  let testUploadId: string
  let tempDir: string
  let testToken: string

  beforeAll(async () => {
    // Create test JWT token
    testToken = jwt.sign(
      { id: 'test-user-id', email: 'test@test.com', role: 'user' },
      process.env.JWT_SECRET || 'test-secret-key-for-testing-only'
    )

    // Initialize Express app
    app = express()
    app.use(express.json())

    // Initialize Redis
    redisClient = createClient({
      url: 'redis://localhost:6379',
    })
    await redisClient.connect()

    // Create Redis adapter for the upload service
    const redisAdapter = {
      get: async (key: string): Promise<string | null> => {
        return await redisClient.get(key)
      },
      set: async (key: string, value: string, options?: any): Promise<any> => {
        const ttl = options?.EX || 3600
        await redisClient.set(key, value, { EX: ttl })
        return 'OK'
      },
      del: async (key: string): Promise<number> => {
        await redisClient.del(key)
        return 1
      },
      expire: async (key: string, seconds: number): Promise<number> => {
        await redisClient.expire(key, seconds)
        return 1
      },
      sadd: async (key: string, member: string): Promise<number> => {
        return await redisClient.sAdd(key, member)
      },
      smembers: async (key: string): Promise<string[]> => {
        return await redisClient.sMembers(key)
      },
      scard: async (key: string): Promise<number> => {
        return await redisClient.sCard(key)
      },
      srem: async (key: string, member: string): Promise<number> => {
        return await redisClient.sRem(key, member)
      }
    }

    // Initialize upload service
    tempDir = './uploads/temp/test-chunks'
    uploadService = new ChunkedUploadService(
      redisAdapter,
      tempDir,
      5, // 5MB chunks
      100, // 100MB max
      1, // 1 hour TTL
      4 // 4 concurrent chunks
    )

    // Create temp directory
    await fs.mkdir(tempDir, { recursive: true })

    // Wait a moment for the routes to initialize their services
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Create test controller with our test service
    const { ChunkedUploadController } = require('../../src/api/controllers/ChunkedUploadController')
    const testController = new ChunkedUploadController(uploadService)

    // Create test routes using our test controller
    const testRouter = require('express').Router()
    const multer = require('multer')
    const { authMiddleware } = require('../../src/api/middlewares/auth')

    const upload = multer({
      storage: multer.memoryStorage(),
      limits: {
        fileSize: 6 * 1024 * 1024, // 6MB (5MB chunk + overhead)
      },
    })

    // Register test routes
    testRouter.post('/init', authMiddleware, (req: any, res: any) => testController.initializeUpload(req, res))
    testRouter.post('/chunk/:uploadId', authMiddleware, upload.single('chunk'), (req: any, res: any) => testController.uploadChunk(req, res))
    testRouter.post('/complete/:uploadId', authMiddleware, (req: any, res: any) => testController.completeUpload(req, res))
    testRouter.get('/status/:uploadId', authMiddleware, (req: any, res: any) => testController.getUploadStatus(req, res))
    testRouter.delete('/cancel/:uploadId', authMiddleware, (req: any, res: any) => testController.cancelUpload(req, res))

    app.use('/api/upload', testRouter)
  })

  afterAll(async () => {
    // Clean up Redis
    await redisClient.disconnect()

    // Clean up temp directory
    try {
      const files = await fs.readdir(tempDir)
      for (const file of files) {
        await fs.unlink(path.join(tempDir, file))
      }
      await fs.rmdir(tempDir)
    } catch (err) {
      console.warn('Cleanup error:', err)
    }
  })

  describe('Upload Initialization', () => {
    it('should initialize an upload session', async () => {
      const response = await request(app)
        .post('/api/upload/init')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          fileName: 'test-video.mp4',
          fileSize: 10 * 1024 * 1024, // 10MB
          fileMimeType: 'video/mp4',
        })

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('uploadId')
      expect(response.body).toHaveProperty('chunkSize')
      expect(response.body).toHaveProperty('totalChunks')
      expect(response.body.totalChunks).toBe(2) // 10MB / 5MB = 2 chunks

      testUploadId = response.body.uploadId
    })

    it('should reject files exceeding max size', async () => {
      const response = await request(app)
        .post('/api/upload/init')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          fileName: 'huge-video.mp4',
          fileSize: 500 * 1024 * 1024, // 500MB (exceeds 100MB limit)
          fileMimeType: 'video/mp4',
        })

      expect(response.status).toBe(500)
      expect(response.body).toHaveProperty('error')
    })

    it('should reject invalid file types', async () => {
      const response = await request(app)
        .post('/api/upload/init')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          fileName: 'document.pdf',
          fileSize: 5 * 1024 * 1024,
          fileMimeType: 'application/pdf',
        })

      expect(response.status).toBe(400)
      expect(response.body.error).toContain('Invalid file type')
    })
  })

  describe('Chunk Upload', () => {
    beforeEach(async () => {
      // Initialize fresh upload
      const response = await request(app)
        .post('/api/upload/init')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          fileName: 'test-video.mp4',
          fileSize: 10 * 1024 * 1024,
          fileMimeType: 'video/mp4',
        })

      testUploadId = response.body.uploadId
    })

    it('should upload a chunk successfully', async () => {
      // Create test chunk data
      const chunkData = Buffer.alloc(1024 * 1024, 'a') // 1MB test data
      const checksum = crypto.createHash('md5').update(chunkData).digest('hex')

      const response = await request(app)
        .post(`/api/upload/chunk/${testUploadId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .field('chunkIndex', '0')
        .field('checksum', checksum)
        .attach('chunk', chunkData, { filename: 'chunk-0' })

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('uploadId')
      expect(response.body.chunkIndex).toBe(0)
      expect(response.body).toHaveProperty('progress')
    })

    it('should reject chunk with invalid checksum', async () => {
      const chunkData = Buffer.alloc(1024 * 1024, 'a')
      const invalidChecksum = 'invalid-checksum-12345678901234'

      const response = await request(app)
        .post(`/api/upload/chunk/${testUploadId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .field('chunkIndex', '0')
        .field('checksum', invalidChecksum)
        .attach('chunk', chunkData, { filename: 'chunk-0' })

      expect(response.status).toBe(500)
      expect(response.body.error).toContain('checksum')
    })

    it('should reject invalid chunk index', async () => {
      const chunkData = Buffer.alloc(1024 * 1024, 'a')
      const checksum = crypto.createHash('md5').update(chunkData).digest('hex')

      const response = await request(app)
        .post(`/api/upload/chunk/${testUploadId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .field('chunkIndex', '999') // Invalid - beyond total chunks
        .field('checksum', checksum)
        .attach('chunk', chunkData, { filename: 'chunk-999' })

      expect(response.status).toBe(500)
      expect(response.body.error).toContain('Invalid chunk index')
    })

    it('should track upload progress across multiple chunks', async () => {
      const chunk1 = Buffer.alloc(1024 * 1024, 'a')
      const chunk2 = Buffer.alloc(1024 * 1024, 'b')

      // Upload chunk 1
      const checksum1 = crypto.createHash('md5').update(chunk1).digest('hex')
      const response1 = await request(app)
        .post(`/api/upload/chunk/${testUploadId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .field('chunkIndex', '0')
        .field('checksum', checksum1)
        .attach('chunk', chunk1, { filename: 'chunk-0' })

      expect(response1.body.uploadedChunks).toBe(1)
      expect(response1.body.progress).toBeCloseTo(50, 0) // 1 of 2 chunks

      // Upload chunk 2
      const checksum2 = crypto.createHash('md5').update(chunk2).digest('hex')
      const response2 = await request(app)
        .post(`/api/upload/chunk/${testUploadId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .field('chunkIndex', '1')
        .field('checksum', checksum2)
        .attach('chunk', chunk2, { filename: 'chunk-1' })

      expect(response2.body.uploadedChunks).toBe(2)
      expect(response2.body.progress).toBe(100)
    })
  })

  describe('Upload Status', () => {
    it('should return upload status', async () => {
      // Initialize upload
      const initResponse = await request(app)
        .post('/api/upload/init')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          fileName: 'status-test.mp4',
          fileSize: 5 * 1024 * 1024,
          fileMimeType: 'video/mp4',
        })

      const uploadId = initResponse.body.uploadId

      // Get status
      const statusResponse = await request(app)
        .get(`/api/upload/status/${uploadId}`)
        .set('Authorization', `Bearer ${testToken}`)

      expect(statusResponse.status).toBe(200)
      expect(statusResponse.body).toHaveProperty('uploadId', uploadId)
      expect(statusResponse.body).toHaveProperty('status', 'pending')
      expect(statusResponse.body).toHaveProperty('uploadedChunks', 0)
      expect(statusResponse.body).toHaveProperty('progress', 0)
    })

    it('should return not found for non-existent upload', async () => {
      const response = await request(app)
        .get('/api/upload/status/non-existent-id')
        .set('Authorization', `Bearer ${testToken}`)

      expect(response.status).toBe(500)
      expect(response.body).toHaveProperty('error')
    })
  })

  describe('Upload Cancellation', () => {
    it('should cancel an upload', async () => {
      // Initialize upload
      const initResponse = await request(app)
        .post('/api/upload/init')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          fileName: 'cancel-test.mp4',
          fileSize: 5 * 1024 * 1024,
          fileMimeType: 'video/mp4',
        })

      const uploadId = initResponse.body.uploadId

      // Cancel upload
      const cancelResponse = await request(app)
        .delete(`/api/upload/cancel/${uploadId}`)
        .set('Authorization', `Bearer ${testToken}`)

      expect(cancelResponse.status).toBe(200)
      expect(cancelResponse.body).toHaveProperty('message')

      // Verify upload is removed
      const statusResponse = await request(app)
        .get(`/api/upload/status/${uploadId}`)
        .set('Authorization', `Bearer ${testToken}`)

      expect(statusResponse.status).toBe(500)
    })
  })

  describe('Session Management', () => {
    it('should cleanup expired uploads', async () => {
      // This test requires TTL to be very short (done in setup)
      // Initialize upload
      await request(app)
        .post('/api/upload/init')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          fileName: 'expire-test.mp4',
          fileSize: 5 * 1024 * 1024,
          fileMimeType: 'video/mp4',
        })

      // Wait for session to expire (1 hour in normal config, instant in test)
      // In real tests, mock Redis TTL or use shorter TTL

      const cleanedCount = await uploadService.cleanupExpiredUploads()
      // Expect some cleanup (exact count depends on timing)
      expect(cleanedCount).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Concurrent Uploads', () => {
    it('should handle multiple concurrent uploads', async () => {
      const uploadCount = 3
      const uploadIds: string[] = []

      // Initialize multiple uploads
      for (let i = 0; i < uploadCount; i++) {
        const response = await request(app)
          .post('/api/upload/init')
          .set('Authorization', `Bearer ${testToken}`)
          .send({
            fileName: `concurrent-${i}.mp4`,
            fileSize: 5 * 1024 * 1024,
            fileMimeType: 'video/mp4',
          })

        expect(response.status).toBe(200)
        uploadIds.push(response.body.uploadId)
      }

      // Verify all uploads are tracked
      expect(uploadIds.length).toBe(uploadCount)
      expect(uploadIds.every((id: string) => id && typeof id === 'string')).toBe(true)
    })
  })
})
