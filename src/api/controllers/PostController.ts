import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import { AuthRequest } from '../middlewares/auth';
import { HubManager } from '../../core/hub/HubManager';
import { Post, PostStatus, Platform, Language, MediaFile, MediaType } from '../../core/content/types';
import { logger } from '../../utils/logger';
import { ValidationService } from '../../utils/validation';
import database from '../../database/connection';
import { aiContentService } from '../../services/AIContentService';
import { config } from '../../config';

const hubManager = new HubManager();

export class PostController {
  /**
   * Helper method to process uploaded media files
   */
  private async processUploadedFiles(files: Express.Multer.File[]): Promise<MediaFile[]> {
    const mediaFiles: MediaFile[] = [];

    for (const file of files) {
      const stats = await fs.stat(file.path);

      // Determine media type based on mimetype
      let mediaType: MediaType;
      if (file.mimetype.startsWith('image/')) {
        mediaType = MediaType.IMAGE;
      } else if (file.mimetype.startsWith('video/')) {
        mediaType = MediaType.VIDEO;
      } else {
        mediaType = MediaType.DOCUMENT;
      }

      // Create relative URL path for the file
      const relativePath = path.relative(config.media.storagePath, file.path);
      const url = `/uploads/${relativePath.replace(/\\/g, '/')}`;

      mediaFiles.push({
        id: uuidv4(),
        type: mediaType,
        url,
        mimeType: file.mimetype,
        size: stats.size,
      });
    }

    return mediaFiles;
  }

  async createPost(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.id;
      const files = req.files as Express.Multer.File[] || [];

      // Parse JSON data from multipart form
      let platforms: string[];
      let content: any;
      let scheduledAt: string | undefined;
      let recurrence: any;

      try {
        platforms = typeof req.body.platforms === 'string'
          ? JSON.parse(req.body.platforms)
          : req.body.platforms;
        content = typeof req.body.content === 'string'
          ? JSON.parse(req.body.content)
          : req.body.content;
        scheduledAt = req.body.scheduledAt;
        recurrence = req.body.recurrence ?
          (typeof req.body.recurrence === 'string' ? JSON.parse(req.body.recurrence) : req.body.recurrence)
          : undefined;
      } catch (parseError) {
        return res.status(400).json({ error: 'Invalid JSON in request body' });
      }

      // Validate platforms
      if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
        return res.status(400).json({ error: 'At least one platform is required' });
      }

      for (const platform of platforms) {
        if (!ValidationService.isValidPlatform(platform)) {
          return res.status(400).json({ error: `Invalid platform: ${platform}` });
        }
      }

      // Process uploaded media files
      if (files.length > 0) {
        const mediaFiles = await this.processUploadedFiles(files);
        content.media = mediaFiles;
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

      logger.info(`Post created and scheduled: ${postId}`, {
        mediaCount: files.length,
        platforms: platforms.length,
      });

      return res.status(201).json({
        message: 'Post scheduled successfully',
        postId,
      });
    } catch (error) {
      logger.error('Create post error:', error);
      return res.status(500).json({ error: 'Failed to create post' });
    }
  }

  /**
   * Publish post immediately without scheduling
   * POST /api/posts/publish-now
   *
   * Request body (FormData):
   * {
   *   "platforms": ["twitter", "telegram"],
   *   "content": { "text": "...", "hashtags": [...], "link": "..." }
   *   "media": [file1, file2, ...]  // Optional files
   * }
   */
  async publishNow(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.id;
      const files = req.files as Express.Multer.File[] || [];

      // Parse JSON data from multipart form
      let platforms: string[];
      let content: any;

      try {
        platforms = typeof req.body.platforms === 'string'
          ? JSON.parse(req.body.platforms)
          : req.body.platforms;
        content = typeof req.body.content === 'string'
          ? JSON.parse(req.body.content)
          : req.body.content;
      } catch (parseError) {
        return res.status(400).json({ error: 'Invalid JSON in request body' });
      }

      // Validate platforms
      if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
        return res.status(400).json({ error: 'At least one platform is required' });
      }

      for (const platform of platforms) {
        if (!ValidationService.isValidPlatform(platform)) {
          return res.status(400).json({ error: `Invalid platform: ${platform}` });
        }
      }

      // Process uploaded media files
      if (files.length > 0) {
        const mediaFiles = await this.processUploadedFiles(files);
        content.media = mediaFiles;
      }

      // Validate content
      const contentValidation = ValidationService.validatePostContent(content);
      if (!contentValidation.valid) {
        return res.status(400).json({ errors: contentValidation.errors });
      }

      // Create post object with immediate scheduling
      const post: Post = {
        id: uuidv4(),
        userId,
        platforms: platforms as Platform[],
        content,
        scheduledAt: new Date(), // Set to now for immediate publishing
        status: PostStatus.SCHEDULED,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Schedule post for immediate execution
      const postId = await hubManager.schedulePost(post, userId);

      logger.info(`Post published immediately: ${postId}`, {
        mediaCount: files.length,
        platforms: platforms.length,
      });

      return res.status(201).json({
        message: 'Post is being published now',
        postId,
        status: 'publishing',
      });
    } catch (error) {
      logger.error('Publish now error:', error);
      return res.status(500).json({ error: 'Failed to publish post' });
    }
  }

  async getPost(req: AuthRequest, res: Response): Promise<Response> {
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

      return res.json({ post: result.rows[0] });
    } catch (error) {
      logger.error('Get post error:', error);
      return res.status(500).json({ error: 'Failed to get post' });
    }
  }

  async listPosts(req: AuthRequest, res: Response): Promise<Response> {
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

      return res.json({
        posts: result.rows,
        total: result.rowCount,
      });
    } catch (error) {
      logger.error('List posts error:', error);
      return res.status(500).json({ error: 'Failed to list posts' });
    }
  }

  async cancelPost(req: AuthRequest, res: Response): Promise<Response> {
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

      return res.json({ message: 'Post cancelled successfully' });
    } catch (error) {
      logger.error('Cancel post error:', error);
      return res.status(500).json({ error: 'Failed to cancel post' });
    }
  }

  /**
   * Reschedule a post to a new date/time
   * PATCH /api/posts/:id/reschedule
   *
   * Request body:
   * {
   *   "scheduledAt": "2024-01-15T10:00:00Z"
   * }
   */
  async reschedulePost(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { scheduledAt } = req.body;
      const userId = req.user!.id;

      if (!scheduledAt) {
        return res.status(400).json({ error: 'scheduledAt is required' });
      }

      // Verify ownership and get current post
      const postResult = await database.query(
        'SELECT * FROM posts WHERE id = $1 AND user_id = $2',
        [id, userId]
      );

      if (postResult.rows.length === 0) {
        return res.status(404).json({ error: 'Post not found' });
      }

      const post = postResult.rows[0];

      // Only allow rescheduling of scheduled or draft posts
      if (!['scheduled', 'draft'].includes(post.status)) {
        return res.status(400).json({
          error: `Cannot reschedule ${post.status} posts. Only scheduled or draft posts can be rescheduled.`,
        });
      }

      const newScheduledAt = new Date(scheduledAt);

      // Validate date is in the future
      if (newScheduledAt <= new Date()) {
        return res.status(400).json({
          error: 'Scheduled time must be in the future',
        });
      }

      // Update the scheduled time
      await database.query(
        'UPDATE posts SET scheduled_at = $1, updated_at = NOW() WHERE id = $2',
        [newScheduledAt, id]
      );

      logger.info(`Post ${id} rescheduled to ${newScheduledAt.toISOString()}`);

      return res.json({
        message: 'Post rescheduled successfully',
        scheduledAt: newScheduledAt,
      });
    } catch (error) {
      logger.error('Reschedule post error:', error);
      return res.status(500).json({ error: 'Failed to reschedule post' });
    }
  }

  async getMetrics(req: AuthRequest, res: Response): Promise<Response> {
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

      return res.json({ metrics: metricsResult.rows });
    } catch (error) {
      logger.error('Get metrics error:', error);
      return res.status(500).json({ error: 'Failed to get metrics' });
    }
  }

  /**
   * Get aggregated analytics metrics
   * GET /api/posts/analytics/metrics?range=30days
   */
  async getAnalyticsMetrics(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.id;
      const range = req.query.range || '30days';

      // Calculate date range
      const days = range === '7days' ? 7 : range === '30days' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Engagement by Platform
      const engagementByPlatform = await database.query(
        `SELECT
          pp.platform,
          SUM(COALESCE(pm.likes, 0)) as total_likes,
          SUM(COALESCE(pm.shares, 0)) as total_shares,
          SUM(COALESCE(pm.comments, 0)) as total_comments,
          AVG(COALESCE(pm.engagement, 0)) as avg_engagement
        FROM posts p
        LEFT JOIN platform_posts pp ON p.id = pp.post_id
        LEFT JOIN platform_metrics pm ON pp.id = pm.platform_post_id
        WHERE p.user_id = $1
          AND p.published_at >= $2
          AND p.status = 'published'
        GROUP BY pp.platform
        ORDER BY avg_engagement DESC`,
        [userId, startDate]
      );

      // Engagement Over Time
      const engagementOverTime = await database.query(
        `SELECT
          DATE(p.published_at) as date,
          AVG(COALESCE(pm.engagement, 0)) as engagement
        FROM posts p
        LEFT JOIN platform_posts pp ON p.id = pp.post_id
        LEFT JOIN platform_metrics pm ON pp.id = pm.platform_post_id
        WHERE p.user_id = $1
          AND p.published_at >= $2
          AND p.status = 'published'
        GROUP BY DATE(p.published_at)
        ORDER BY date ASC`,
        [userId, startDate]
      );

      // Posts by Status
      const postsByStatus = await database.query(
        `SELECT
          status,
          COUNT(*) as count
        FROM posts
        WHERE user_id = $1
          AND created_at >= $2
        GROUP BY status
        ORDER BY count DESC`,
        [userId, startDate]
      );

      // Top Performing Posts
      const topPerformingPosts = await database.query(
        `SELECT
          p.id,
          p.content->>'text' as text,
          pp.platform,
          COALESCE(pm.engagement, 0) as engagement,
          COALESCE(pm.likes, 0) as likes,
          COALESCE(pm.shares, 0) as shares,
          COALESCE(pm.comments, 0) as comments
        FROM posts p
        LEFT JOIN platform_posts pp ON p.id = pp.post_id
        LEFT JOIN platform_metrics pm ON pp.id = pm.platform_post_id
        WHERE p.user_id = $1
          AND p.published_at >= $2
          AND p.status = 'published'
        ORDER BY pm.engagement DESC NULLS LAST
        LIMIT 10`,
        [userId, startDate]
      );

      return res.json({
        engagementByPlatform: engagementByPlatform.rows.map(row => ({
          platform: row.platform,
          totalLikes: parseInt(row.total_likes || 0),
          totalShares: parseInt(row.total_shares || 0),
          totalComments: parseInt(row.total_comments || 0),
          avgEngagement: parseFloat(row.avg_engagement || 0),
        })),
        engagementOverTime: engagementOverTime.rows.map(row => ({
          date: row.date,
          engagement: parseFloat(row.engagement || 0),
        })),
        postsByStatus: postsByStatus.rows.map(row => ({
          status: row.status,
          count: parseInt(row.count),
        })),
        topPerformingPosts: topPerformingPosts.rows.map(row => ({
          id: row.id,
          text: row.text?.substring(0, 100) || '',
          platform: row.platform,
          engagement: parseFloat(row.engagement || 0),
          likes: parseInt(row.likes || 0),
          shares: parseInt(row.shares || 0),
          comments: parseInt(row.comments || 0),
        })),
      });
    } catch (error) {
      logger.error('Get analytics metrics error:', error);
      return res.status(500).json({ error: 'Failed to get analytics metrics' });
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
  async generateAIContent(req: AuthRequest, res: Response): Promise<Response> {
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

      return res.json({
        message: 'AI content generated successfully',
        content,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('AI content generation error:', error);
      return res.status(500).json({
        error: 'Failed to generate AI content',
        message: errorMessage,
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
  async generateSingleAIPost(req: AuthRequest, res: Response): Promise<Response> {
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

      return res.json({
        message: 'AI post generated successfully',
        content: postContent,
        platform,
        language,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Single AI post generation error:', error);
      return res.status(500).json({
        error: 'Failed to generate AI post',
        message: errorMessage,
      });
    }
  }

  /**
   * Bulk delete posts based on time period
   *
   * DELETE /api/posts/bulk-delete
   *
   * Request body:
   * {
   *   "period": "24h" | "7d" | "30d" | "all",
   *   "platform": "twitter" // Optional: filter by platform
   * }
   */
  async bulkDelete(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.id;
      const { period, platform } = req.body;

      if (!period) {
        return res.status(400).json({ error: 'Period is required' });
      }

      const validPeriods = ['24h', '7d', '30d', 'all'];
      if (!validPeriods.includes(period)) {
        return res.status(400).json({
          error: `Invalid period. Must be one of: ${validPeriods.join(', ')}`
        });
      }

      // Calculate date threshold based on period
      let dateThreshold: Date | null = null;
      if (period !== 'all') {
        dateThreshold = new Date();
        switch (period) {
          case '24h':
            dateThreshold.setHours(dateThreshold.getHours() - 24);
            break;
          case '7d':
            dateThreshold.setDate(dateThreshold.getDate() - 7);
            break;
          case '30d':
            dateThreshold.setDate(dateThreshold.getDate() - 30);
            break;
        }
      }

      // Build query
      let query = 'DELETE FROM posts WHERE user_id = $1';
      const params: any[] = [userId];
      let paramCount = 1;

      if (dateThreshold) {
        paramCount++;
        query += ` AND created_at >= $${paramCount}`;
        params.push(dateThreshold);
      }

      if (platform) {
        if (!ValidationService.isValidPlatform(platform)) {
          return res.status(400).json({ error: `Invalid platform: ${platform}` });
        }
        paramCount++;
        query += ` AND $${paramCount} = ANY(platforms)`;
        params.push(platform);
      }

      query += ' RETURNING id';

      const result = await database.query(query, params);
      const deletedCount = result.rowCount || 0;

      logger.info('Bulk delete posts', {
        userId,
        period,
        platform: platform || 'all',
        deletedCount,
      });

      return res.json({
        message: `Successfully deleted ${deletedCount} post(s)`,
        deletedCount,
        period,
        platform: platform || 'all',
      });
    } catch (error) {
      logger.error('Bulk delete posts error:', error);
      return res.status(500).json({ error: 'Failed to delete posts' });
    }
  }
}

export default new PostController();
