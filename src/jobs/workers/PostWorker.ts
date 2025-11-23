import { Worker, Job } from 'bullmq';
import { Platform, PostContent } from '../../core/content/types';
import { PlatformFactory } from '../../platforms';
import { ContentAdapter } from '../../core/content/ContentAdapter';
import { MediaProcessor } from '../../core/content/MediaProcessor';
import { PublishResult } from '../../platforms/base/PlatformAdapter';
import { logger } from '../../utils/logger';
import { config } from '../../config';
import database from '../../database/connection';
import { notificationService } from '../../services/NotificationService';

const connection = {
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password || undefined,
};

interface PostJobData {
  postId: string;
  platform: Platform;
  content: PostContent;
  credentials: Record<string, string>;
  userId: string;
}

export class PostWorker {
  private worker: Worker;

  constructor() {
    this.worker = new Worker('posts', this.processJob.bind(this), {
      connection,
      concurrency: 5,
    });

    this.worker.on('completed', job => {
      logger.info(`Post job ${job.id} completed`);
    });

    this.worker.on('failed', (job, err) => {
      logger.error(`Post job ${job?.id} failed:`, err);
    });
  }

  private async processJob(job: Job<PostJobData>) {
    const { postId, platform, content, credentials, userId } = job.data;
    const startTime = Date.now();

    try {
      logger.info(`Processing post ${postId} for ${platform}`);

      // Create and initialize platform adapter
      const adapter = PlatformFactory.createAdapter(platform);
      await adapter.initialize(credentials);

      // Adapt content for platform
      const adaptedContent = await ContentAdapter.adaptContent(content, platform);

      // Process media if present
      if (adaptedContent.media && adaptedContent.media.length > 0) {
        for (const media of adaptedContent.media) {
          if (media.type === 'image' && media.buffer) {
            const optimized = await MediaProcessor.optimizeImage(media.buffer, platform);
            media.buffer = optimized.buffer;
          }
        }
      }

      // Publish to platform
      const result = await adapter.publish(adaptedContent);

      // Record result in database
      await this.recordPublishResult(postId, platform, result);

      // Send notification
      await this.sendNotification(postId, platform, userId, result);

      const duration = Date.now() - startTime;
      await this.recordJobMetrics(job.id || '', platform, 'success', duration);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Send failure notification
      await this.sendFailureNotification(postId, platform, userId, errorMessage);

      await this.recordJobMetrics(job.id || '', platform, 'failure', duration, errorMessage);
      throw error;
    }
  }

  private async recordPublishResult(
    postId: string,
    platform: Platform,
    result: PublishResult
  ): Promise<void> {
    try {
      await database.query(
        `INSERT INTO platform_posts (post_id, platform, platform_post_id, success, error, published_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          postId,
          platform,
          result.platformPostId || '',
          result.success,
          result.error || null,
          result.publishedAt,
        ]
      );

      if (result.success) {
        await database.query(
          `UPDATE posts SET status = 'published', published_at = $1 WHERE id = $2`,
          [result.publishedAt, postId]
        );
      } else {
        await database.query(`UPDATE posts SET status = 'failed' WHERE id = $1`, [postId]);
      }
    } catch (error) {
      logger.error('Failed to record publish result:', error);
    }
  }

  private async recordJobMetrics(
    jobId: string,
    platform: Platform,
    status: 'success' | 'failure',
    duration: number,
    error?: string
  ): Promise<void> {
    try {
      await database.query(
        `INSERT INTO job_metrics (job_id, platform, status, duration, error, timestamp)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
        [jobId, platform, status, duration, error || null]
      );
    } catch (error) {
      logger.error('Failed to record job metrics:', error);
    }
  }

  /**
   * Get user's notification configuration
   */
  private async getNotificationConfig(userId: string): Promise<any> {
    try {
      const result = await database.query(
        `SELECT notification_config FROM users WHERE id = $1`,
        [userId]
      );

      if (result.rows.length > 0 && result.rows[0].notification_config) {
        return result.rows[0].notification_config;
      }

      // Return default configuration (notifications disabled)
      return {
        enabled: false,
        telegramChatId: null,
        webhookUrl: null,
      };
    } catch (error) {
      logger.error('Failed to get notification config:', error);
      return { enabled: false };
    }
  }

  /**
   * Send notification for successful post
   */
  private async sendNotification(
    postId: string,
    platform: Platform,
    userId: string,
    result: PublishResult
  ): Promise<void> {
    try {
      const config = await this.getNotificationConfig(userId);

      if (!config.enabled) {
        return;
      }

      if (result.success) {
        await notificationService.notifySuccess(postId, platform, userId, {
          telegramChatId: config.telegramChatId,
          webhookUrl: config.webhookUrl,
        });
      } else {
        await notificationService.notifyFailure(
          postId,
          platform,
          result.error || 'Unknown error',
          userId,
          {
            telegramChatId: config.telegramChatId,
            webhookUrl: config.webhookUrl,
          }
        );
      }
    } catch (error) {
      logger.error('Failed to send notification:', error);
      // Don't throw - notifications are non-critical
    }
  }

  /**
   * Send failure notification
   */
  private async sendFailureNotification(
    postId: string,
    platform: Platform,
    userId: string,
    error: string
  ): Promise<void> {
    try {
      const config = await this.getNotificationConfig(userId);

      if (!config.enabled) {
        return;
      }

      await notificationService.notifyFailure(postId, platform, error, userId, {
        telegramChatId: config.telegramChatId,
        webhookUrl: config.webhookUrl,
      });
    } catch (err) {
      logger.error('Failed to send failure notification:', err);
      // Don't throw - notifications are non-critical
    }
  }

  async close() {
    await this.worker.close();
    logger.info('Post worker closed');
  }
}

export default PostWorker;
