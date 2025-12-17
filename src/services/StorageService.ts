// AWS SDK imports
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';
import path from 'path';
import { config } from '../config';
import logger from '../utils/logger';

export interface UploadOptions {
  folder?: string;
  filename?: string;
  contentType?: string;
  isPublic?: boolean;
}

export interface UploadResult {
  url: string;
  key: string;
  bucket?: string;
  size?: number;
}

/**
 * Storage Service - Supports both local filesystem and AWS S3
 * Automatically switches based on AWS_S3_ENABLED environment variable
 */
export class StorageService {
  private s3Client: S3Client | null = null;
  private useS3: boolean;
  private localStoragePath: string;

  constructor() {
    this.useS3 = config.storage?.s3?.enabled || false;
    this.localStoragePath = config.media.storagePath || './uploads';

    if (this.useS3) {
      if (!config.storage?.s3?.region || !config.storage?.s3?.accessKeyId || !config.storage?.s3?.secretAccessKey) {
        logger.warn('AWS S3 is enabled but credentials are missing. Falling back to local storage.');
        this.useS3 = false;
      } else {
        this.s3Client = new S3Client({
          region: config.storage.s3.region,
          credentials: {
            accessKeyId: config.storage.s3.accessKeyId,
            secretAccessKey: config.storage.s3.secretAccessKey,
          },
        });
        logger.info(`StorageService initialized with AWS S3 (bucket: ${config.storage.s3.bucket})`);
      }
    } else {
      // Ensure local storage directory exists
      if (!fs.existsSync(this.localStoragePath)) {
        fs.mkdirSync(this.localStoragePath, { recursive: true });
      }
      logger.info(`StorageService initialized with local filesystem (path: ${this.localStoragePath})`);
    }
  }

  /**
   * Upload a file from buffer or file path
   */
  async upload(
    filePathOrBuffer: string | Buffer,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    const buffer = typeof filePathOrBuffer === 'string'
      ? fs.readFileSync(filePathOrBuffer)
      : filePathOrBuffer;

    const filename = options.filename || `file_${Date.now()}`;
    const folder = options.folder || 'uploads';
    const key = `${folder}/${filename}`;

    if (this.useS3 && this.s3Client) {
      return this.uploadToS3(buffer, key, options);
    } else {
      return this.uploadLocal(buffer, key, options);
    }
  }

  /**
   * Upload to AWS S3
   */
  private async uploadToS3(
    buffer: Buffer,
    key: string,
    options: UploadOptions
  ): Promise<UploadResult> {
    try {
      const bucket = config.storage?.s3?.bucket;
      if (!bucket) {
        throw new Error('S3 bucket not configured');
      }

      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: options.contentType || 'application/octet-stream',
        ACL: options.isPublic ? 'public-read' : 'private',
      });

      await this.s3Client!.send(command);

      // Generate URL
      const url = options.isPublic
        ? `https://${bucket}.s3.${config.storage.s3.region}.amazonaws.com/${key}`
        : await getSignedUrl(this.s3Client!, new GetObjectCommand({ Bucket: bucket, Key: key }), {
            expiresIn: 3600, // 1 hour
          });

      logger.info(`File uploaded to S3: ${key}`);

      return {
        url,
        key,
        bucket,
        size: buffer.length,
      };
    } catch (error) {
      logger.error('S3 upload error:', error);
      throw new Error('Failed to upload file to S3');
    }
  }

  /**
   * Upload to local filesystem
   */
  private async uploadLocal(
    buffer: Buffer,
    key: string,
    _options: UploadOptions
  ): Promise<UploadResult> {
    try {
      const filePath = path.join(this.localStoragePath, key);
      const directory = path.dirname(filePath);

      // Create directory if it doesn't exist
      if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
      }

      // Write file
      fs.writeFileSync(filePath, buffer);

      // Generate URL (relative path for serving via express static)
      const url = `/uploads/${key}`;

      logger.info(`File uploaded locally: ${key}`);

      return {
        url,
        key,
        size: buffer.length,
      };
    } catch (error) {
      logger.error('Local upload error:', error);
      throw new Error('Failed to upload file locally');
    }
  }

  /**
   * Delete a file
   */
  async delete(keyOrUrl: string): Promise<void> {
    // Extract key from URL if needed
    const key = keyOrUrl.startsWith('http') || keyOrUrl.startsWith('/')
      ? keyOrUrl.split('/').slice(-2).join('/')
      : keyOrUrl;

    if (this.useS3 && this.s3Client) {
      return this.deleteFromS3(key);
    } else {
      return this.deleteLocal(key);
    }
  }

  /**
   * Delete from AWS S3
   */
  private async deleteFromS3(key: string): Promise<void> {
    try {
      const bucket = config.storage?.s3?.bucket;
      if (!bucket) {
        throw new Error('S3 bucket not configured');
      }

      const command = new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      await this.s3Client!.send(command);
      logger.info(`File deleted from S3: ${key}`);
    } catch (error) {
      logger.error('S3 delete error:', error);
      throw new Error('Failed to delete file from S3');
    }
  }

  /**
   * Delete from local filesystem
   */
  private async deleteLocal(key: string): Promise<void> {
    try {
      const filePath = path.join(this.localStoragePath, key);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.info(`File deleted locally: ${key}`);
      } else {
        logger.warn(`File not found for deletion: ${key}`);
      }
    } catch (error) {
      logger.error('Local delete error:', error);
      throw new Error('Failed to delete file locally');
    }
  }

  /**
   * Get a signed URL for a private file (S3 only)
   */
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    if (this.useS3 && this.s3Client) {
      const bucket = config.storage?.s3?.bucket;
      if (!bucket) {
        throw new Error('S3 bucket not configured');
      }

      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      return await getSignedUrl(this.s3Client, command, { expiresIn });
    } else {
      // For local storage, just return the regular URL
      return `/uploads/${key}`;
    }
  }

  /**
   * Check if a file exists
   */
  async exists(key: string): Promise<boolean> {
    if (this.useS3 && this.s3Client) {
      try {
        const bucket = config.storage?.s3?.bucket;
        if (!bucket) return false;

        const command = new GetObjectCommand({
          Bucket: bucket,
          Key: key,
        });

        await this.s3Client.send(command);
        return true;
      } catch {
        return false;
      }
    } else {
      const filePath = path.join(this.localStoragePath, key);
      return fs.existsSync(filePath);
    }
  }

  /**
   * Get storage type being used
   */
  getStorageType(): 'local' | 's3' {
    return this.useS3 ? 's3' : 'local';
  }
}

export default new StorageService();
