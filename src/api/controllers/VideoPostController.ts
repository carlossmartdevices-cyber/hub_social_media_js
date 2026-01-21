import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../utils/logger';
import database from '../../database/connection';
import { videoProcessingService } from '../../services/VideoProcessingService';
import { geoBlockingService } from '../../services/GeoBlockingService';
import { twitterVideoAdapter } from '../../platforms/twitter/TwitterVideoAdapter';
import { MediaType } from '../../core/content/types';
import aiContentGenerationService from '../../services/AIContentGenerationService';
import { EncryptionService } from '../../utils/encryption';
import { multiPlatformPublishService } from '../../services/MultiPlatformPublishService';
import multer from 'multer';
import path from 'path';

/** Video post database row type */
interface VideoPostRow {
  id: string;
  user_id: string;
  media_type: string;
  media_url: string;
  thumbnail_url?: string;
  video_duration?: number;
  video_size?: number;
  processing_status: string;
  video_metadata?: VideoMetadata;
  geo_restrictions?: Record<string, unknown>;
  content?: Record<string, unknown>;
  status: string;
  platforms?: string[];
  scheduled_at?: Date;
  published_at?: Date;
  created_at: Date;
  updated_at: Date;
}

/** Video metadata type */
interface VideoMetadata {
  title?: string;
  description?: string;
  alt_text?: string;
  hashtags?: string[];
  cta?: string;
}

// Configure multer for video uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, './uploads/temp');
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `video-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

export const videoUpload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 * 1024, // 5GB max
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/mpeg', 'video/webm', 'video/x-matroska'];
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

      const { title, description, quality = 'medium' } = req.body;

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
    } catch (error: unknown) {
      logger.error('Video upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload video';
      return res.status(500).json({
        success: false,
        error: errorMessage,
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
    } catch (error: unknown) {
      logger.error('Update video metadata error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update video metadata',
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
    } catch (error: unknown) {
      logger.error('Publish video error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to publish video',
      });
    }
  }

  /**
   * Publish video to Twitter
   */
  private async publishToTwitter(
    post: VideoPostRow,
    videoMetadata: VideoMetadata,
    accountId?: string
  ): Promise<{ success: boolean; platformPostId?: string; error?: string; platform: string }> {
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
        credentials = JSON.parse(EncryptionService.decrypt(accountResult.rows[0].credentials));
      } else {
        throw new Error('No Twitter account specified');
      }

      // Initialize adapter
      await twitterVideoAdapter.initialize(credentials);

      // Validate video
      const validation = await twitterVideoAdapter.validateVideo(
        post.media_url,
        post.video_duration ?? 0,
        post.video_size ?? 0
      );

      if (!validation.valid) {
        throw new Error(`Video validation failed: ${validation.errors.join(', ')}`);
      }

      // Publish
      const result = await twitterVideoAdapter.publishVideo(
        {
          text: videoMetadata.title ?? '',
          media: [{ id: '', url: post.media_url, type: MediaType.VIDEO, mimeType: 'video/mp4', size: 0 }],
        },
        { ...videoMetadata, title: videoMetadata.title ?? '', description: videoMetadata.description ?? '' }
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
    } catch (error: unknown) {
      logger.error('Twitter publish error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
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
    } catch (error: unknown) {
      logger.error('Get access stats error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get access statistics',
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
    } catch (error: unknown) {
      logger.error('Get geo suggestions error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get geo suggestions',
      });
    }
  }

  /**
   * POST /api/video/generate-metadata
   * Generate video title and description using Grok AI
   */
  async generateMetadata(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { userExplanation, videoFileName } = req.body;

      if (!userExplanation) {
        return res.status(400).json({
          success: false,
          error: 'User explanation is required',
        });
      }

      logger.info('Generating video metadata with Grok', {
        userId: req.user!.id,
        videoFileName,
      });

      const metadata = await aiContentGenerationService.generateVideoMetadata(
        userExplanation,
        videoFileName || 'video.mp4'
      );

      return res.json({
        success: true,
        metadata,
      });
    } catch (error: unknown) {
      logger.error('Generate metadata error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate metadata',
      });
    }
  }

  /**
   * POST /api/video/generate-posts
   * Generate post variants in English and Spanish using Grok AI
   */
  async generatePosts(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { videoTitle, videoDescription, userGoal, targetAudience } = req.body;

      if (!videoTitle || !videoDescription || !userGoal) {
        return res.status(400).json({
          success: false,
          error: 'Video title, description, and user goal are required',
        });
      }

      logger.info('Generating post variants with Grok', {
        userId: req.user!.id,
        videoTitle,
        userGoal,
      });

      const variants = await aiContentGenerationService.generatePostVariants(
        videoTitle,
        videoDescription,
        userGoal,
        targetAudience
      );

      return res.json({
        success: true,
        variants,
      });
    } catch (error: unknown) {
      logger.error('Generate posts error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate post variants',
      });
    }
  }

  /**
   * POST /api/video/regenerate-posts
   * Regenerate post variants with different approach
   */
  async regeneratePosts(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { videoTitle, videoDescription, userGoal, previousAttempts } = req.body;

      if (!videoTitle || !videoDescription || !userGoal) {
        return res.status(400).json({
          success: false,
          error: 'Video title, description, and user goal are required',
        });
      }

      logger.info('Regenerating post variants with Grok', {
        userId: req.user!.id,
        videoTitle,
        attemptsCount: previousAttempts?.length || 0,
      });

      const variants = await aiContentGenerationService.regeneratePostVariants(
        videoTitle,
        videoDescription,
        userGoal,
        previousAttempts || []
      );

      return res.json({
        success: true,
        variants,
      });
    } catch (error: unknown) {
      logger.error('Regenerate posts error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to regenerate post variants',
      });
    }
  }

  /**
   * POST /api/video/generate-bulk-posts
   * Generate post variants for multiple videos
   */
  async generateBulkPosts(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { videos } = req.body;

      if (!videos || !Array.isArray(videos) || videos.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Videos array is required',
        });
      }

      if (videos.length > 6) {
        return res.status(400).json({
          success: false,
          error: 'Maximum 6 videos allowed for bulk generation',
        });
      }

      logger.info('Generating bulk post variants with Grok', {
        userId: req.user!.id,
        videosCount: videos.length,
      });

      const allVariants = await aiContentGenerationService.generateBulkPostVariants(videos);

      return res.json({
        success: true,
        variants: allVariants,
      });
    } catch (error: unknown) {
      logger.error('Generate bulk posts error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate bulk post variants',
      });
    }
  }

  /**
   * POST /api/video/:id/publish-multi-platform
   * Publish video to multiple platforms (Twitter + Telegram)
   */
  async publishMultiPlatform(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const {
        platforms,
        twitterAccountId,
        telegramChannelIds,
        caption,
        videoMetadata,
        scheduledAt,
      } = req.body;

      if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'At least one platform is required',
        });
      }

      if (platforms.includes('twitter') && !twitterAccountId) {
        return res.status(400).json({
          success: false,
          error: 'Twitter account ID is required for Twitter publishing',
        });
      }

      if (platforms.includes('telegram') && (!telegramChannelIds || telegramChannelIds.length === 0)) {
        return res.status(400).json({
          success: false,
          error: 'At least one Telegram channel is required for Telegram publishing',
        });
      }

      // If scheduled, handle scheduling
      if (scheduledAt) {
        await database.query(
          `UPDATE posts
           SET scheduled_at = $1, status = 'scheduled', platforms = $2
           WHERE id = $3 AND user_id = $4`,
          [scheduledAt, platforms, id, userId]
        );

        return res.json({
          success: true,
          message: 'Video scheduled for multi-platform publishing',
          scheduledAt,
          platforms,
        });
      }

      logger.info('Starting multi-platform publish', {
        userId,
        postId: id,
        platforms,
      });

      // Publish to multiple platforms
      const result = await multiPlatformPublishService.publishToMultiplePlatforms({
        postId: id,
        userId,
        platforms,
        twitterAccountId,
        telegramChannelIds,
        caption,
        videoMetadata,
      });

      return res.json({
        success: result.success,
        message: result.success
          ? `Video published to ${result.totalSuccess} platform(s) successfully`
          : 'Failed to publish to all platforms',
        results: result.results,
        totalSuccess: result.totalSuccess,
        totalFailed: result.totalFailed,
      });
    } catch (error: unknown) {
      logger.error('Multi-platform publish error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to publish to multiple platforms',
      });
    }
  }

  /**
   * GET /api/video/:id/publish-status
   * Get publishing status across all platforms
   */
  async getPublishStatus(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const status = await multiPlatformPublishService.getPublishStatus(id, userId);

      return res.json({
        success: true,
        status,
      });
    } catch (error: unknown) {
      logger.error('Get publish status error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get publish status',
      });
    }
  }
}

export const videoPostController = new VideoPostController();
