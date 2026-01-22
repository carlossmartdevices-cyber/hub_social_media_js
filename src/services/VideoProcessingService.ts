import ffmpeg from 'fluent-ffmpeg';
import { promises as fs } from 'fs';
import path from 'path';
import { logger } from '../utils/logger';
import database from '../database/connection';
import { config } from '../config';

interface VideoMetadata {
  duration: number; // seconds
  width: number;
  height: number;
  size: number; // bytes
  format: string;
  bitrate: number; // kbps
}

// Adult content video constraints
interface AdultContentConstraints {
  minDuration: number; // 15 seconds
  maxDuration: number; // 45 seconds
  targetWidth: number; // 1280 (720p)
  targetHeight: number; // 720 (720p)
  targetBitrate: string; // '3000k' for good quality in short videos
  maxFileSize: number; // 100MB optimized for Twitter/X
}

interface ProcessingOptions {
  quality?: 'high' | 'medium' | 'low';
  maxWidth?: number;
  maxHeight?: number;
  maxDuration?: number; // seconds
  format?: 'mp4' | 'webm';
  generateThumbnail?: boolean;
  isAdultContent?: boolean; // Enable adult content constraints (15-45s, 720p)
}

interface ProcessedVideo {
  url: string;
  thumbnailUrl?: string;
  metadata: VideoMetadata;
  compressionRatio: number;
}

/**
 * VideoProcessingService - Handle video compression, optimization and upload
 */
export class VideoProcessingService {
  private readonly UPLOAD_DIR = config.video.uploadDir;
  private readonly THUMBNAIL_DIR = config.video.thumbnailDir;
  private readonly MAX_VIDEO_SIZE = config.media.maxVideoSize;

  // Adult content video constraints (previews for pnptv.app)
  private readonly ADULT_CONTENT_CONSTRAINTS: AdultContentConstraints = {
    minDuration: 15, // Minimum 15 seconds
    maxDuration: 45, // Maximum 45 seconds
    targetWidth: 1280, // 720p width
    targetHeight: 720, // 720p height
    targetBitrate: '3000k', // 3000 kbps for high quality short videos
    maxFileSize: 100 * 1024 * 1024, // 100MB target size
  };

  constructor() {
    // Ensure upload directories exist
    this.ensureDirectories();
  }

  private async ensureDirectories(): Promise<void> {
    try {
      await fs.mkdir(this.UPLOAD_DIR, { recursive: true });
      await fs.mkdir(this.THUMBNAIL_DIR, { recursive: true });
    } catch (error) {
      logger.error('Failed to create upload directories:', error);
    }
  }

  /**
   * Get video metadata using ffprobe
   */
  public async getVideoMetadata(videoPath: string): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }

        const videoStream = metadata.streams.find(s => s.codec_type === 'video');
        if (!videoStream) {
          reject(new Error('No video stream found'));
          return;
        }

        resolve({
          duration: metadata.format.duration || 0,
          width: videoStream.width || 0,
          height: videoStream.height || 0,
          size: metadata.format.size || 0,
          format: metadata.format.format_name || 'unknown',
          bitrate: Math.round((metadata.format.bit_rate || 0) / 1000),
        });
      });
    });
  }

  /**
   * Validate video against adult content constraints
   * Returns validation result and adjusted settings
   */
  public validateAdultContentVideo(metadata: VideoMetadata): {
    isValid: boolean;
    errors: string[];
    requiresTrimming: boolean;
    adjustedDuration?: number;
  } {
    const errors: string[] = [];
    let requiresTrimming = false;
    let adjustedDuration: number | undefined;

    // Check minimum duration
    if (metadata.duration < this.ADULT_CONTENT_CONSTRAINTS.minDuration) {
      errors.push(
        `Video is too short. Minimum duration is ${this.ADULT_CONTENT_CONSTRAINTS.minDuration}s, got ${Math.floor(metadata.duration)}s`
      );
    }

    // Check maximum duration (allow trimming)
    if (metadata.duration > this.ADULT_CONTENT_CONSTRAINTS.maxDuration) {
      requiresTrimming = true;
      adjustedDuration = this.ADULT_CONTENT_CONSTRAINTS.maxDuration;
      logger.info(
        `Video exceeds maximum duration. Will trim from ${Math.floor(metadata.duration)}s to ${this.ADULT_CONTENT_CONSTRAINTS.maxDuration}s`
      );
    }

    // Note: We'll handle resolution conversion automatically, so no error needed
    const needsResolutionAdjustment =
      metadata.width !== this.ADULT_CONTENT_CONSTRAINTS.targetWidth ||
      metadata.height !== this.ADULT_CONTENT_CONSTRAINTS.targetHeight;

    if (needsResolutionAdjustment) {
      logger.info(
        `Video resolution ${metadata.width}x${metadata.height} will be converted to ${this.ADULT_CONTENT_CONSTRAINTS.targetWidth}x${this.ADULT_CONTENT_CONSTRAINTS.targetHeight} (720p)`
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      requiresTrimming,
      adjustedDuration,
    };
  }

  /**
   * Process and optimize video for social media platforms
   */
  public async processVideo(
    inputPath: string,
    postId: string,
    options: ProcessingOptions = {}
  ): Promise<ProcessedVideo> {
    try {
      logger.info('Starting video processing', { postId, inputPath, isAdultContent: options.isAdultContent });

      // Get original metadata
      const originalMetadata = await this.getVideoMetadata(inputPath);

      // Validate adult content constraints if enabled
      if (options.isAdultContent) {
        const validation = this.validateAdultContentVideo(originalMetadata);

        if (!validation.isValid) {
          const errorMsg = `Adult content validation failed: ${validation.errors.join(', ')}`;
          logger.error(errorMsg, { postId, originalMetadata });
          throw new Error(errorMsg);
        }

        // Apply adult content settings
        if (validation.requiresTrimming && validation.adjustedDuration) {
          options.maxDuration = validation.adjustedDuration;
          logger.info('Video will be trimmed', {
            postId,
            original: originalMetadata.duration,
            adjusted: validation.adjustedDuration,
          });
        }

        // Force 720p resolution for adult content
        options.maxWidth = this.ADULT_CONTENT_CONSTRAINTS.targetWidth;
        options.maxHeight = this.ADULT_CONTENT_CONSTRAINTS.targetHeight;
      }

      // Validate file size
      if (originalMetadata.size > this.MAX_VIDEO_SIZE) {
        throw new Error(`Video size ${originalMetadata.size} exceeds maximum ${this.MAX_VIDEO_SIZE}`);
      }

      // Create processing job in database
      await this.createProcessingJob(postId, inputPath, originalMetadata);

      // Generate output filename
      const outputFilename = `${postId}_${Date.now()}.mp4`;
      const outputPath = path.join(this.UPLOAD_DIR, outputFilename);

      // Determine quality settings
      let qualitySettings = this.getQualitySettings(options.quality || 'medium');

      // Override quality settings for adult content (higher quality for short videos)
      if (options.isAdultContent) {
        qualitySettings = {
          videoBitrate: this.ADULT_CONTENT_CONSTRAINTS.targetBitrate,
          maxWidth: this.ADULT_CONTENT_CONSTRAINTS.targetWidth,
          maxHeight: this.ADULT_CONTENT_CONSTRAINTS.targetHeight,
        };
      }

      // Process video
      await this.compressVideo(inputPath, outputPath, {
        ...qualitySettings,
        maxWidth: options.maxWidth,
        maxHeight: options.maxHeight,
        maxDuration: options.maxDuration,
      });

      // Get processed metadata
      const processedMetadata = await this.getVideoMetadata(outputPath);

      // Generate thumbnail if requested
      let thumbnailUrl: string | undefined;
      if (options.generateThumbnail !== false) {
        thumbnailUrl = await this.generateThumbnail(outputPath, postId);
      }

      // Calculate compression ratio
      const compressionRatio = originalMetadata.size > 0
        ? ((originalMetadata.size - processedMetadata.size) / originalMetadata.size) * 100
        : 0;

      logger.info('Video processing completed', {
        postId,
        isAdultContent: options.isAdultContent,
        originalSize: originalMetadata.size,
        processedSize: processedMetadata.size,
        originalDuration: originalMetadata.duration,
        processedDuration: processedMetadata.duration,
        resolution: `${processedMetadata.width}x${processedMetadata.height}`,
        compressionRatio: `${compressionRatio.toFixed(2)}%`,
      });

      // Update processing job
      await this.updateProcessingJob(postId, {
        status: 'completed',
        processedUrl: `/uploads/videos/${outputFilename}`,
        thumbnailUrl,
        sizeAfter: processedMetadata.size,
        compressionRatio,
      });

      return {
        url: `/uploads/videos/${outputFilename}`,
        thumbnailUrl,
        metadata: processedMetadata,
        compressionRatio,
      };
    } catch (error: any) {
      logger.error('Video processing error:', error);

      // Update job as failed
      await this.updateProcessingJob(postId, {
        status: 'failed',
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Compress video with ffmpeg
   */
  private async compressVideo(
    inputPath: string,
    outputPath: string,
    settings: any
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      let command = ffmpeg(inputPath)
        .output(outputPath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .audioBitrate('128k')
        .format('mp4')
        .outputOptions([
          '-preset medium',
          '-movflags +faststart', // Enable streaming
          '-pix_fmt yuv420p', // Compatibility
        ]);

      // Apply video bitrate
      if (settings.videoBitrate) {
        command = command.videoBitrate(settings.videoBitrate);
      }

      // Apply resolution limit
      if (settings.maxWidth && settings.maxHeight) {
        command = command.size(`${settings.maxWidth}x${settings.maxHeight}`);
      }

      // Apply duration limit
      if (settings.maxDuration) {
        command = command.duration(settings.maxDuration);
      }

      // Execute
      command
        .on('end', () => {
          logger.info('Video compression completed', { outputPath });
          resolve();
        })
        .on('error', (err) => {
          logger.error('Video compression failed:', err);
          reject(err);
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            logger.debug(`Processing: ${progress.percent.toFixed(2)}%`);
          }
        })
        .run();
    });
  }

  /**
   * Generate video thumbnail
   */
  private async generateThumbnail(videoPath: string, postId: string): Promise<string> {
    const thumbnailFilename = `${postId}_thumb.jpg`;
    const thumbnailPath = path.join(this.THUMBNAIL_DIR, thumbnailFilename);

    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .screenshots({
          timestamps: ['10%'], // Take screenshot at 10% of video
          filename: thumbnailFilename,
          folder: this.THUMBNAIL_DIR,
          size: '1280x720',
        })
        .on('end', () => {
          logger.info('Thumbnail generated', { thumbnailPath });
          resolve(`/uploads/thumbnails/${thumbnailFilename}`);
        })
        .on('error', (err) => {
          logger.error('Thumbnail generation failed:', err);
          reject(err);
        });
    });
  }

  /**
   * Get quality settings based on preset
   */
  private getQualitySettings(quality: 'high' | 'medium' | 'low') {
    const settings = {
      high: {
        videoBitrate: '5000k',
        maxWidth: 1920,
        maxHeight: 1080,
      },
      medium: {
        videoBitrate: '2500k',
        maxWidth: 1280,
        maxHeight: 720,
      },
      low: {
        videoBitrate: '1000k',
        maxWidth: 854,
        maxHeight: 480,
      },
    };

    return settings[quality];
  }

  /**
   * Create video processing job in database
   */
  private async createProcessingJob(
    postId: string,
    originalUrl: string,
    metadata: VideoMetadata
  ): Promise<void> {
    await database.query(
      `INSERT INTO video_processing_jobs
       (post_id, original_url, status, size_before, started_at)
       VALUES ($1, $2, 'processing', $3, NOW())`,
      [postId, originalUrl, metadata.size]
    );
  }

  /**
   * Update video processing job
   */
  private async updateProcessingJob(
    postId: string,
    updates: {
      status?: string;
      processedUrl?: string;
      thumbnailUrl?: string;
      sizeAfter?: number;
      compressionRatio?: number;
      error?: string;
    }
  ): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.status) {
      fields.push(`status = $${paramCount}`);
      values.push(updates.status);
      paramCount++;
    }

    if (updates.processedUrl) {
      fields.push(`processed_url = $${paramCount}`);
      values.push(updates.processedUrl);
      paramCount++;
    }

    if (updates.thumbnailUrl) {
      fields.push(`thumbnail_url = $${paramCount}`);
      values.push(updates.thumbnailUrl);
      paramCount++;
    }

    if (updates.sizeAfter) {
      fields.push(`size_after = $${paramCount}`);
      values.push(updates.sizeAfter);
      paramCount++;
    }

    if (updates.compressionRatio !== undefined) {
      fields.push(`compression_ratio = $${paramCount}`);
      values.push(updates.compressionRatio);
      paramCount++;
    }

    if (updates.error) {
      fields.push(`error_message = $${paramCount}`);
      values.push(updates.error);
      paramCount++;
    }

    if (fields.length === 0) return;

    values.push(postId);

    await database.query(
      `UPDATE video_processing_jobs
       SET ${fields.join(', ')}
       WHERE post_id = $${paramCount}`,
      values
    );
  }

  /**
   * Get platform-specific video requirements
   */
  public getPlatformRequirements(platform: string) {
    const requirements: Record<string, any> = {
      twitter: {
        maxDuration: 140, // 2:20 minutes
        maxSize: 512 * 1024 * 1024, // 512MB
        formats: ['mp4', 'mov'],
        minWidth: 32,
        maxWidth: 1920,
        minHeight: 32,
        maxHeight: 1080,
        aspectRatios: ['16:9', '1:1', '4:5'],
      },
      instagram: {
        maxDuration: 60, // 1 minute for feed
        maxSize: 100 * 1024 * 1024, // 100MB
        formats: ['mp4', 'mov'],
        aspectRatios: ['1:1', '4:5', '16:9'],
      },
      youtube: {
        maxDuration: 43200, // 12 hours
        maxSize: 256 * 1024 * 1024 * 1024, // 256GB
        formats: ['mp4', 'mov', 'avi', 'wmv'],
      },
      tiktok: {
        maxDuration: 180, // 3 minutes
        maxSize: 4 * 1024 * 1024 * 1024, // 4GB
        formats: ['mp4', 'mov'],
        aspectRatios: ['9:16'],
      },
    };

    return requirements[platform.toLowerCase()] || requirements.twitter;
  }
}

export const videoProcessingService = new VideoProcessingService();
