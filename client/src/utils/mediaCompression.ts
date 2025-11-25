/**
 * Media Compression Utility
 * Handles client-side compression of images and videos before upload
 */

export interface CompressionOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  quality?: number;
  fileType?: string;
}

export interface CompressionProgress {
  percent: number;
  stage: 'reading' | 'compressing' | 'complete';
}

/**
 * Compress an image file using Canvas API
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {},
  onProgress?: (progress: CompressionProgress) => void
): Promise<File> {
  const {
    maxSizeMB = 5,
    maxWidthOrHeight = 1920,
    quality = 0.85,
    fileType = file.type
  } = options;

  onProgress?.({ percent: 10, stage: 'reading' });

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target?.result as string;

      img.onload = () => {
        onProgress?.({ percent: 40, stage: 'compressing' });

        const canvas = document.createElement('canvas');
        let { width, height } = img;

        // Calculate new dimensions while maintaining aspect ratio
        if (width > height) {
          if (width > maxWidthOrHeight) {
            height = Math.round((height * maxWidthOrHeight) / width);
            width = maxWidthOrHeight;
          }
        } else {
          if (height > maxWidthOrHeight) {
            width = Math.round((width * maxWidthOrHeight) / height);
            height = maxWidthOrHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Draw image with better quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        onProgress?.({ percent: 80, stage: 'compressing' });

        // Convert canvas to blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }

            // Check if compression is effective
            const compressedSize = blob.size / 1024 / 1024; // MB
            if (compressedSize > maxSizeMB) {
              // Try with lower quality
              const lowerQuality = Math.max(0.5, quality - 0.2);
              canvas.toBlob(
                (retryBlob) => {
                  if (!retryBlob) {
                    reject(new Error('Failed to compress image'));
                    return;
                  }

                  const compressedFile = new File([retryBlob], file.name, {
                    type: fileType,
                    lastModified: Date.now(),
                  });

                  onProgress?.({ percent: 100, stage: 'complete' });
                  resolve(compressedFile);
                },
                fileType,
                lowerQuality
              );
            } else {
              const compressedFile = new File([blob], file.name, {
                type: fileType,
                lastModified: Date.now(),
              });

              onProgress?.({ percent: 100, stage: 'complete' });
              resolve(compressedFile);
            }
          },
          fileType,
          quality
        );
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
  });
}

/**
 * Get optimal compression settings based on file size
 */
export function getOptimalCompressionSettings(fileSizeMB: number): CompressionOptions {
  if (fileSizeMB < 1) {
    // Small files - minimal compression
    return {
      maxSizeMB: 5,
      maxWidthOrHeight: 1920,
      quality: 0.9,
    };
  } else if (fileSizeMB < 5) {
    // Medium files - moderate compression
    return {
      maxSizeMB: 3,
      maxWidthOrHeight: 1920,
      quality: 0.85,
    };
  } else if (fileSizeMB < 10) {
    // Large files - aggressive compression
    return {
      maxSizeMB: 2,
      maxWidthOrHeight: 1600,
      quality: 0.75,
    };
  } else {
    // Very large files - maximum compression
    return {
      maxSizeMB: 1.5,
      maxWidthOrHeight: 1280,
      quality: 0.7,
    };
  }
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Check if file needs compression
 */
export function shouldCompressFile(file: File, maxSizeMB: number = 5): boolean {
  const fileSizeMB = file.size / 1024 / 1024;
  return fileSizeMB > maxSizeMB;
}

/**
 * Validate file type
 */
export function validateFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.some(type => {
    if (type.endsWith('/*')) {
      const prefix = type.replace('/*', '');
      return file.type.startsWith(prefix);
    }
    return file.type === type;
  });
}

/**
 * Get file extension
 */
export function getFileExtension(filename: string): string {
  return filename.slice(((filename.lastIndexOf('.') - 1) >>> 0) + 2);
}
