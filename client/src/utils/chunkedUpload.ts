/**
 * Chunked Upload Utility
 * Handles large file uploads with chunking and resumable capability
 */

import api from '../lib/api';

export interface ChunkUploadOptions {
  chunkSize?: number; // Size in bytes (default: 5MB)
  onProgress?: (progress: UploadProgress) => void;
  onChunkComplete?: (chunkIndex: number, totalChunks: number) => void;
  maxRetries?: number;
}

export interface UploadProgress {
  percent: number;
  uploadedBytes: number;
  totalBytes: number;
  speed: number; // bytes per second
  remainingTime: number; // seconds
}

export interface ChunkedUploadResult {
  success: boolean;
  fileId?: string;
  error?: string;
}

const DEFAULT_CHUNK_SIZE = 5 * 1024 * 1024; // 5MB
const DEFAULT_MAX_RETRIES = 3;

/**
 * Upload a file in chunks with progress tracking
 */
export async function uploadFileInChunks(
  file: File,
  endpoint: string,
  options: ChunkUploadOptions = {}
): Promise<ChunkedUploadResult> {
  const {
    chunkSize = DEFAULT_CHUNK_SIZE,
    onProgress,
    onChunkComplete,
    maxRetries = DEFAULT_MAX_RETRIES,
  } = options;

  const totalSize = file.size;
  const totalChunks = Math.ceil(totalSize / chunkSize);
  const uploadId = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  let uploadedBytes = 0;
  const startTime = Date.now();

  try {
    // Initialize chunked upload
    const initResponse = await api.post(`${endpoint}/init`, {
      fileName: file.name,
      fileSize: totalSize,
      fileType: file.type,
      totalChunks,
      uploadId,
    });

    const { uploadToken } = initResponse.data;

    // Upload each chunk
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * chunkSize;
      const end = Math.min(start + chunkSize, totalSize);
      const chunk = file.slice(start, end);

      let retries = 0;
      let uploaded = false;

      while (!uploaded && retries < maxRetries) {
        try {
          const formData = new FormData();
          formData.append('chunk', chunk);
          formData.append('chunkIndex', chunkIndex.toString());
          formData.append('uploadId', uploadId);
          formData.append('uploadToken', uploadToken);

          await api.post(`${endpoint}/chunk`, formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });

          uploaded = true;
          uploadedBytes += chunk.size;

          // Calculate progress
          const percent = Math.round((uploadedBytes / totalSize) * 100);
          const elapsedTime = (Date.now() - startTime) / 1000; // seconds
          const speed = uploadedBytes / elapsedTime;
          const remainingBytes = totalSize - uploadedBytes;
          const remainingTime = Math.round(remainingBytes / speed);

          onProgress?.({
            percent,
            uploadedBytes,
            totalBytes: totalSize,
            speed,
            remainingTime,
          });

          onChunkComplete?.(chunkIndex, totalChunks);
        } catch (error) {
          retries++;
          if (retries >= maxRetries) {
            throw new Error(`Failed to upload chunk ${chunkIndex} after ${maxRetries} retries`);
          }
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 1000));
        }
      }
    }

    // Complete the upload
    const completeResponse = await api.post(`${endpoint}/complete`, {
      uploadId,
      uploadToken,
    });

    return {
      success: true,
      fileId: completeResponse.data.fileId,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Upload failed',
    };
  }
}

/**
 * Upload file with automatic chunking decision
 * Uses chunked upload for large files, normal upload for small files
 */
export async function smartUpload(
  file: File,
  endpoint: string,
  options: ChunkUploadOptions = {}
): Promise<ChunkedUploadResult> {
  const CHUNKED_THRESHOLD = 10 * 1024 * 1024; // 10MB

  if (file.size > CHUNKED_THRESHOLD) {
    // Use chunked upload for large files
    return uploadFileInChunks(file, endpoint, options);
  } else {
    // Use normal upload for small files
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            options.onProgress?.({
              percent,
              uploadedBytes: progressEvent.loaded,
              totalBytes: progressEvent.total,
              speed: 0,
              remainingTime: 0,
            });
          }
        },
      });

      return {
        success: true,
        fileId: response.data.id || response.data.fileId,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Upload failed',
      };
    }
  }
}

/**
 * Format upload speed for display
 */
export function formatSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond < 1024) {
    return `${Math.round(bytesPerSecond)} B/s`;
  } else if (bytesPerSecond < 1024 * 1024) {
    return `${Math.round(bytesPerSecond / 1024)} KB/s`;
  } else {
    return `${(bytesPerSecond / (1024 * 1024)).toFixed(2)} MB/s`;
  }
}

/**
 * Format remaining time for display
 */
export function formatRemainingTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
}
