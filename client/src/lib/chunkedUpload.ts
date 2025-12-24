import api from './api';

interface ChunkedUploadOptions {
  onProgress?: (progress: number) => void;
  onError?: (error: string) => void;
  onComplete?: (result: any) => void;
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
        fileType: this.file.type,
        chunkSize: this.chunkSize,
        totalChunks: this.totalChunks,
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
  async getUploadStatus(): Promise<any> {
    try {
      const response = await api.get(`/upload/status/${this.uploadId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get upload status:', error);
      return null;
    }
  }

  /**
   * Upload a single chunk
   */
  private async uploadChunk(chunk: UploadChunk): Promise<void> {
    const formData = new FormData();
    formData.append('chunk', chunk.data);
    formData.append('chunkIndex', String(chunk.index));
    formData.append('totalChunks', String(this.totalChunks));

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
      console.error('Failed to cancel upload:', error);
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
