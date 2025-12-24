import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { AuthRequest, authMiddleware } from '../middlewares/auth';
import { config } from '../../config';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../utils/logger';
import database from '../../database/connection';
import { videoProcessingService } from '../../services/VideoProcessingService';

// Reference to API base URL for constructing response URLs
const API_BASE_URL = config.apiUrl || 'http://localhost:8080';

// Configure multer for media uploads (images and videos)
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(config.media.storagePath, 'media'));
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `media-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

export const mediaUpload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 * 1024, // 5GB max for large videos
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo',
      'video/x-matroska',
      'video/webm',
      'video/mpeg',
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images (JPEG, PNG, GIF, WEBP) and videos (MP4, MOV, AVI, MKV, WEBM, MPEG) are allowed.'));
    }
  },
});

const router = Router();

// All media routes require authentication
router.use(authMiddleware);

/**
 * POST /api/media/upload
 * Upload image or video media for bulk upload
 *
 * Form-data fields:
 * - file: file (required)
 * - type: 'image' | 'video' (required)
 */
router.post(
  '/upload',
  mediaUpload.single('file'),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const file = req.file;
      const { type } = req.body;

      if (!file) {
        return res.status(400).json({
          success: false,
          error: 'No file provided',
        });
      }

      if (!type || !['image', 'video'].includes(type)) {
        return res.status(400).json({
          success: false,
          error: 'Type must be either "image" or "video"',
        });
      }

      const mediaId = uuidv4();
      let mediaUrl = `${API_BASE_URL}/uploads/media/${path.basename(file.path)}`;
      let thumbnailUrl: string | undefined;
      let metadata: any = {
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
      };

      // Process video if it's a video file
      if (type === 'video') {
        try {
          logger.info('Processing video for bulk upload', {
            userId,
            mediaId,
            filename: file.filename,
            size: file.size,
          });

          const processedVideo = await videoProcessingService.processVideo(
            file.path,
            mediaId,
            {
              quality: 'medium',
              generateThumbnail: true,
            }
          );

          mediaUrl = processedVideo.url;
          thumbnailUrl = processedVideo.thumbnailUrl;
          metadata = {
            ...metadata,
            duration: processedVideo.metadata.duration,
            width: processedVideo.metadata.width,
            height: processedVideo.metadata.height,
            processedUrl: processedVideo.url,
          };
        } catch (err) {
          logger.error('Video processing failed, using original file', {
            userId,
            mediaId,
            error: err instanceof Error ? err.message : String(err),
          });
          // Continue with original file if processing fails
        }
      }

      // Store media record in database
      try {
        await database.query(
          `INSERT INTO media_uploads
           (id, user_id, file_type, original_filename, file_size, media_url, thumbnail_url, metadata, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
           ON CONFLICT DO NOTHING`,
          [
            mediaId,
            userId,
            type,
            file.originalname,
            file.size,
            mediaUrl,
            thumbnailUrl || null,
            JSON.stringify(metadata),
          ]
        );
      } catch (dbErr) {
        logger.warn('Database insert failed for media, continuing anyway', {
          error: dbErr instanceof Error ? dbErr.message : String(dbErr),
        });
      }

      return res.json({
        success: true,
        id: mediaId,
        url: mediaUrl,
        thumbnailUrl: thumbnailUrl || undefined,
        type,
        size: file.size,
        mimeType: file.mimetype,
        originalName: file.originalname,
      });
    } catch (err) {
      logger.error('Media upload failed', {
        error: err instanceof Error ? err.message : String(err),
      });

      return res.status(500).json({
        success: false,
        error: 'Failed to upload media',
        details: err instanceof Error ? err.message : String(err),
      });
    }
  }
);

export default router;
