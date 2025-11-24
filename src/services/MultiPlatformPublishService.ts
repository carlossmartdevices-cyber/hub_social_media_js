import { logger } from '../utils/logger';
import database from '../database/connection';
import { MediaType } from '../core/content/types';
import { twitterVideoAdapter } from '../platforms/twitter/TwitterVideoAdapter';
import { TelegramBroadcastService } from './TelegramBroadcastService';

const telegramBroadcastService = new TelegramBroadcastService();
import EncryptionService from '../utils/encryption';
import path from 'path';
import fs from 'fs';

interface PublishOptions {
  postId: string;
  userId: string;
  platforms: string[]; // ['twitter', 'telegram']
  twitterAccountId?: string;
  telegramChannelIds?: string[];
  caption?: string;
  videoMetadata?: any;
}

interface PlatformResult {
  platform: string;
  success: boolean;
  platformPostId?: string;
  messageId?: string;
  error?: string;
  details?: any;
}

interface MultiPlatformResult {
  success: boolean;
  results: PlatformResult[];
  totalSuccess: number;
  totalFailed: number;
}

export class MultiPlatformPublishService {
  /**
   * Publish video to multiple platforms simultaneously
   */
  public async publishToMultiplePlatforms(
    options: PublishOptions
  ): Promise<MultiPlatformResult> {
    const { postId, userId, platforms, twitterAccountId, telegramChannelIds, caption, videoMetadata } = options;

    logger.info('Starting multi-platform publish', {
      postId,
      userId,
      platforms,
    });

    const results: PlatformResult[] = [];

    try {
      // Get post data
      const postResult = await database.query(
        `SELECT * FROM posts WHERE id = $1 AND user_id = $2`,
        [postId, userId]
      );

      if (postResult.rows.length === 0) {
        throw new Error('Video post not found');
      }

      const post = postResult.rows[0];

      // Verify video is ready
      if (post.processing_status !== 'ready') {
        throw new Error(`Video is not ready for publishing. Status: ${post.processing_status}`);
      }

      // Get the actual file path for the video
      const videoPath = this.getVideoFilePath(post.media_url);

      if (!fs.existsSync(videoPath)) {
        throw new Error(`Video file not found at path: ${videoPath}`);
      }

      // Publish to each platform
      const publishPromises: Promise<PlatformResult>[] = [];

      if (platforms.includes('twitter') && twitterAccountId) {
        publishPromises.push(
          this.publishToTwitter(post, videoMetadata || {}, twitterAccountId, videoPath)
        );
      }

      if (platforms.includes('telegram') && telegramChannelIds && telegramChannelIds.length > 0) {
        publishPromises.push(
          this.publishToTelegram(post, caption || '', telegramChannelIds, userId, videoPath)
        );
      }

      // Execute all publishes in parallel
      const platformResults = await Promise.allSettled(publishPromises);

      // Process results
      platformResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            platform: 'unknown',
            success: false,
            error: result.reason?.message || 'Unknown error',
          });
        }
      });

      // Update post status
      const allSuccess = results.every((r) => r.success);
      await database.query(
        `UPDATE posts
         SET status = $1, published_at = NOW(), platforms = $2, updated_at = NOW()
         WHERE id = $3`,
        [allSuccess ? 'published' : 'partial', platforms, postId]
      );

      const totalSuccess = results.filter((r) => r.success).length;
      const totalFailed = results.filter((r) => !r.success).length;

      logger.info('Multi-platform publish completed', {
        postId,
        totalSuccess,
        totalFailed,
      });

      return {
        success: totalSuccess > 0,
        results,
        totalSuccess,
        totalFailed,
      };
    } catch (error: any) {
      logger.error('Multi-platform publish error:', error);
      throw error;
    }
  }

  /**
   * Publish video to Twitter
   */
  private async publishToTwitter(
    post: any,
    videoMetadata: any,
    accountId: string,
    videoPath: string
  ): Promise<PlatformResult> {
    try {
      logger.info('Publishing to Twitter', { postId: post.id, accountId });

      // Get credentials with user_id validation
      const accountResult = await database.query(
        `SELECT credentials, user_id FROM platform_credentials WHERE id = $1`,
        [accountId]
      );

      if (accountResult.rows.length === 0) {
        throw new Error('Twitter account not found');
      }

      // Verify ownership
      if (accountResult.rows[0].user_id !== post.user_id) {
        throw new Error('Unauthorized: Account does not belong to user');
      }

      const credentials = JSON.parse(EncryptionService.decrypt(accountResult.rows[0].credentials));

      // Initialize adapter
      await twitterVideoAdapter.initialize(credentials);

      // Validate video
      const validation = await twitterVideoAdapter.validateVideo(
        videoPath,
        post.video_duration,
        post.video_size
      );

      if (!validation.valid) {
        throw new Error(`Video validation failed: ${validation.errors.join(', ')}`);
      }

      // Publish
      const result = await twitterVideoAdapter.publishVideo(
        {
          text: videoMetadata.title || videoMetadata.description || '',
          media: [{ id: 'video-1', url: videoPath, type: MediaType.VIDEO, mimeType: 'video/mp4', size: 0 }],
        },
        videoMetadata
      );

      // Store platform post
      if (result.success) {
        await database.query(
          `INSERT INTO platform_posts
           (post_id, platform, platform_post_id, success, published_at)
           VALUES ($1, 'twitter', $2, true, NOW())`,
          [post.id, result.platformPostId]
        );
      }

      return {
        platform: 'twitter',
        success: result.success,
        platformPostId: result.platformPostId,
        details: result,
      };
    } catch (error: any) {
      logger.error('Twitter publish error:', error);
      return {
        platform: 'twitter',
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Publish video to Telegram channels
   */
  private async publishToTelegram(
    post: any,
    caption: string,
    channelIds: string[],
    userId: string,
    videoPath: string
  ): Promise<PlatformResult> {
    try {
      logger.info('Publishing to Telegram', {
        postId: post.id,
        channelsCount: channelIds.length,
      });

      // Get channels with user validation
      const channelsResult = await database.query(
        `SELECT * FROM telegram_channels
         WHERE id = ANY($1) AND user_id = $2 AND is_active = true`,
        [channelIds, userId]
      );

      if (channelsResult.rows.length === 0) {
        throw new Error('No valid Telegram channels found');
      }

      const channels = channelsResult.rows;

      // Upload video to Telegram first
      const uploadResult = await telegramBroadcastService.uploadVideoToTelegram(videoPath, {
        duration: post.video_duration,
        supportsStreaming: true,
      });

      if (!(uploadResult as any).success) {
        throw new Error('Failed to upload video to Telegram');
      }

      // Broadcast to all channels
      const broadcastResults = await telegramBroadcastService.broadcastVideo(
        uploadResult.fileId!,
        caption,
        channels,
        {
          parseMode: 'HTML',
        }
      );

      // Store broadcast record
      const successCount = broadcastResults.filter((r: any) => r.success).length;
      const failedCount = broadcastResults.filter((r: any) => !r.success).length;

      const broadcastId = await this.storeTelegramBroadcast(
        userId,
        post.id,
        uploadResult.fileId!,
        caption,
        channels.length,
        successCount,
        failedCount
      );

      // Store individual results
      for (const result of broadcastResults) {
        await this.storeTelegramBroadcastResult(broadcastId, result);
      }

      // Store platform posts for successful broadcasts
      for (const result of broadcastResults) {
        if (result.success) {
          await database.query(
            `INSERT INTO platform_posts
             (post_id, platform, platform_post_id, success, published_at)
             VALUES ($1, 'telegram', $2, true, NOW())`,
            [post.id, result.messageId]
          );
        }
      }

      return {
        platform: 'telegram',
        success: successCount > 0,
        details: {
          totalChannels: channels.length,
          successCount,
          failedCount,
          results: broadcastResults,
        },
      };
    } catch (error: any) {
      logger.error('Telegram publish error:', error);
      return {
        platform: 'telegram',
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Store Telegram broadcast record
   */
  private async storeTelegramBroadcast(
    userId: string,
    _postId: string,
    fileId: string,
    caption: string,
    totalChannels: number,
    successCount: number,
    failedCount: number
  ): Promise<string> {
    const result = await database.query(
      `INSERT INTO telegram_broadcasts
       (user_id, file_id, caption, broadcast_type, total_channels, successful_channels, failed_channels, created_at)
       VALUES ($1, $2, $3, 'video', $4, $5, $6, NOW())
       RETURNING id`,
      [userId, fileId, caption, totalChannels, successCount, failedCount]
    );

    return result.rows[0].id;
  }

  /**
   * Store Telegram broadcast result
   */
  private async storeTelegramBroadcastResult(
    broadcastId: string,
    result: any
  ): Promise<void> {
    await database.query(
      `INSERT INTO telegram_broadcast_results
       (broadcast_id, channel_id, success, message_id, error_message, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [
        broadcastId,
        result.channelId,
        result.success,
        result.messageId || null,
        result.error || null,
      ]
    );
  }

  /**
   * Convert media URL to filesystem path
   */
  private getVideoFilePath(mediaUrl: string): string {
    // Remove leading slash if present
    const cleanUrl = mediaUrl.startsWith('/') ? mediaUrl.substring(1) : mediaUrl;

    // Convert to absolute path
    return path.join(process.cwd(), cleanUrl);
  }

  /**
   * Get publish status for a post
   */
  public async getPublishStatus(postId: string, userId: string): Promise<any> {
    try {
      // Get post
      const postResult = await database.query(
        `SELECT * FROM posts WHERE id = $1 AND user_id = $2`,
        [postId, userId]
      );

      if (postResult.rows.length === 0) {
        throw new Error('Post not found');
      }

      const post = postResult.rows[0];

      // Get platform posts
      const platformPostsResult = await database.query(
        `SELECT * FROM platform_posts WHERE post_id = $1 ORDER BY published_at DESC`,
        [postId]
      );

      // Get Telegram broadcast details if applicable
      let telegramDetails = null;
      if (post.platforms?.includes('telegram')) {
        const broadcastResult = await database.query(
          `SELECT b.*,
                  COUNT(br.id) as total_results,
                  SUM(CASE WHEN br.success THEN 1 ELSE 0 END) as successful
           FROM telegram_broadcasts b
           LEFT JOIN telegram_broadcast_results br ON br.broadcast_id = b.id
           WHERE b.user_id = $1
           AND b.created_at >= (SELECT published_at FROM posts WHERE id = $2)
           GROUP BY b.id
           ORDER BY b.created_at DESC
           LIMIT 1`,
          [userId, postId]
        );

        if (broadcastResult.rows.length > 0) {
          telegramDetails = broadcastResult.rows[0];
        }
      }

      return {
        post: {
          id: post.id,
          status: post.status,
          platforms: post.platforms,
          publishedAt: post.published_at,
        },
        platformPosts: platformPostsResult.rows,
        telegramDetails,
      };
    } catch (error: any) {
      logger.error('Get publish status error:', error);
      throw error;
    }
  }
}

export const multiPlatformPublishService = new MultiPlatformPublishService();
