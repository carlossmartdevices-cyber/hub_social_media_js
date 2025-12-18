/**
 * Upload Storage Utility
 * Manages IndexedDB storage for persistent upload state
 */

import { UploadTask, ChunkInfo } from '../../../src/types/upload.types'

const DB_NAME = 'VideoUploadDB'
const DB_VERSION = 1
const STORE_NAME_UPLOADS = 'uploads'
const STORE_NAME_CHUNKS = 'chunks'
const STORE_NAME_QUEUE = 'queue'

export class UploadStorage {
  private db: IDBDatabase | null = null
  private initPromise: Promise<IDBDatabase> | null = null

  /**
   * Initialize IndexedDB
   */
  async initialize(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db
    }

    if (this.initPromise) {
      return this.initPromise
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'))
      }

      request.onsuccess = () => {
        this.db = request.result
        resolve(this.db)
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create uploads store
        if (!db.objectStoreNames.contains(STORE_NAME_UPLOADS)) {
          const uploadsStore = db.createObjectStore(STORE_NAME_UPLOADS, {
            keyPath: 'uploadId',
          })
          uploadsStore.createIndex('userId', 'userId', { unique: false })
          uploadsStore.createIndex('status', 'status', { unique: false })
          uploadsStore.createIndex('createdAt', 'createdAt', { unique: false })
        }

        // Create chunks store
        if (!db.objectStoreNames.contains(STORE_NAME_CHUNKS)) {
          const chunksStore = db.createObjectStore(STORE_NAME_CHUNKS, {
            keyPath: 'id',
            autoIncrement: true,
          })
          chunksStore.createIndex('uploadId', 'uploadId', { unique: false })
          chunksStore.createIndex('index', 'index', { unique: false })
        }

        // Create queue store
        if (!db.objectStoreNames.contains(STORE_NAME_QUEUE)) {
          db.createObjectStore(STORE_NAME_QUEUE, { keyPath: 'uploadId' })
        }
      }
    })

    return this.initPromise
  }

  /**
   * Save upload metadata
   */
  async saveUpload(upload: Omit<UploadTask, 'chunks'>): Promise<void> {
    const db = await this.initialize()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME_UPLOADS], 'readwrite')
      const store = transaction.objectStore(STORE_NAME_UPLOADS)
      const request = store.put(upload)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  /**
   * Get upload by ID
   */
  async getUpload(uploadId: string): Promise<Omit<UploadTask, 'chunks'> | undefined> {
    const db = await this.initialize()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME_UPLOADS], 'readonly')
      const store = transaction.objectStore(STORE_NAME_UPLOADS)
      const request = store.get(uploadId)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
    })
  }

  /**
   * Get all uploads for a user
   */
  async getUserUploads(userId: string): Promise<Omit<UploadTask, 'chunks'>[]> {
    const db = await this.initialize()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME_UPLOADS], 'readonly')
      const store = transaction.objectStore(STORE_NAME_UPLOADS)
      const index = store.index('userId')
      const request = index.getAll(userId)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
    })
  }

  /**
   * Get all uploads with specific status
   */
  async getUploadsByStatus(
    status: UploadTask['status']
  ): Promise<Omit<UploadTask, 'chunks'>[]> {
    const db = await this.initialize()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME_UPLOADS], 'readonly')
      const store = transaction.objectStore(STORE_NAME_UPLOADS)
      const index = store.index('status')
      const request = index.getAll(status)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
    })
  }

  /**
   * Update upload status
   */
  async updateUploadStatus(
    uploadId: string,
    status: UploadTask['status']
  ): Promise<void> {
    const db = await this.initialize()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME_UPLOADS], 'readwrite')
      const store = transaction.objectStore(STORE_NAME_UPLOADS)

      // First get the upload
      const getRequest = store.get(uploadId)

      getRequest.onsuccess = () => {
        const upload = getRequest.result
        if (upload) {
          upload.status = status
          upload.updatedAt = new Date()

          const putRequest = store.put(upload)
          putRequest.onerror = () => reject(putRequest.error)
          putRequest.onsuccess = () => resolve()
        } else {
          reject(new Error(`Upload not found: ${uploadId}`))
        }
      }

      getRequest.onerror = () => reject(getRequest.error)
    })
  }

  /**
   * Delete upload and associated chunks
   */
  async deleteUpload(uploadId: string): Promise<void> {
    const db = await this.initialize()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        [STORE_NAME_UPLOADS, STORE_NAME_CHUNKS],
        'readwrite'
      )

      // Delete upload
      const uploadsStore = transaction.objectStore(STORE_NAME_UPLOADS)
      uploadsStore.delete(uploadId)

      // Delete associated chunks
      const chunksStore = transaction.objectStore(STORE_NAME_CHUNKS)
      const chunksIndex = chunksStore.index('uploadId')
      const range = IDBKeyRange.only(uploadId)
      chunksIndex.openCursor(range).onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result
        if (cursor) {
          chunksStore.delete(cursor.primaryKey)
          cursor.continue()
        }
      }

      transaction.onerror = () => reject(transaction.error)
      transaction.oncomplete = () => resolve()
    })
  }

  /**
   * Save chunk information
   */
  async saveChunkInfo(uploadId: string, chunkInfo: ChunkInfo): Promise<void> {
    const db = await this.initialize()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME_CHUNKS], 'readwrite')
      const store = transaction.objectStore(STORE_NAME_CHUNKS)
      const request = store.put({ ...chunkInfo, uploadId })

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  /**
   * Get chunks for upload
   */
  async getUploadChunks(uploadId: string): Promise<ChunkInfo[]> {
    const db = await this.initialize()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME_CHUNKS], 'readonly')
      const store = transaction.objectStore(STORE_NAME_CHUNKS)
      const index = store.index('uploadId')
      const request = index.getAll(uploadId)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const chunks = request.result
        chunks.sort((a, b) => a.index - b.index)
        resolve(chunks)
      }
    })
  }

  /**
   * Mark chunk as uploaded
   */
  async markChunkUploaded(uploadId: string, chunkIndex: number): Promise<void> {
    const db = await this.initialize()
    const chunks = await this.getUploadChunks(uploadId)
    const chunk = chunks.find((c) => c.index === chunkIndex)

    if (!chunk) {
      throw new Error(`Chunk not found: ${chunkIndex}`)
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME_CHUNKS], 'readwrite')
      const store = transaction.objectStore(STORE_NAME_CHUNKS)

      chunk.uploaded = true
      chunk.lastAttemptTime = new Date()

      const request = store.put(chunk)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  /**
   * Save upload to queue
   */
  async addToQueue(upload: Omit<UploadTask, 'chunks'>): Promise<void> {
    const db = await this.initialize()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME_QUEUE], 'readwrite')
      const store = transaction.objectStore(STORE_NAME_QUEUE)
      const request = store.put({ ...upload, queuedAt: new Date() })

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  /**
   * Get upload queue
   */
  async getQueue(): Promise<Omit<UploadTask, 'chunks'>[]> {
    const db = await this.initialize()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME_QUEUE], 'readonly')
      const store = transaction.objectStore(STORE_NAME_QUEUE)
      const request = store.getAll()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
    })
  }

  /**
   * Remove from queue
   */
  async removeFromQueue(uploadId: string): Promise<void> {
    const db = await this.initialize()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME_QUEUE], 'readwrite')
      const store = transaction.objectStore(STORE_NAME_QUEUE)
      const request = store.delete(uploadId)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  /**
   * Clear all data (useful for cleanup or testing)
   */
  async clear(): Promise<void> {
    const db = await this.initialize()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        [STORE_NAME_UPLOADS, STORE_NAME_CHUNKS, STORE_NAME_QUEUE],
        'readwrite'
      )

      transaction.objectStore(STORE_NAME_UPLOADS).clear()
      transaction.objectStore(STORE_NAME_CHUNKS).clear()
      transaction.objectStore(STORE_NAME_QUEUE).clear()

      transaction.onerror = () => reject(transaction.error)
      transaction.oncomplete = () => resolve()
    })
  }

  /**
   * Get database size estimate
   */
  async getStorageEstimate(): Promise<{ usage: number; quota: number }> {
    if (!navigator.storage || !navigator.storage.estimate) {
      throw new Error('Storage API not available')
    }

    const estimate = await navigator.storage.estimate()
    return {
      usage: estimate.usage || 0,
      quota: estimate.quota || 0,
    }
  }
}

// Export singleton instance
let uploadStorage: UploadStorage | null = null

export function getUploadStorage(): UploadStorage {
  if (!uploadStorage) {
    uploadStorage = new UploadStorage()
  }
  return uploadStorage
}
