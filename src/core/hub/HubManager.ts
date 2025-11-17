import { Post, Platform, PostStatus } from '../content/types';
import { postQueue, metricsQueue } from '../../jobs/queue';
import { logger } from '../../utils/logger';
import database from '../../database/connection';
import { EncryptionService } from '../../utils/encryption';

export class HubManager {
  /**
   * Schedules a post to be published on multiple platforms
   */
  async schedulePost(post: Post, userId: string): Promise<string> {
    try {
      // Store post in database
      const result = await database.query(
        `INSERT INTO posts (id, user_id, platforms, content, scheduled_at, status, recurrence, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [
          post.id,
          userId,
          post.platforms,
          JSON.stringify(post.content),
          post.scheduledAt,
          post.status,
          post.recurrence ? JSON.stringify(post.recurrence) : null,
          post.metadata ? JSON.stringify(post.metadata) : null,
        ]
      );

      const postId = result.rows[0].id;

      // Get user's platform credentials
      const credentialsResult = await database.query(
        `SELECT platform, credentials FROM platform_credentials
         WHERE user_id = $1 AND is_active = true`,
        [userId]
      );

      const credentialsMap = new Map<string, Record<string, string>>();
      for (const row of credentialsResult.rows) {
        const decrypted = EncryptionService.decrypt(row.credentials);
        credentialsMap.set(row.platform, JSON.parse(decrypted));
      }

      // Schedule jobs for each platform
      for (const platform of post.platforms) {
        const credentials = credentialsMap.get(platform);
        if (!credentials) {
          logger.warn(`No credentials found for ${platform}, skipping`);
          continue;
        }

        const delay = post.scheduledAt
          ? post.scheduledAt.getTime() - Date.now()
          : 0;

        await postQueue.add(
          `publish-${platform}`,
          {
            postId,
            platform,
            content: post.content,
            credentials,
          },
          {
            delay: Math.max(delay, 0),
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
          }
        );

        logger.info(`Scheduled post ${postId} for ${platform} with delay ${delay}ms`);
      }

      // Update post status
      await database.query(
        `UPDATE posts SET status = $1 WHERE id = $2`,
        [PostStatus.SCHEDULED, postId]
      );

      return postId;
    } catch (error) {
      logger.error('Failed to schedule post:', error);
      throw error;
    }
  }

  /**
   * Cancels a scheduled post
   */
  async cancelPost(postId: string): Promise<void> {
    try {
      // Remove jobs from queue
      const jobs = await postQueue.getJobs(['waiting', 'delayed']);
      for (const job of jobs) {
        if (job.data.postId === postId) {
          await job.remove();
        }
      }

      // Update post status
      await database.query(
        `UPDATE posts SET status = $1 WHERE id = $2`,
        [PostStatus.CANCELLED, postId]
      );

      logger.info(`Cancelled post ${postId}`);
    } catch (error) {
      logger.error('Failed to cancel post:', error);
      throw error;
    }
  }

  /**
   * Schedules metrics collection for published posts
   */
  async scheduleMetricsCollection(platformPostId: string, platform: Platform): Promise<void> {
    try {
      // Get credentials for metrics collection
      const result = await database.query(
        `SELECT pp.platform_post_id, pc.credentials, p.user_id
         FROM platform_posts pp
         JOIN posts p ON pp.post_id = p.id
         JOIN platform_credentials pc ON p.user_id = pc.user_id AND pc.platform = pp.platform
         WHERE pp.id = $1`,
        [platformPostId]
      );

      if (result.rows.length === 0) {
        logger.warn(`No data found for platform post ${platformPostId}`);
        return;
      }

      const row = result.rows[0];
      const credentials = JSON.parse(EncryptionService.decrypt(row.credentials));

      // Schedule metrics collection at intervals (1 hour, 6 hours, 24 hours)
      const intervals = [3600000, 21600000, 86400000]; // milliseconds

      for (const delay of intervals) {
        await metricsQueue.add(
          `metrics-${platform}`,
          {
            platformPostId,
            platform,
            platformSpecificPostId: row.platform_post_id,
            credentials,
          },
          { delay }
        );
      }

      logger.info(`Scheduled metrics collection for platform post ${platformPostId}`);
    } catch (error) {
      logger.error('Failed to schedule metrics collection:', error);
      throw error;
    }
  }

  /**
   * Gets post status
   */
  async getPostStatus(postId: string): Promise<Post | null> {
    try {
      const result = await database.query(
        `SELECT * FROM posts WHERE id = $1`,
        [postId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        userId: row.user_id,
        platforms: row.platforms,
        content: row.content,
        scheduledAt: row.scheduled_at,
        publishedAt: row.published_at,
        status: row.status,
        recurrence: row.recurrence,
        metadata: row.metadata,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (error) {
      logger.error('Failed to get post status:', error);
      throw error;
    }
  }
}

export default HubManager;
