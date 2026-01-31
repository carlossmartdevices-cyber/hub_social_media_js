import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { promises as fs } from 'fs';
import { logger } from '../utils/logger';

/**
 * S3StorageService - Handle video and thumbnail uploads to AWS S3
 * for hosting on previews.pnptv.app
 */
export class S3StorageService {
  private s3Client: S3Client;
  private bucketName: string;
  private cloudFrontDomain: string;
  private region: string;
  private kmsKeyId?: string;
  private useKmsEncryption: boolean;

  constructor() {
    this.region = process.env.AWS_REGION || 'us-east-2';
    this.bucketName = process.env.AWS_S3_BUCKET || 'pnptv-previews';
<<<<<<< HEAD
    this.cloudFrontDomain = process.env.CLOUDFRONT_DOMAIN || 'previews.pnptv.app';
    this.kmsKeyId = process.env.AWS_KMS_KEY_ARN;
    this.useKmsEncryption = !!this.kmsKeyId;

    // Initialize S3 client
    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });

    logger.info('S3StorageService initialized', {
      region: this.region,
      bucket: this.bucketName,
      domain: this.cloudFrontDomain,
      kmsEncryption: this.useKmsEncryption,
      kmsKeyId: this.kmsKeyId ? '***' + this.kmsKeyId.slice(-8) : 'none',
    });
  }

  /**
   * Upload video to S3 and return public URL
   */
  public async uploadVideo(
    localFilePath: string,
    remoteFileName: string,
    contentType: string = 'video/mp4'
  ): Promise<string> {
    try {
      logger.info('Uploading video to S3', { localFilePath, remoteFileName });

      // Read file
      const fileContent = await fs.readFile(localFilePath);

      // Prepare S3 key (path in bucket)
      const s3Key = `videos/${remoteFileName}`;

      // Upload to S3 with KMS encryption
      const uploadParams: any = {
        Bucket: this.bucketName,
        Key: s3Key,
        Body: fileContent,
        ContentType: contentType,
        ACL: 'public-read', // Make publicly accessible
        CacheControl: 'max-age=31536000', // Cache for 1 year
        Metadata: {
          'uploaded-at': new Date().toISOString(),
          'content-type': 'adult-preview',
        },
      };

      // Add KMS encryption if configured
      if (this.useKmsEncryption && this.kmsKeyId) {
        uploadParams.ServerSideEncryption = 'aws:kms';
        uploadParams.SSEKMSKeyId = this.kmsKeyId;
        // Construct public URL
      const publicUrl = this.getPublicUrl(s3Key);

      logger.info('Video uploaded successfully to S3', {
        localFilePath,
        publicUrl,
        s3Key,
      });

      return publicUrl;
    } catch (error: any) {
      logger.error('Error uploading video to S3:', error);
      throw new Error(`Failed to upload video to S3: ${error.message}`);
    }
  }

  /**
   * Upload thumbnail to S3 and return public URL
   */
  public async uploadThumbnail(
    localFilePath: string,
    remoteFileName: string,
    contentType: string = 'image/jpeg'
  ): Promise<string> {
    try {
      logger.info('Uploading thumbnail to S3', { localFilePath, remoteFileName });

      // Read file
      const fileContent = await fs.readFile(localFilePath);

      // Prepare S3 key
      const s3Key = `thumbnails/${remoteFileName}`;

      // Upload to S3 with KMS encryption
      const uploadParams: any = {
        Bucket: this.bucketName,
        Key: s3Key,
        Body: fileContent,
        ContentType: contentType,
        ACL: 'public-read',
        CacheControl: 'max-age=31536000',
        Metadata: {
          'uploaded-at': new Date().toISOString(),
          'content-type': 'thumbnail',
        },
      };

      // Add KMS encryption if configured
      if (this.useKmsEncryption && this.kmsKeyId) {
        uploadParams.ServerSideEncryption = 'aws:kms';
        uploadParams.SSEKMSKeyId = this.kmsKeyId;
        logger.info('Using KMS encryption for thumbnail upload', { s3Key });
      }

      const command = new PutObjectCommand(uploadParams);

      await this.s3Client.send(command);

      // Construct public URL
      const publicUrl = this.getPublicUrl(s3Key);

      logger.info('Thumbnail uploaded successfully to S3', {
        localFilePath,
        publicUrl,
        s3Key,
      });

      return publicUrl;
    } catch (error: any) {
      logger.error('Error uploading thumbnail to S3:', error);
      throw new Error(`Failed to upload thumbnail to S3: ${error.message}`);
    }
  }

  /**
   * Delete video from S3
   */
  public async deleteVideo(fileName: string): Promise<void> {
    try {
      const s3Key = `videos/${fileName}`;

      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
      });

      await this.s3Client.send(command);

      logger.info('Video deleted from S3', { s3Key });
    } catch (error: any) {
      logger.error('Error deleting video from S3:', error);
      throw new Error(`Failed to delete video from S3: ${error.message}`);
    }
  }

  /**
   * Delete thumbnail from S3
   */
  public async deleteThumbnail(fileName: string): Promise<void> {
    try {
      const s3Key = `thumbnails/${fileName}`;

      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
      });

      await this.s3Client.send(command);

      logger.info('Thumbnail deleted from S3', { s3Key });
    } catch (error: any) {
      logger.error('Error deleting thumbnail from S3:', error);
      throw new Error(`Failed to delete thumbnail from S3: ${error.message}`);
    }
  }

  /**
   * Check if file exists in S3
   */
  public async fileExists(s3Key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get public URL for a file
   */
  public getPublicUrl(s3Key: string): string {
    if (this.cloudFrontDomain) {
      return `https://${this.cloudFrontDomain}/${s3Key}`;
    }
    return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${s3Key}`;
  }

  /**
   * Upload both video and thumbnail, return both URLs
   */
  public async uploadVideoWithThumbnail(
    videoLocalPath: string,
    thumbnailLocalPath: string,
    baseFileName: string
  ): Promise<{
    videoUrl: string;
    thumbnailUrl: string;
  }> {
    const videoFileName = `${baseFileName}.mp4`;
    const thumbnailFileName = `${baseFileName}_thumb.jpg`;

    const [videoUrl, thumbnailUrl] = await Promise.all([
      this.uploadVideo(videoLocalPath, videoFileName),
      this.uploadThumbnail(thumbnailLocalPath, thumbnailFileName),
    ]);

    return { videoUrl, thumbnailUrl };
  }
}

export const s3StorageService = new S3StorageService();
