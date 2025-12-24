import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { config } from '../config';
import logger from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';

export interface UploadResult {
  success: boolean;
  url: string;
  cdnUrl?: string;
  key: string;
  bucket: string;
  size?: number;
  encrypted: boolean;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export class S3Service {
  private s3Client!: S3Client;
  private bucket: string;
  private kmsKeyArn: string;
  private cloudfrontDomain: string;
  private enabled: boolean;

  constructor() {
    this.bucket = config.aws.s3.bucket;
    this.kmsKeyArn = config.aws.s3.kmsKeyArn;
    this.cloudfrontDomain = config.aws.cloudfront.domain;
    this.enabled = !!(config.aws.accessKeyId && config.aws.secretAccessKey);

    if (this.enabled) {
      this.s3Client = new S3Client({
        region: config.aws.region,
        credentials: {
          accessKeyId: config.aws.accessKeyId,
          secretAccessKey: config.aws.secretAccessKey,
        },
      });

      logger.info('S3Service initialized', {
        bucket: this.bucket,
        region: config.aws.region,
        kmsEnabled: !!this.kmsKeyArn,
        cloudfrontEnabled: !!this.cloudfrontDomain,
      });
    } else {
      logger.warn('S3Service not enabled - AWS credentials not configured');
    }
  }

  /**
   * Upload video file to S3 with KMS encryption
   */
  async uploadVideo(
    filePath: string,
    s3Key: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    if (!this.enabled) {
      throw new Error('S3 is not configured. Please set AWS credentials in .env');
    }

    try {
      // Read file
      const fileStream = fs.createReadStream(filePath);
      const stats = fs.statSync(filePath);
      const contentType = this.getContentType(filePath);

      logger.info('Uploading video to S3', {
        filePath,
        s3Key,
        size: stats.size,
        contentType,
      });

      // Prepare upload params
      const uploadParams: any = {
        Bucket: this.bucket,
        Key: s3Key,
        Body: fileStream,
        ContentType: contentType,
        ServerSideEncryption: this.kmsKeyArn ? 'aws:kms' : 'AES256',
      };

      // Add KMS encryption if available
      if (this.kmsKeyArn) {
        uploadParams.SSEKMSKeyId = this.kmsKeyArn;
      }

      // Use multipart upload for large files
      const upload = new Upload({
        client: this.s3Client,
        params: uploadParams,
        queueSize: 4, // Concurrent parts
        partSize: 5 * 1024 * 1024, // 5MB parts
        leavePartsOnError: false,
      });

      // Track progress
      if (onProgress) {
        upload.on('httpUploadProgress', (progress) => {
          const loaded = progress.loaded || 0;
          const total = progress.total || stats.size;
          onProgress({
            loaded,
            total,
            percentage: Math.round((loaded / total) * 100),
          });
        });
      }

      await upload.done();

      // Generate URLs
      const s3Url = `https://${this.bucket}.s3.${config.aws.region}.amazonaws.com/${s3Key}`;
      const cdnUrl = this.cloudfrontDomain
        ? `https://${this.cloudfrontDomain}/${s3Key}`
        : undefined;

      logger.info('Video uploaded successfully', {
        s3Key,
        s3Url,
        cdnUrl,
        encrypted: !!this.kmsKeyArn,
      });

      return {
        success: true,
        url: s3Url,
        cdnUrl,
        key: s3Key,
        bucket: this.bucket,
        size: stats.size,
        encrypted: !!this.kmsKeyArn,
      };
    } catch (error: any) {
      logger.error('Error uploading video to S3:', error);
      throw new Error(`S3 upload failed: ${error.message}`);
    }
  }

  /**
   * Upload file from buffer (for thumbnails, images, etc.)
   */
  async uploadFromBuffer(
    buffer: Buffer,
    s3Key: string,
    contentType: string
  ): Promise<UploadResult> {
    if (!this.enabled) {
      throw new Error('S3 is not configured');
    }

    try {
      const uploadParams: any = {
        Bucket: this.bucket,
        Key: s3Key,
        Body: buffer,
        ContentType: contentType,
        ServerSideEncryption: this.kmsKeyArn ? 'aws:kms' : 'AES256',
      };

      if (this.kmsKeyArn) {
        uploadParams.SSEKMSKeyId = this.kmsKeyArn;
      }

      const command = new PutObjectCommand(uploadParams);
      await this.s3Client.send(command);

      const s3Url = `https://${this.bucket}.s3.${config.aws.region}.amazonaws.com/${s3Key}`;
      const cdnUrl = this.cloudfrontDomain
        ? `https://${this.cloudfrontDomain}/${s3Key}`
        : undefined;

      return {
        success: true,
        url: s3Url,
        cdnUrl,
        key: s3Key,
        bucket: this.bucket,
        size: buffer.length,
        encrypted: !!this.kmsKeyArn,
      };
    } catch (error: any) {
      logger.error('Error uploading buffer to S3:', error);
      throw new Error(`S3 upload failed: ${error.message}`);
    }
  }

  /**
   * Delete file from S3
   */
  async deleteFile(s3Key: string): Promise<boolean> {
    if (!this.enabled) {
      logger.warn('S3 not configured, skipping delete');
      return false;
    }

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: s3Key,
      });

      await this.s3Client.send(command);
      logger.info('File deleted from S3', { s3Key });
      return true;
    } catch (error: any) {
      logger.error('Error deleting file from S3:', error);
      return false;
    }
  }

  /**
   * Check if file exists in S3
   */
  async fileExists(s3Key: string): Promise<boolean> {
    if (!this.enabled) {
      return false;
    }

    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: s3Key,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Generate S3 key for video
   */
  generateVideoKey(userId: string, originalFileName: string): string {
    const timestamp = Date.now();
    const ext = path.extname(originalFileName);
    const sanitizedName = path.basename(originalFileName, ext)
      .replace(/[^a-zA-Z0-9-_]/g, '-')
      .substring(0, 50);

    return `videos/${userId}/${timestamp}-${sanitizedName}${ext}`;
  }

  /**
   * Generate S3 key for thumbnail
   */
  generateThumbnailKey(videoKey: string): string {
    const ext = path.extname(videoKey);
    const baseName = videoKey.replace(ext, '');
    return `${baseName}-thumbnail.jpg`;
  }

  /**
   * Get content type from file path
   */
  private getContentType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const contentTypes: { [key: string]: string } = {
      '.mp4': 'video/mp4',
      '.mov': 'video/quicktime',
      '.avi': 'video/x-msvideo',
      '.webm': 'video/webm',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
    };

    return contentTypes[ext] || 'application/octet-stream';
  }

  /**
   * Get public URL for S3 object
   */
  getPublicUrl(s3Key: string, useCDN: boolean = true): string {
    if (useCDN && this.cloudfrontDomain) {
      return `https://${this.cloudfrontDomain}/${s3Key}`;
    }
    return `https://${this.bucket}.s3.${config.aws.region}.amazonaws.com/${s3Key}`;
  }

  /**
   * Check if S3 is configured and ready
   */
  isConfigured(): boolean {
    return this.enabled;
  }
}

export default new S3Service();
