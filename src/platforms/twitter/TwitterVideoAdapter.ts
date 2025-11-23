import { TwitterApi } from 'twitter-api-v2';
import { promises as fs } from 'fs';
import { logger } from '../../utils/logger';
import { PostContent } from '../../core/content/types';

interface VideoMetadata {
  title: string;
  description: string;
  alt_text?: string;
  hashtags?: string[];
  cta?: string;
}

/**
 * TwitterVideoAdapter - Handle video uploads to Twitter with metadata
 *
 * Supports:
 * - Chunked video upload for large files
 * - Video metadata (title, description, alt text)
 * - Hashtags and CTA
 * - OAuth 2.0 authentication
 */
export class TwitterVideoAdapter {
  private client: TwitterApi | null = null;

  /**
   * Initialize Twitter client with credentials
   */
  public async initialize(credentials: Record<string, string>): Promise<void> {
    try {
      // Support both OAuth 1.0a and OAuth 2.0
      if (credentials.accessToken && credentials.accessTokenSecret) {
        // OAuth 1.0a
        this.client = new TwitterApi({
          appKey: credentials.apiKey || '',
          appSecret: credentials.apiSecret || '',
          accessToken: credentials.accessToken,
          accessSecret: credentials.accessTokenSecret,
        });
      } else if (credentials.bearerToken) {
        // OAuth 2.0 Bearer Token
        this.client = new TwitterApi(credentials.bearerToken);
      } else {
        throw new Error('Missing required Twitter credentials');
      }

      logger.info('TwitterVideoAdapter initialized successfully');
    } catch (error: any) {
      logger.error('Failed to initialize TwitterVideoAdapter:', error);
      throw new Error(`Twitter initialization failed: ${error.message}`);
    }
  }

  /**
   * Upload video to Twitter and create tweet with metadata
   *
   * @param content - Post content including video
   * @param videoMetadata - Video-specific metadata
   * @returns Publish result with tweet ID
   */
  public async publishVideo(
    content: PostContent,
    videoMetadata: VideoMetadata
  ): Promise<any> {
    if (!this.client) {
      throw new Error('Twitter client not initialized');
    }

    try {
      logger.info('Starting Twitter video upload', {
        title: videoMetadata.title,
      });

      // Get video file path from content
      const videoUrl = content.media?.[0]?.url;
      if (!videoUrl) {
        throw new Error('No video URL provided');
      }

      // Read video file
      const videoBuffer = await fs.readFile(videoUrl);

      // Upload video using chunked upload
      const mediaId = await this.uploadVideoChunked(videoBuffer, videoMetadata);

      // Build tweet text with title, description, hashtags, and CTA
      const tweetText = this.buildTweetText(videoMetadata);

      // Create tweet with video
      const tweet = await this.client.v2.tweet({
        text: tweetText,
        media: {
          media_ids: [mediaId],
        },
      });

      logger.info('Video published to Twitter successfully', {
        tweetId: tweet.data.id,
        mediaId,
      });

      return {
        success: true,
        platformPostId: tweet.data.id,
        publishedAt: new Date(),
      };
    } catch (error: any) {
      logger.error('Failed to publish video to Twitter:', error);
      return {
        success: false,
        error: error.message || 'Failed to publish video',
        publishedAt: new Date(),
      };
    }
  }

  /**
   * Upload video using chunked upload for large files
   */
  private async uploadVideoChunked(
    videoBuffer: Buffer,
    metadata: VideoMetadata
  ): Promise<string> {
    if (!this.client) {
      throw new Error('Twitter client not initialized');
    }

    try {
      // Detect media type
      const mediaType = 'video/mp4'; // Assuming MP4, could be detected from file

      // Upload using chunked method
      const mediaId = await this.client.v1.uploadMedia(videoBuffer, {
        mimeType: mediaType,
        target: 'tweet',
        additionalOwners: undefined,
        // Set alt text if provided
        ...(metadata.alt_text && { longDescription: metadata.alt_text }),
      });

      logger.info('Video uploaded to Twitter', { mediaId });

      return mediaId;
    } catch (error: any) {
      logger.error('Video upload to Twitter failed:', error);
      throw new Error(`Video upload failed: ${error.message}`);
    }
  }

  /**
   * Build tweet text from video metadata
   */
  private buildTweetText(metadata: VideoMetadata): string {
    const parts: string[] = [];

    // Add title
    if (metadata.title) {
      parts.push(metadata.title);
    }

    // Add description
    if (metadata.description) {
      parts.push(metadata.description);
    }

    // Add CTA
    if (metadata.cta) {
      parts.push(metadata.cta);
    }

    // Add hashtags
    if (metadata.hashtags && metadata.hashtags.length > 0) {
      const hashtagString = metadata.hashtags
        .map(tag => tag.startsWith('#') ? tag : `#${tag}`)
        .join(' ');
      parts.push(hashtagString);
    }

    // Join all parts with double line breaks
    let text = parts.join('\n\n');

    // Ensure we don't exceed Twitter's character limit (280)
    if (text.length > 280) {
      // Truncate and add ellipsis
      text = text.substring(0, 277) + '...';
      logger.warn('Tweet text truncated to fit 280 character limit');
    }

    return text;
  }

  /**
   * Get video upload limits for Twitter
   */
  public getUploadLimits(): {
    maxDuration: number;
    maxSize: number;
    supportedFormats: string[];
  } {
    return {
      maxDuration: 140, // 2 minutes 20 seconds
      maxSize: 512 * 1024 * 1024, // 512 MB
      supportedFormats: ['mp4', 'mov'],
    };
  }

  /**
   * Validate video meets Twitter requirements
   */
  public async validateVideo(
    videoPath: string,
    duration: number,
    size: number
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    const limits = this.getUploadLimits();

    // Check duration
    if (duration > limits.maxDuration) {
      errors.push(`Video duration (${duration}s) exceeds maximum (${limits.maxDuration}s)`);
    }

    // Check size
    if (size > limits.maxSize) {
      const sizeMB = (size / (1024 * 1024)).toFixed(2);
      const maxSizeMB = (limits.maxSize / (1024 * 1024)).toFixed(2);
      errors.push(`Video size (${sizeMB}MB) exceeds maximum (${maxSizeMB}MB)`);
    }

    // Check format
    const ext = videoPath.split('.').pop()?.toLowerCase();
    if (ext && !limits.supportedFormats.includes(ext)) {
      errors.push(`Video format (${ext}) not supported. Use: ${limits.supportedFormats.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get video processing status on Twitter
   */
  public async getVideoStatus(mediaId: string): Promise<any> {
    if (!this.client) {
      throw new Error('Twitter client not initialized');
    }

    try {
      // Note: This endpoint might require elevated access
      const status = await this.client.v1.mediaInfo(mediaId);
      return status;
    } catch (error: any) {
      logger.error('Failed to get video status:', error);
      throw error;
    }
  }
}

export const twitterVideoAdapter = new TwitterVideoAdapter();
