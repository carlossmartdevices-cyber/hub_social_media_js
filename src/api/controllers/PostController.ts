import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest } from '../middlewares/auth';
import { HubManager } from '../../core/hub/HubManager';
import { Post, PostStatus, Platform, Language } from '../../core/content/types';
import { logger } from '../../utils/logger';
import { ValidationService } from '../../utils/validation';
import database from '../../database/connection';
import { aiContentService } from '../../services/AIContentService';

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

  /**
   * Generate AI-powered social media posts using Grok
   *
   * POST /api/posts/ai/generate
   *
   * Request body:
   * {
   *   "optionsCount": 12,  // Number of posts per language (default: 12)
   *   "language": "en",     // Optional: "en" or "es" (default: both)
   *   "platform": "twitter", // Optional: target platform
   *   "customInstructions": "Additional context or requirements"
   * }
   */
  async generateAIContent(req: AuthRequest, res: Response) {
    try {
      // Check if AI service is available
      if (!aiContentService.isAvailable()) {
        return res.status(503).json({
          error: 'AI content generation is not available',
          message: 'Please configure XAI_API_KEY in environment variables',
        });
      }

      const {
        optionsCount = 12,
        language,
        platform,
        customInstructions,
      } = req.body;

      logger.info('Generating AI content', {
        userId: req.user!.id,
        optionsCount,
        language,
        platform,
      });

      // Validate platform if provided
      if (platform && !ValidationService.isValidPlatform(platform)) {
        return res.status(400).json({ error: `Invalid platform: ${platform}` });
      }

      // Generate content
      const content = await aiContentService.generatePosts({
        optionsCount,
        language: language as Language,
        platform: platform as Platform,
        customInstructions,
      });

      logger.info('AI content generated successfully', {
        userId: req.user!.id,
        englishPosts: content.english.length,
        spanishPosts: content.spanish.length,
      });

      res.json({
        message: 'AI content generated successfully',
        content,
      });
    } catch (error: any) {
      logger.error('AI content generation error:', error);
      res.status(500).json({
        error: 'Failed to generate AI content',
        message: error.message,
      });
    }
  }

  /**
   * Generate a single AI post for a specific platform and language
   *
   * POST /api/posts/ai/generate-single
   *
   * Request body:
   * {
   *   "platform": "twitter",  // Required
   *   "language": "en"        // Required: "en" or "es"
   * }
   */
  async generateSingleAIPost(req: AuthRequest, res: Response) {
    try {
      // Check if AI service is available
      if (!aiContentService.isAvailable()) {
        return res.status(503).json({
          error: 'AI content generation is not available',
          message: 'Please configure XAI_API_KEY in environment variables',
        });
      }

      const { platform, language = Language.ENGLISH } = req.body;

      if (!platform) {
        return res.status(400).json({ error: 'Platform is required' });
      }

      // Validate platform
      if (!ValidationService.isValidPlatform(platform)) {
        return res.status(400).json({ error: `Invalid platform: ${platform}` });
      }

      logger.info('Generating single AI post', {
        userId: req.user!.id,
        platform,
        language,
      });

      // Generate single post
      const postContent = await aiContentService.generateSinglePost(
        platform as Platform,
        language as Language
      );

      logger.info('Single AI post generated successfully', {
        userId: req.user!.id,
        platform,
        language,
      });

      res.json({
        message: 'AI post generated successfully',
        content: postContent,
        platform,
        language,
      });
    } catch (error: any) {
      logger.error('Single AI post generation error:', error);
      res.status(500).json({
        error: 'Failed to generate AI post',
        message: error.message,
      });
    }
  }
}

export default new PostController();
