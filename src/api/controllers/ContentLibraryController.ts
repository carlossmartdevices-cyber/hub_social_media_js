import { Request, Response } from 'express';
import database from '../../database/connection';
import logger from '../../utils/logger';
import aiContentGenerationService from '../../services/AIContentGenerationService';

interface AuthRequest extends Request {
  user?: { id: string; email: string };
}

export class ContentLibraryController {
  /**
   * Generate content with AI and save to library
   * POST /api/library/generate
   */
  generateAndSave = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { prompt, title, mediaUrl, mediaType } = req.body;

      if (!prompt) {
        res.status(400).json({ error: 'Prompt is required' });
        return;
      }

      // Generate content with PNP Prime (always default)
      const result = await aiContentGenerationService.generatePostVariants(
        title || prompt,
        prompt,
        'Create engaging content for PNP Latino TV',
        'Latino PNP community',
        'pnp_prime'
      );

      // Save to library
      const query = `
        INSERT INTO content_library
        (user_id, title, content_en, content_es, hashtags_en, hashtags_es, cta_en, cta_es, media_url, media_type, ai_prompt, ai_tone, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pnp_prime', 'draft')
        RETURNING *
      `;

      const values = [
        userId,
        title || prompt.substring(0, 100),
        result.english.content,
        result.spanish.content,
        result.english.hashtags,
        result.spanish.hashtags,
        result.english.cta || '',
        result.spanish.cta || '',
        mediaUrl || null,
        mediaType || 'none',
        prompt
      ];

      const { rows } = await database.query(query, values);

      logger.info('Content saved to library', { contentId: rows[0].id, userId });

      res.status(201).json({
        success: true,
        content: rows[0],
        generated: result
      });
    } catch (error: any) {
      logger.error('Error generating and saving content:', error);
      res.status(500).json({ error: 'Failed to generate content', details: error.message });
    }
  };

  /**
   * Get all content from library
   * GET /api/library
   */
  getAll = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { status, limit = 50, offset = 0 } = req.query;

      let query = `
        SELECT cl.*,
          (SELECT COUNT(*) FROM content_posts cp WHERE cp.content_id = cl.id AND cp.status = 'posted') as post_count,
          (SELECT COUNT(*) FROM content_posts cp WHERE cp.content_id = cl.id AND cp.status = 'scheduled') as scheduled_count
        FROM content_library cl
        WHERE cl.user_id = $1
      `;
      const values: any[] = [userId];

      if (status) {
        query += ` AND cl.status = $${values.length + 1}`;
        values.push(status);
      }

      query += ` ORDER BY cl.created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
      values.push(limit, offset);

      const { rows } = await database.query(query, values);

      // Get total count
      const countQuery = `SELECT COUNT(*) FROM content_library WHERE user_id = $1${status ? ' AND status = $2' : ''}`;
      const countValues = status ? [userId, status] : [userId];
      const { rows: countRows } = await database.query(countQuery, countValues);

      res.json({
        content: rows,
        total: parseInt(countRows[0].count),
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });
    } catch (error: any) {
      logger.error('Error fetching content library:', error);
      res.status(500).json({ error: 'Failed to fetch content library' });
    }
  };

  /**
   * Get single content item
   * GET /api/library/:id
   */
  getOne = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const query = `
        SELECT cl.*,
          COALESCE(
            (SELECT json_agg(cp.*) FROM content_posts cp WHERE cp.content_id = cl.id),
            '[]'::json
          ) as posts
        FROM content_library cl
        WHERE cl.id = $1 AND cl.user_id = $2
      `;

      const { rows } = await database.query(query, [id, userId]);

      if (rows.length === 0) {
        res.status(404).json({ error: 'Content not found' });
        return;
      }

      res.json(rows[0]);
    } catch (error: any) {
      logger.error('Error fetching content:', error);
      res.status(500).json({ error: 'Failed to fetch content' });
    }
  };

  /**
   * Update content in library
   * PUT /api/library/:id
   */
  update = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const { title, content_en, content_es, hashtags_en, hashtags_es, status } = req.body;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const query = `
        UPDATE content_library
        SET
          title = COALESCE($3, title),
          content_en = COALESCE($4, content_en),
          content_es = COALESCE($5, content_es),
          hashtags_en = COALESCE($6, hashtags_en),
          hashtags_es = COALESCE($7, hashtags_es),
          status = COALESCE($8, status),
          updated_at = NOW()
        WHERE id = $1 AND user_id = $2
        RETURNING *
      `;

      const { rows } = await database.query(query, [
        id, userId, title, content_en, content_es, hashtags_en, hashtags_es, status
      ]);

      if (rows.length === 0) {
        res.status(404).json({ error: 'Content not found' });
        return;
      }

      res.json(rows[0]);
    } catch (error: any) {
      logger.error('Error updating content:', error);
      res.status(500).json({ error: 'Failed to update content' });
    }
  };

  /**
   * Delete content from library
   * DELETE /api/library/:id
   */
  delete = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { rowCount } = await database.query(
        'DELETE FROM content_library WHERE id = $1 AND user_id = $2',
        [id, userId]
      );

      if (rowCount === 0) {
        res.status(404).json({ error: 'Content not found' });
        return;
      }

      res.json({ success: true, message: 'Content deleted' });
    } catch (error: any) {
      logger.error('Error deleting content:', error);
      res.status(500).json({ error: 'Failed to delete content' });
    }
  };

  /**
   * Post content to a platform
   * POST /api/library/:id/post
   */
  postToPlatform = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const { platform, language = 'en', scheduledAt } = req.body;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (!platform) {
        res.status(400).json({ error: 'Platform is required' });
        return;
      }

      // Get content from library
      const { rows: contentRows } = await database.query(
        'SELECT * FROM content_library WHERE id = $1 AND user_id = $2',
        [id, userId]
      );

      if (contentRows.length === 0) {
        res.status(404).json({ error: 'Content not found' });
        return;
      }

      const content = contentRows[0];
      const postContent = language === 'es' ? content.content_es : content.content_en;
      const hashtags = language === 'es' ? content.hashtags_es : content.hashtags_en;

      // Create content_posts record
      const status = scheduledAt ? 'scheduled' : 'pending';
      const insertQuery = `
        INSERT INTO content_posts
        (content_id, user_id, platform, language, scheduled_at, status)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;

      const { rows: postRows } = await database.query(insertQuery, [
        id, userId, platform, language, scheduledAt || null, status
      ]);

      // If not scheduled, post immediately
      if (!scheduledAt) {
        // TODO: Implement actual posting to platform
        // For now, just mark as posted
        await database.query(
          'UPDATE content_posts SET status = $1, posted_at = NOW() WHERE id = $2',
          ['posted', postRows[0].id]
        );

        // Update library item status
        await database.query(
          'UPDATE content_library SET status = $1 WHERE id = $2',
          ['posted', id]
        );
      }

      logger.info('Content posted/scheduled', {
        contentId: id,
        platform,
        status,
        postId: postRows[0].id
      });

      res.json({
        success: true,
        post: postRows[0],
        content: postContent,
        hashtags
      });
    } catch (error: any) {
      logger.error('Error posting content:', error);
      res.status(500).json({ error: 'Failed to post content', details: error.message });
    }
  };

  /**
   * Regenerate content for an existing library item
   * POST /api/library/:id/regenerate
   */
  regenerate = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const { language } = req.body; // Optional: 'en' or 'es' to regenerate only one

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Get existing content
      const { rows } = await database.query(
        'SELECT * FROM content_library WHERE id = $1 AND user_id = $2',
        [id, userId]
      );

      if (rows.length === 0) {
        res.status(404).json({ error: 'Content not found' });
        return;
      }

      const existing = rows[0];

      // If specific language requested, use generateCaption for single language
      if (language === 'en' || language === 'es') {
        const result = await aiContentGenerationService.generateCaption(
          existing.ai_prompt,
          {
            platform: 'twitter',
            tone: 'pnp_prime',
            includeHashtags: true,
            includeEmojis: true,
            language
          }
        );

        const updateField = language === 'en' ? 'content_en' : 'content_es';
        const hashtagField = language === 'en' ? 'hashtags_en' : 'hashtags_es';

        const updateQuery = `
          UPDATE content_library
          SET
            ${updateField} = $3,
            ${hashtagField} = $4,
            updated_at = NOW()
          WHERE id = $1 AND user_id = $2
          RETURNING *
        `;

        const { rows: updatedRows } = await database.query(updateQuery, [
          id,
          userId,
          result.caption,
          result.hashtags
        ]);

        res.json({
          success: true,
          content: updatedRows[0],
          language,
          generated: result
        });
        return;
      }

      // Regenerate both with PNP Prime
      const result = await aiContentGenerationService.generatePostVariants(
        existing.title || existing.ai_prompt,
        existing.ai_prompt,
        'Create engaging content for PNP Latino TV',
        'Latino PNP community',
        'pnp_prime'
      );

      // Update in library
      const updateQuery = `
        UPDATE content_library
        SET
          content_en = $3,
          content_es = $4,
          hashtags_en = $5,
          hashtags_es = $6,
          cta_en = $7,
          cta_es = $8,
          updated_at = NOW()
        WHERE id = $1 AND user_id = $2
        RETURNING *
      `;

      const { rows: updatedRows } = await database.query(updateQuery, [
        id,
        userId,
        result.english.content,
        result.spanish.content,
        result.english.hashtags,
        result.spanish.hashtags,
        result.english.cta || '',
        result.spanish.cta || ''
      ]);

      res.json({
        success: true,
        content: updatedRows[0],
        generated: result
      });
    } catch (error: any) {
      logger.error('Error regenerating content:', error);
      res.status(500).json({ error: 'Failed to regenerate content' });
    }
  };
}

export const contentLibraryController = new ContentLibraryController();
