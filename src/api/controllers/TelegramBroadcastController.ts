import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { logger } from '../../utils/logger';
import database from '../../database/connection';
import telegramBroadcastService from '../../services/TelegramBroadcastService';
import multer from 'multer';
import path from 'path';

// Configure multer for video uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads/telegram');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `telegram-video-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

export const telegramVideoUpload = multer({
  storage,
  limits: {
    fileSize: 2000 * 1024 * 1024, // 2GB - Telegram supports up to 2GB for videos
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only video files are allowed.'));
    }
  },
});

/**
 * Telegram Broadcast Controller
 * Handles broadcasting to Telegram channels and groups
 */
export class TelegramBroadcastController {
  /**
   * POST /api/telegram/upload-video
   * Upload video to Telegram servers
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

      const { duration, width, height, supportsStreaming } = req.body;

      logger.info('Uploading video to Telegram', {
        userId,
        filename: file.filename,
        size: file.size,
      });

      const uploadResult = await telegramBroadcastService.uploadVideoToTelegram(file.path, {
        duration: duration ? parseInt(duration) : undefined,
        width: width ? parseInt(width) : undefined,
        height: height ? parseInt(height) : undefined,
        supportsStreaming: supportsStreaming === 'true',
      });

      return res.json({
        success: true,
        result: uploadResult,
        message: 'Video uploaded to Telegram successfully',
      });
    } catch (error: any) {
      logger.error('Telegram video upload error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to upload video to Telegram',
      });
    }
  }

  /**
   * POST /api/telegram/generate-description
   * Generate broadcast description using AI
   */
  async generateDescription(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { videoTitle, videoDescription, targetAudience, goal, language } = req.body;

      if (!videoTitle || !videoDescription || !goal) {
        return res.status(400).json({
          success: false,
          error: 'Video title, description, and goal are required',
        });
      }

      logger.info('Generating broadcast description with Grok', {
        userId: req.user!.id,
        language: language || 'es',
      });

      const description = await telegramBroadcastService.generateBroadcastDescription(
        videoTitle,
        videoDescription,
        targetAudience || '',
        goal,
        language || 'es'
      );

      return res.json({
        success: true,
        description,
      });
    } catch (error: any) {
      logger.error('Generate description error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate description',
      });
    }
  }

  /**
   * POST /api/telegram/broadcast-video
   * Broadcast video to multiple channels/groups
   */
  async broadcastVideo(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.id;
      const { videoFileId, caption, channels, parseMode, disableNotification } = req.body;

      if (!videoFileId || !caption || !channels || !Array.isArray(channels)) {
        return res.status(400).json({
          success: false,
          error: 'Video file ID, caption, and channels array are required',
        });
      }

      logger.info('Broadcasting video to Telegram channels', {
        userId,
        channelsCount: channels.length,
      });

      const results = await telegramBroadcastService.broadcastVideo(
        videoFileId,
        caption,
        channels,
        {
          parseMode: parseMode || 'HTML',
          disableNotification: disableNotification || false,
        }
      );

      const successCount = results.filter((r) => r.success).length;
      const failCount = results.filter((r) => !r.success).length;

      return res.json({
        success: true,
        results,
        summary: {
          total: channels.length,
          successful: successCount,
          failed: failCount,
        },
        message: `Broadcast completed: ${successCount} successful, ${failCount} failed`,
      });
    } catch (error: any) {
      logger.error('Broadcast video error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to broadcast video',
      });
    }
  }

  /**
   * POST /api/telegram/broadcast-text
   * Broadcast text message to multiple channels/groups
   */
  async broadcastText(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.id;
      const { message, channels, parseMode, disableNotification } = req.body;

      if (!message || !channels || !Array.isArray(channels)) {
        return res.status(400).json({
          success: false,
          error: 'Message and channels array are required',
        });
      }

      logger.info('Broadcasting text to Telegram channels', {
        userId,
        channelsCount: channels.length,
      });

      const results = await telegramBroadcastService.broadcastText(message, channels, {
        parseMode: parseMode || 'HTML',
        disableNotification: disableNotification || false,
      });

      const successCount = results.filter((r) => r.success).length;
      const failCount = results.filter((r) => !r.success).length;

      return res.json({
        success: true,
        results,
        summary: {
          total: channels.length,
          successful: successCount,
          failed: failCount,
        },
        message: `Broadcast completed: ${successCount} successful, ${failCount} failed`,
      });
    } catch (error: any) {
      logger.error('Broadcast text error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to broadcast text',
      });
    }
  }

  /**
   * GET /api/telegram/bot-info
   * Get Telegram bot information
   */
  async getBotInfo(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const botInfo = await telegramBroadcastService.getBotInfo();

      return res.json({
        success: true,
        botInfo,
      });
    } catch (error: any) {
      logger.error('Get bot info error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to get bot information',
      });
    }
  }

  /**
   * POST /api/telegram/check-channel
   * Check if bot has access to a channel/group
   */
  async checkChannel(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { chatId } = req.body;

      if (!chatId) {
        return res.status(400).json({
          success: false,
          error: 'Chat ID is required',
        });
      }

      const chatInfo = await telegramBroadcastService.getChatInfo(chatId);
      const isAdmin = await telegramBroadcastService.isBotAdmin(chatId);

      return res.json({
        success: true,
        chatInfo,
        isAdmin,
        canBroadcast: isAdmin,
      });
    } catch (error: any) {
      logger.error('Check channel error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to check channel access',
      });
    }
  }

  /**
   * GET /api/telegram/channels
   * Get user's configured Telegram channels
   */
  async getChannels(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.id;

      const result = await database.query(
        `SELECT * FROM telegram_channels WHERE user_id = $1 ORDER BY created_at DESC`,
        [userId]
      );

      return res.json({
        success: true,
        channels: result.rows,
      });
    } catch (error: any) {
      logger.error('Get channels error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to get channels',
      });
    }
  }

  /**
   * POST /api/telegram/channels
   * Add a new Telegram channel/group
   */
  async addChannel(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.id;
      const { chatId, title, type, username } = req.body;

      if (!chatId || !title || !type) {
        return res.status(400).json({
          success: false,
          error: 'Chat ID, title, and type are required',
        });
      }

      // Verify bot has access to the channel
      try {
        await telegramBroadcastService.getChatInfo(chatId);
        const isAdmin = await telegramBroadcastService.isBotAdmin(chatId);

        if (!isAdmin) {
          return res.status(403).json({
            success: false,
            error: 'Bot must be an admin in the channel/group to broadcast',
          });
        }
      } catch (error) {
        return res.status(403).json({
          success: false,
          error: 'Bot does not have access to this channel/group',
        });
      }

      const result = await database.query(
        `INSERT INTO telegram_channels (user_id, chat_id, title, type, username, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING *`,
        [userId, chatId, title, type, username || null]
      );

      return res.json({
        success: true,
        channel: result.rows[0],
        message: 'Channel added successfully',
      });
    } catch (error: any) {
      logger.error('Add channel error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to add channel',
      });
    }
  }

  /**
   * DELETE /api/telegram/channels/:id
   * Remove a Telegram channel/group
   */
  async removeChannel(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const result = await database.query(
        `DELETE FROM telegram_channels WHERE id = $1 AND user_id = $2 RETURNING *`,
        [id, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Channel not found',
        });
      }

      return res.json({
        success: true,
        message: 'Channel removed successfully',
      });
    } catch (error: any) {
      logger.error('Remove channel error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to remove channel',
      });
    }
  }
}

export const telegramBroadcastController = new TelegramBroadcastController();
