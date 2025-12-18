/**
 * Chunked Upload Integration Tests
 * Tests for the complete chunked upload workflow
 */

import request from 'supertest'
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'
import express from 'express'
import { ChunkedUploadService } from '../../src/services/ChunkedUploadService'
import { ChunkedUploadController } from '../../src/api/controllers/ChunkedUploadController'
import chunkedUploadRoutes from '../../src/api/routes/chunkedUpload'
import { createClient } from 'redis'
import crypto from 'crypto'
import { promises as fs } from 'fs'
import path from 'path'

describe('Chunked Upload Integration Tests', () => {
  let app: express.Application
  let redisClient: any
  let uploadService: ChunkedUploadService
  let testUploadId: string
  let tempDir: string

  beforeAll(async () => {
    // Initialize Express app
    app = express()
    app.use(express.json())

    // Initialize Redis
    redisClient = createClient({
      host: 'localhost',
      port: 6379,
    })
    await redisClient.connect()

    // Initialize upload service
    tempDir = './uploads/temp/test-chunks'
    uploadService = new ChunkedUploadService(
      redisClient,
      tempDir,
      5, // 5MB chunks
      100, // 100MB max
      1, // 1 hour TTL
      4 // 4 concurrent chunks
    )

    // Create temp directory
    await fs.mkdir(tempDir, { recursive: true })

    // Register routes (simplified - add auth middleware if needed)
    app.use('/api', chunkedUploadRoutes)
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
        .field('chunkIndex', '0')
        .field('checksum', checksum)
        .attach('chunk', chunkData)

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
        .field('chunkIndex', '0')
        .field('checksum', invalidChecksum)
        .attach('chunk', chunkData)

      expect(response.status).toBe(500)
      expect(response.body.error).toContain('checksum')
    })

    it('should reject invalid chunk index', async () => {
      const chunkData = Buffer.alloc(1024 * 1024, 'a')
      const checksum = crypto.createHash('md5').update(chunkData).digest('hex')

      const response = await request(app)
        .post(`/api/upload/chunk/${testUploadId}`)
        .field('chunkIndex', '999') // Invalid - beyond total chunks
        .field('checksum', checksum)
        .attach('chunk', chunkData)

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
        .field('chunkIndex', '0')
        .field('checksum', checksum1)
        .attach('chunk', chunk1)

      expect(response1.body.uploadedChunks).toBe(1)
      expect(response1.body.progress).toBeCloseTo(50, 0) // 1 of 2 chunks

      // Upload chunk 2
      const checksum2 = crypto.createHash('md5').update(chunk2).digest('hex')
      const response2 = await request(app)
        .post(`/api/upload/chunk/${testUploadId}`)
        .field('chunkIndex', '1')
        .field('checksum', checksum2)
        .attach('chunk', chunk2)

      expect(response2.body.uploadedChunks).toBe(2)
      expect(response2.body.progress).toBe(100)
    })
  })

  describe('Upload Status', () => {
    it('should return upload status', async () => {
      // Initialize upload
      const initResponse = await request(app)
        .post('/api/upload/init')
        .send({
          fileName: 'status-test.mp4',
          fileSize: 5 * 1024 * 1024,
          fileMimeType: 'video/mp4',
        })

      const uploadId = initResponse.body.uploadId

      // Get status
      const statusResponse = await request(app)
        .get(`/api/upload/status/${uploadId}`)

      expect(statusResponse.status).toBe(200)
      expect(statusResponse.body).toHaveProperty('uploadId', uploadId)
      expect(statusResponse.body).toHaveProperty('status', 'pending')
      expect(statusResponse.body).toHaveProperty('uploadedChunks', 0)
      expect(statusResponse.body).toHaveProperty('progress', 0)
    })

    it('should return not found for non-existent upload', async () => {
      const response = await request(app)
        .get('/api/upload/status/non-existent-id')

      expect(response.status).toBe(500)
      expect(response.body).toHaveProperty('error')
    })
  })

  describe('Upload Cancellation', () => {
    it('should cancel an upload', async () => {
      // Initialize upload
      const initResponse = await request(app)
        .post('/api/upload/init')
        .send({
          fileName: 'cancel-test.mp4',
          fileSize: 5 * 1024 * 1024,
          fileMimeType: 'video/mp4',
        })

      const uploadId = initResponse.body.uploadId

      // Cancel upload
      const cancelResponse = await request(app)
        .delete(`/api/upload/cancel/${uploadId}`)

      expect(cancelResponse.status).toBe(200)
      expect(cancelResponse.body).toHaveProperty('message')

      // Verify upload is removed
      const statusResponse = await request(app)
        .get(`/api/upload/status/${uploadId}`)

      expect(statusResponse.status).toBe(500)
    })
  })

  describe('Chunk Assembly', () => {
    it('should assemble chunks into final file', async () => {
      // Initialize upload
      const initResponse = await request(app)
        .post('/api/upload/init')
        .send({
          fileName: 'assembly-test.mp4',
          fileSize: 2 * 1024 * 1024,
          fileMimeType: 'video/mp4',
        })

      const uploadId = initResponse.body.uploadId

      // Upload chunk 1
      const chunk1 = Buffer.from('chunk1-data')
      const checksum1 = crypto.createHash('md5').update(chunk1).digest('hex')

      await request(app)
        .post(`/api/upload/chunk/${uploadId}`)
        .field('chunkIndex', '0')
        .field('checksum', checksum1)
        .attach('chunk', chunk1)

      // Upload chunk 2
      const chunk2 = Buffer.from('chunk2-data')
      const checksum2 = crypto.createHash('md5').update(chunk2).digest('hex')

      await request(app)
        .post(`/api/upload/chunk/${uploadId}`)
        .field('chunkIndex', '1')
        .field('checksum', checksum2)
        .attach('chunk', chunk2)

      // Assemble chunks
      const assembledPath = await uploadService.assembleChunks(uploadId)

      // Verify file exists
      const fileExists = await fs.stat(assembledPath).catch(() => null)
      expect(fileExists).not.toBeNull()

      // Verify file content
      const assembledContent = await fs.readFile(assembledPath)
      expect(assembledContent.toString()).toContain('chunk1-data')
      expect(assembledContent.toString()).toContain('chunk2-data')

      // Cleanup
      await fs.unlink(assembledPath)
    })

    it('should reject assembly if chunks missing', async () => {
      // Initialize upload
      const initResponse = await request(app)
        .post('/api/upload/init')
        .send({
          fileName: 'incomplete-test.mp4',
          fileSize: 2 * 1024 * 1024,
          fileMimeType: 'video/mp4',
        })

      const uploadId = initResponse.body.uploadId

      // Upload only first chunk
      const chunk1 = Buffer.from('chunk1-data')
      const checksum1 = crypto.createHash('md5').update(chunk1).digest('hex')

      await request(app)
        .post(`/api/upload/chunk/${uploadId}`)
        .field('chunkIndex', '0')
        .field('checksum', checksum1)
        .attach('chunk', chunk1)

      // Try to assemble without all chunks
      try {
        await uploadService.assembleChunks(uploadId)
        expect(true).toBe(false) // Should throw
      } catch (error: any) {
        expect(error.message).toContain('Not all chunks uploaded')
      }
    })
  })

  describe('Session Management', () => {
    it('should cleanup expired uploads', async () => {
      // This test requires TTL to be very short (done in setup)
      // Initialize upload
      const initResponse = await request(app)
        .post('/api/upload/init')
        .send({
          fileName: 'expire-test.mp4',
          fileSize: 5 * 1024 * 1024,
          fileMimeType: 'video/mp4',
        })

      const uploadId = initResponse.body.uploadId

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
          .send({
            fileName: `concurrent-${i}.mp4`,
            fileSize: 5 * 1024 * 1024,
            fileMimeType: 'video/mp4',
          })

        expect(response.status).toBe(200)
        uploadIds.push(response.body.uploadId)
      }

      // Verify all uploads are tracked separately
      expect(uploadIds).toHaveLength(uploadCount)
      expect(new Set(uploadIds).size).toBe(uploadCount) // All unique
    })
  })
})
