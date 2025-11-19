import { Router } from 'express';
import { body } from 'express-validator';
import { authMiddleware } from '../middlewares/auth';
import { validate } from '../middlewares/validation';
import { videoPostController, videoUpload } from '../controllers/VideoPostController';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * POST /api/video/upload
 * Upload and process video
 *
 * Form-data fields:
 * - video: file (required)
 * - title: string (required)
 * - description: string (optional)
 * - platform: string (default: 'twitter')
 * - quality: 'high' | 'medium' | 'low' (default: 'medium')
 */
router.post(
  '/upload',
  videoUpload.single('video'),
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('description').optional().isString(),
    body('platform').optional().isString(),
    body('quality').optional().isIn(['high', 'medium', 'low']),
    validate,
  ],
  videoPostController.uploadVideo.bind(videoPostController)
);

/**
 * PUT /api/video/:id/metadata
 * Update video metadata
 *
 * Body:
 * {
 *   "title": "Video title",
 *   "description": "Video description",
 *   "hashtags": ["#tag1", "#tag2"],
 *   "cta": "Call to action",
 *   "alt_text": "Alt text for accessibility",
 *   "geo_restrictions": {
 *     "type": "whitelist" | "blacklist",
 *     "countries": ["US", "MX"],
 *     "message": "Custom block message"
 *   }
 * }
 */
router.put(
  '/:id/metadata',
  [
    body('title').optional().notEmpty().withMessage('Title cannot be empty'),
    body('description').optional().isString(),
    body('hashtags').optional().isArray(),
    body('cta').optional().isString(),
    body('alt_text').optional().isString(),
    body('geo_restrictions').optional().isObject(),
    body('geo_restrictions.type').optional().isIn(['whitelist', 'blacklist']),
    body('geo_restrictions.countries').optional().isArray(),
    validate,
  ],
  videoPostController.updateVideoMetadata.bind(videoPostController)
);

/**
 * POST /api/video/:id/publish
 * Publish video to platforms
 *
 * Body:
 * {
 *   "platforms": ["twitter", "instagram"],
 *   "accountIds": {
 *     "twitter": "account-uuid",
 *     "instagram": "account-uuid"
 *   },
 *   "scheduledAt": "2024-01-15T10:00:00Z" // optional
 * }
 */
router.post(
  '/:id/publish',
  [
    body('platforms').isArray({ min: 1 }).withMessage('At least one platform is required'),
    body('accountIds').optional().isObject(),
    body('scheduledAt').optional().isISO8601(),
    validate,
  ],
  videoPostController.publishVideo.bind(videoPostController)
);

/**
 * GET /api/video/:id/access-stats
 * Get geographic access statistics
 */
router.get(
  '/:id/access-stats',
  videoPostController.getAccessStats.bind(videoPostController)
);

/**
 * GET /api/video/geo-suggestions
 * Get suggested geo restrictions based on user's analytics
 */
router.get(
  '/geo-suggestions',
  videoPostController.getGeoSuggestions.bind(videoPostController)
);

export default router;
