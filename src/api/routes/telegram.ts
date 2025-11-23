import { Router } from 'express';
import { body } from 'express-validator';
import { authMiddleware } from '../middlewares/auth';
import { validate } from '../middlewares/validation';
import { telegramBroadcastController, telegramVideoUpload } from '../controllers/TelegramBroadcastController';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * POST /api/telegram/upload-video
 * Upload video to Telegram servers
 *
 * Form-data fields:
 * - video: file (required)
 * - duration: number (optional)
 * - width: number (optional)
 * - height: number (optional)
 * - supportsStreaming: boolean (optional)
 */
router.post(
  '/upload-video',
  telegramVideoUpload.single('video'),
  telegramBroadcastController.uploadVideo.bind(telegramBroadcastController)
);

/**
 * POST /api/telegram/generate-description
 * Generate broadcast description using Grok AI
 *
 * Body:
 * {
 *   "videoTitle": "Amazing Tutorial",
 *   "videoDescription": "Learn how to...",
 *   "targetAudience": "Spanish-speaking creators",
 *   "goal": "Get more subscribers",
 *   "language": "es" // en | es
 * }
 */
router.post(
  '/generate-description',
  [
    body('videoTitle').notEmpty().withMessage('Video title is required'),
    body('videoDescription').notEmpty().withMessage('Video description is required'),
    body('goal').notEmpty().withMessage('Goal is required'),
    body('targetAudience').optional().isString(),
    body('language').optional().isIn(['en', 'es']),
    validate,
  ],
  telegramBroadcastController.generateDescription.bind(telegramBroadcastController)
);

/**
 * POST /api/telegram/broadcast-video
 * Broadcast video to multiple channels/groups
 *
 * Body:
 * {
 *   "videoFileId": "BAACAgIAAxk...",
 *   "caption": "Video caption with <b>HTML</b> formatting",
 *   "channels": [
 *     {
 *       "id": "channel-uuid",
 *       "chatId": "@channelname",
 *       "title": "My Channel",
 *       "type": "channel"
 *     }
 *   ],
 *   "parseMode": "HTML", // HTML | Markdown | MarkdownV2
 *   "disableNotification": false
 * }
 */
router.post(
  '/broadcast-video',
  [
    body('videoFileId').notEmpty().withMessage('Video file ID is required'),
    body('caption').notEmpty().withMessage('Caption is required'),
    body('channels').isArray({ min: 1 }).withMessage('At least one channel is required'),
    body('parseMode').optional().isIn(['HTML', 'Markdown', 'MarkdownV2']),
    body('disableNotification').optional().isBoolean(),
    validate,
  ],
  telegramBroadcastController.broadcastVideo.bind(telegramBroadcastController)
);

/**
 * POST /api/telegram/broadcast-text
 * Broadcast text message to multiple channels/groups
 *
 * Body:
 * {
 *   "message": "Text message with <b>HTML</b> formatting",
 *   "channels": [...],
 *   "parseMode": "HTML",
 *   "disableNotification": false
 * }
 */
router.post(
  '/broadcast-text',
  [
    body('message').notEmpty().withMessage('Message is required'),
    body('channels').isArray({ min: 1 }).withMessage('At least one channel is required'),
    body('parseMode').optional().isIn(['HTML', 'Markdown', 'MarkdownV2']),
    body('disableNotification').optional().isBoolean(),
    validate,
  ],
  telegramBroadcastController.broadcastText.bind(telegramBroadcastController)
);

/**
 * GET /api/telegram/bot-info
 * Get Telegram bot information
 */
router.get('/bot-info', telegramBroadcastController.getBotInfo.bind(telegramBroadcastController));

/**
 * POST /api/telegram/check-channel
 * Check if bot has access to a channel/group
 *
 * Body:
 * {
 *   "chatId": "@channelname" // or numeric ID
 * }
 */
router.post(
  '/check-channel',
  [body('chatId').notEmpty().withMessage('Chat ID is required'), validate],
  telegramBroadcastController.checkChannel.bind(telegramBroadcastController)
);

/**
 * GET /api/telegram/channels
 * Get user's configured Telegram channels
 */
router.get('/channels', telegramBroadcastController.getChannels.bind(telegramBroadcastController));

/**
 * POST /api/telegram/channels
 * Add a new Telegram channel/group
 *
 * Body:
 * {
 *   "chatId": "@channelname",
 *   "title": "My Channel",
 *   "type": "channel", // channel | group | supergroup
 *   "username": "channelname" // optional
 * }
 */
router.post(
  '/channels',
  [
    body('chatId').notEmpty().withMessage('Chat ID is required'),
    body('title').notEmpty().withMessage('Title is required'),
    body('type').isIn(['channel', 'group', 'supergroup']).withMessage('Invalid channel type'),
    body('username').optional().isString(),
    validate,
  ],
  telegramBroadcastController.addChannel.bind(telegramBroadcastController)
);

/**
 * DELETE /api/telegram/channels/:id
 * Remove a Telegram channel/group
 */
router.delete('/channels/:id', telegramBroadcastController.removeChannel.bind(telegramBroadcastController));

export default router;
