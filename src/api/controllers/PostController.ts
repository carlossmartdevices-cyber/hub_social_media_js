import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest } from '../middlewares/auth';
import { HubManager } from '../../core/hub/HubManager';
import { Post, PostStatus, Platform } from '../../core/content/types';
import { logger } from '../../utils/logger';
import { ValidationService } from '../../utils/validation';
import database from '../../database/connection';

const hubManager = new HubManager();

export class PostController {
  async createPost(req: AuthRequest, res: Response) {
    try {
      const { platforms, content, scheduledAt, recurrence } = req.body;
      const userId = req.user!.id;

      // Validate platforms
      for (const platform of platforms) {
        if (!ValidationService.isValidPlatform(platform)) {
          return res.status(400).json({ error: `Invalid platform: ${platform}` });
        }
      }

      // Validate content
      const contentValidation = ValidationService.validatePostContent(content);
      if (!contentValidation.valid) {
        return res.status(400).json({ errors: contentValidation.errors });
      }

      // Create post object
      const post: Post = {
        id: uuidv4(),
        userId,
        platforms: platforms as Platform[],
        content,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
        status: PostStatus.DRAFT,
        recurrence: recurrence || undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Schedule post
      const postId = await hubManager.schedulePost(post, userId);

      logger.info(`Post created and scheduled: ${postId}`);

      res.status(201).json({
        message: 'Post scheduled successfully',
        postId,
      });
    } catch (error) {
      logger.error('Create post error:', error);
      res.status(500).json({ error: 'Failed to create post' });
    }
  }

  async getPost(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const result = await database.query(
        `SELECT p.*,
                COALESCE(
                  json_agg(
                    json_build_object(
                      'platform', pp.platform,
                      'platformPostId', pp.platform_post_id,
                      'success', pp.success,
                      'error', pp.error,
                      'publishedAt', pp.published_at
                    )
                  ) FILTER (WHERE pp.id IS NOT NULL),
                  '[]'
                ) as platform_results
         FROM posts p
         LEFT JOIN platform_posts pp ON p.id = pp.post_id
         WHERE p.id = $1 AND p.user_id = $2
         GROUP BY p.id`,
        [id, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Post not found' });
      }

      res.json({ post: result.rows[0] });
    } catch (error) {
      logger.error('Get post error:', error);
      res.status(500).json({ error: 'Failed to get post' });
    }
  }

  async listPosts(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { status, platform, limit = 50, offset = 0 } = req.query;

      let query = `SELECT * FROM posts WHERE user_id = $1`;
      const params: any[] = [userId];
      let paramCount = 1;

      if (status) {
        paramCount++;
        query += ` AND status = $${paramCount}`;
        params.push(status);
      }

      if (platform) {
        paramCount++;
        query += ` AND $${paramCount} = ANY(platforms)`;
        params.push(platform);
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      params.push(limit, offset);

      const result = await database.query(query, params);

      res.json({
        posts: result.rows,
        total: result.rowCount,
      });
    } catch (error) {
      logger.error('List posts error:', error);
      res.status(500).json({ error: 'Failed to list posts' });
    }
  }

  async cancelPost(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      // Verify ownership
      const result = await database.query(
        'SELECT id FROM posts WHERE id = $1 AND user_id = $2',
        [id, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Post not found' });
      }

      await hubManager.cancelPost(id);

      res.json({ message: 'Post cancelled successfully' });
    } catch (error) {
      logger.error('Cancel post error:', error);
      res.status(500).json({ error: 'Failed to cancel post' });
    }
  }

  async getMetrics(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      // Verify ownership
      const postResult = await database.query(
        'SELECT id FROM posts WHERE id = $1 AND user_id = $2',
        [id, userId]
      );

      if (postResult.rows.length === 0) {
        return res.status(404).json({ error: 'Post not found' });
      }

      // Get metrics
      const metricsResult = await database.query(
        `SELECT pm.*
         FROM platform_metrics pm
         JOIN platform_posts pp ON pm.platform_post_id = pp.id
         WHERE pp.post_id = $1
         ORDER BY pm.timestamp DESC`,
        [id]
      );

      res.json({ metrics: metricsResult.rows });
    } catch (error) {
      logger.error('Get metrics error:', error);
      res.status(500).json({ error: 'Failed to get metrics' });
    }
  }
}

export default new PostController();
