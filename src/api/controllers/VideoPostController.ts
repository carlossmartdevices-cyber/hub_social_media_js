import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../utils/logger';
import database from '../../database/connection';
import { videoProcessingService } from '../../services/VideoProcessingService';
import { geoBlockingService } from '../../services/GeoBlockingService';
import { twitterVideoAdapter } from '../../platforms/twitter/TwitterVideoAdapter';
import { decryptCredentials } from '../../utils/encryption';
import multer from 'multer';
import path from 'path';

// Configure multer for video uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads/temp');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `video-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

export const videoUpload = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only video files are allowed.'));
    }
  },
});

/**
 * VideoPostController - Handle video post creation and management
 */
export class VideoPostController {
  /**
   * POST /api/video/upload
   * Upload and process video
   */
  async uploadVideo(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.id;
      const file = req.file;

      if (!file) {
        return res.status(400).json({
          success: false,
          error: 'No video file provided',
        });
      }

      const { title, description, platform = 'twitter', quality = 'medium' } = req.body;

      // Create post record
      const postId = uuidv4();

      // Process video
      logger.info('Processing uploaded video', {
        userId,
        postId,
        filename: file.filename,
        size: file.size,
      });

      const processedVideo = await videoProcessingService.processVideo(
        file.path,
        postId,
        {
          quality,
          generateThumbnail: true,
        }
      );

      // Store in database
      await database.query(
        `INSERT INTO posts
         (id, user_id, media_type, media_url, thumbnail_url, video_duration, video_size,
          processing_status, content, status, created_at, updated_at)
         VALUES ($1, $2, 'video', $3, $4, $5, $6, 'ready', $7, 'draft', NOW(), NOW())`,
        [
          postId,
          userId,
          processedVideo.url,
          processedVideo.thumbnailUrl,
          Math.round(processedVideo.metadata.duration),
          processedVideo.metadata.size,
          JSON.stringify({
            text: title,
            title,
            description,
          }),
        ]
      );

      logger.info('Video processed and stored successfully', {
        postId,
        compressionRatio: processedVideo.compressionRatio,
      });

      return res.json({
        success: true,
        post: {
          id: postId,
          url: processedVideo.url,
          thumbnailUrl: processedVideo.thumbnailUrl,
          metadata: processedVideo.metadata,
          compressionRatio: processedVideo.compressionRatio,
        },
        message: 'Video uploaded and processed successfully',
      });
    } catch (error: any) {
      logger.error('Video upload error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to upload video',
      });
    }
  }

  /**
   * PUT /api/video/:id/metadata
   * Update video metadata (title, description, geo-restrictions)
   */
  async updateVideoMetadata(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const { title, description, hashtags, cta, alt_text, geo_restrictions } = req.body;

      // Verify ownership
      const post = await database.query(
        `SELECT * FROM posts WHERE id = $1 AND user_id = $2`,
        [id, userId]
      );

      if (post.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Video post not found',
        });
      }

      // Validate geo restrictions if provided
      if (geo_restrictions) {
        const validation = geoBlockingService.validateRestrictions(geo_restrictions);
        if (!validation.valid) {
          return res.status(400).json({
            success: false,
            error: 'Invalid geo restrictions',
            details: validation.errors,
          });
        }
      }

      // Build video metadata
      const videoMetadata = {
        title,
        description,
        alt_text,
        hashtags,
        cta,
      };

      // Update post
      await database.query(
        `UPDATE posts
         SET video_metadata = $1,
             geo_restrictions = $2,
             content = jsonb_set(
               COALESCE(content, '{}'::jsonb),
               '{text}',
               $3
             ),
             updated_at = NOW()
         WHERE id = $4`,
        [
          JSON.stringify(videoMetadata),
          geo_restrictions ? JSON.stringify(geo_restrictions) : null,
          JSON.stringify(title),
          id,
        ]
      );

      logger.info('Video metadata updated', { postId: id, userId });

      return res.json({
        success: true,
        message: 'Video metadata updated successfully',
      });
    } catch (error: any) {
      logger.error('Update video metadata error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to update video metadata',
      });
    }
  }

  /**
   * POST /api/video/:id/publish
   * Publish video to platforms
   */
  async publishVideo(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const { platforms, accountIds, scheduledAt } = req.body;

      // Get post
      const postResult = await database.query(
        `SELECT * FROM posts WHERE id = $1 AND user_id = $2`,
        [id, userId]
      );

      if (postResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Video post not found',
        });
      }

      const post = postResult.rows[0];

      // Verify video is ready
      if (post.processing_status !== 'ready') {
        return res.status(400).json({
          success: false,
          error: `Video is not ready for publishing. Status: ${post.processing_status}`,
        });
      }

      const videoMetadata = post.video_metadata || {};

      // If scheduled, create scheduled post
      if (scheduledAt) {
        await database.query(
          `UPDATE posts
           SET scheduled_at = $1, status = 'scheduled', platforms = $2
           WHERE id = $3`,
          [scheduledAt, platforms, id]
        );

        return res.json({
          success: true,
          message: 'Video scheduled for publishing',
          scheduledAt,
        });
      }

      // Publish immediately
      const results = [];

      for (const platform of platforms) {
        const accountId = accountIds?.[platform];

        if (platform === 'twitter') {
          const result = await this.publishToTwitter(post, videoMetadata, accountId);
          results.push(result);
        }
        // Add more platforms here
      }

      // Update post status
      await database.query(
        `UPDATE posts
         SET status = 'published', published_at = NOW(), platforms = $1
         WHERE id = $2`,
        [platforms, id]
      );

      return res.json({
        success: true,
        message: 'Video published successfully',
        results,
      });
    } catch (error: any) {
      logger.error('Publish video error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to publish video',
      });
    }
  }

  /**
   * Publish video to Twitter
   */
  private async publishToTwitter(
    post: any,
    videoMetadata: any,
    accountId?: string
  ): Promise<any> {
    try {
      // Get credentials
      let credentials;
      if (accountId) {
        const accountResult = await database.query(
          `SELECT credentials FROM platform_credentials WHERE id = $1`,
          [accountId]
        );
        if (accountResult.rows.length === 0) {
          throw new Error('Twitter account not found');
        }
        credentials = decryptCredentials(accountResult.rows[0].credentials);
      } else {
        throw new Error('No Twitter account specified');
      }

      // Initialize adapter
      await twitterVideoAdapter.initialize(credentials);

      // Validate video
      const validation = await twitterVideoAdapter.validateVideo(
        post.media_url,
        post.video_duration,
        post.video_size
      );

      if (!validation.valid) {
        throw new Error(`Video validation failed: ${validation.errors.join(', ')}`);
      }

      // Publish
      const result = await twitterVideoAdapter.publishVideo(
        {
          text: videoMetadata.title,
          media: [{ url: post.media_url, type: 'video' }],
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

      return result;
    } catch (error: any) {
      logger.error('Twitter publish error:', error);
      return {
        success: false,
        error: error.message,
        platform: 'twitter',
      };
    }
  }

  /**
   * GET /api/video/:id/access-stats
   * Get geographic access statistics
   */
  async getAccessStats(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      // Verify ownership
      const post = await database.query(
        `SELECT id FROM posts WHERE id = $1 AND user_id = $2`,
        [id, userId]
      );

      if (post.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Video post not found',
        });
      }

      const stats = await geoBlockingService.getAccessStatsByRegion(id);

      return res.json({
        success: true,
        stats,
      });
    } catch (error: any) {
      logger.error('Get access stats error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to get access statistics',
      });
    }
  }

  /**
   * GET /api/video/geo-suggestions
   * Get suggested geo restrictions based on analytics
   */
  async getGeoSuggestions(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.id;

      const suggestions = await geoBlockingService.getSuggestedRestrictions(userId);

      return res.json({
        success: true,
        suggestions,
      });
    } catch (error: any) {
      logger.error('Get geo suggestions error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to get geo suggestions',
      });
    }
  }
}

export const videoPostController = new VideoPostController();
