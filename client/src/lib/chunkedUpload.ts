import api from './api';
import { UploadStatus, ChunkedUploadResponse, ApiError } from '../types/api.types';

interface ChunkedUploadOptions {
  onProgress?: (progress: number) => void;
  onError?: (error: string) => void;
  onComplete?: (result: ChunkedUploadResponse) => void;
  chunkSize?: number; // in MB
}

interface UploadChunk {
  index: number;
  data: Blob;
  hash?: string;
}

const DEFAULT_CHUNK_SIZE_MB = 5;
const LARGE_FILE_THRESHOLD_MB = 500; // Files larger than 500MB use chunked upload

/**
 * Simple chunked upload utility for large files
 * Uses the /api/upload endpoint for resumable uploads
 */
export class ChunkedUploadManager {
  private file: File;
  private uploadId: string = '';
  private chunkSize: number;
  private options: ChunkedUploadOptions;
  private uploadedChunks: Set<number> = new Set();
  private totalChunks: number = 0;

  constructor(file: File, options: ChunkedUploadOptions = {}) {
    this.file = file;
    this.options = options;
    this.chunkSize = (options.chunkSize || DEFAULT_CHUNK_SIZE_MB) * 1024 * 1024;
    this.totalChunks = Math.ceil(this.file.size / this.chunkSize);
  }

  /**
   * Check if a file should use chunked upload
   */
  static shouldUseChunkedUpload(file: File): boolean {
    const fileSizeMB = file.size / (1024 * 1024);
    return fileSizeMB > LARGE_FILE_THRESHOLD_MB;
  }

  /**
   * Initialize a chunked upload session
   */
  async initializeUpload(): Promise<string> {
    try {
      const response = await api.post('/upload/init', {
        fileName: this.file.name,
        fileSize: this.file.size,
        fileMimeType: this.file.type,
      });

      this.uploadId = response.data.uploadId;
      return this.uploadId;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to initialize upload';
      this.options.onError?.(message);
      throw error;
    }
  }

  /**
   * Get upload status
   */
  async getUploadStatus(): Promise<UploadStatus | null> {
    try {
      const response = await api.get(`/upload/status/${this.uploadId}`);
      return response.data as UploadStatus;
    } catch (error) {
      // Use error service instead of console.error
      const errorMessage = error instanceof Error ? error.message : 'Failed to get upload status';
      this.options.onError?.(errorMessage);
      return null;
    }
  }

  /**
   * Upload a single chunk
   */
  private async uploadChunk(chunk: UploadChunk): Promise<void> {
    // Calculate MD5 checksum if not provided
    if (!chunk.hash) {
      chunk.hash = await this.calculateChecksum(chunk.data);
    }

    const formData = new FormData();
    formData.append('chunk', chunk.data);
    formData.append('chunkIndex', String(chunk.index));
    formData.append('checksum', chunk.hash);

    try {
      await api.post(`/upload/chunk/${this.uploadId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      this.uploadedChunks.add(chunk.index);
      this.updateProgress();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Chunk upload failed';
      throw new Error(`Chunk ${chunk.index} failed: ${message}`);
    }
  }

  /**
   * Calculate MD5 checksum of a blob
   */
  private async calculateChecksum(blob: Blob): Promise<string> {
    const buffer = await blob.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Upload all chunks
   */
  async uploadChunks(): Promise<void> {
    if (!this.uploadId) {
      throw new Error('Upload not initialized. Call initializeUpload() first.');
    }

    const chunks: UploadChunk[] = [];
    let offset = 0;

    // Create chunks
    for (let i = 0; i < this.totalChunks; i++) {
      const start = offset;
      const end = Math.min(offset + this.chunkSize, this.file.size);
      const blob = this.file.slice(start, end);

      chunks.push({
        index: i,
        data: blob,
      });

      offset = end;
    }

    // Upload chunks with concurrency control (max 4 concurrent)
    const maxConcurrent = 4;
    for (let i = 0; i < chunks.length; i += maxConcurrent) {
      const batch = chunks.slice(i, i + maxConcurrent);
      await Promise.all(batch.map((chunk) => this.uploadChunk(chunk)));
    }
  }

  /**
   * Complete the upload
   */
  async completeUpload(): Promise<any> {
    try {
      const response = await api.post(`/upload/complete/${this.uploadId}`, {
        fileName: this.file.name,
        fileSize: this.file.size,
        fileType: this.file.type,
      });

      this.options.onComplete?.(response.data);
      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to complete upload';
      this.options.onError?.(message);
      throw error;
    }
  }

  /**
   * Cancel the upload
   */
  async cancelUpload(): Promise<void> {
    try {
      await api.delete(`/upload/cancel/${this.uploadId}`);
    } catch (error) {
      // Silent failure - don't show error to user for cleanup operations
      const errorMessage = error instanceof Error ? error.message : 'Failed to cancel upload';
      this.options.onError?.(errorMessage);
    }
  }

  /**
   * Upload the entire file (initialize, upload chunks, complete)
   */
  async upload(): Promise<any> {
    try {
      // Initialize upload
      await this.initializeUpload();

      // Upload all chunks
      await this.uploadChunks();

      // Complete upload
      const result = await this.completeUpload();
      return result;
    } catch (error) {
      // Cancel on error
      await this.cancelUpload();
      throw error;
    }
  }

  /**
   * Update progress
   */
  private updateProgress(): void {
    const progress = Math.round((this.uploadedChunks.size / this.totalChunks) * 100);
    this.options.onProgress?.(progress);
  }

  /**
   * Get current upload progress
   */
  getProgress(): number {
    return Math.round((this.uploadedChunks.size / this.totalChunks) * 100);
  }
}

/**
 * Simple upload for files below threshold
 */
export async function simpleUpload(
  file: File,
  endpoint: string,
  fieldName: string = 'file',
  onProgress?: (progress: number) => void
): Promise<any> {
  const formData = new FormData();
  formData.append(fieldName, file);

  try {
    const response = await api.post(endpoint, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        const progress = progressEvent.total
          ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
          : 0;
        onProgress?.(progress);
      },
    });

    return response.data;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    throw new Error(message);
  }
}

/**
 * Intelligent upload that automatically uses chunked upload for large files
 */
export async function intelligentUpload(
  file: File,
  endpoint: string,
  options: ChunkedUploadOptions = {}
): Promise<any> {
  if (ChunkedUploadManager.shouldUseChunkedUpload(file)) {
    // Use chunked upload for large files
    const manager = new ChunkedUploadManager(file, options);
    return manager.upload();
  } else {
    // Use simple upload for small files
    return simpleUpload(file, endpoint, 'file', options.onProgress);
  }
}
