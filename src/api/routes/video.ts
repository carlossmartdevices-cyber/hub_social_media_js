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

/**
 * POST /api/video/generate-metadata
 * Generate video title and description using Grok AI
 *
 * Body:
 * {
 *   "userExplanation": "This video is about...",
 *   "videoFileName": "my-video.mp4"
 * }
 */
router.post(
  '/generate-metadata',
  [
    body('userExplanation').notEmpty().withMessage('User explanation is required'),
    body('videoFileName').optional().isString(),
    validate,
  ],
  videoPostController.generateMetadata.bind(videoPostController)
);

/**
 * POST /api/video/generate-posts
 * Generate post variants in English and Spanish using Grok AI
 *
 * Body:
 * {
 *   "videoTitle": "Amazing Video",
 *   "videoDescription": "This video shows...",
 *   "userGoal": "Increase sales in Asia",
 *   "targetAudience": "Asian tech enthusiasts (optional)"
 * }
 */
router.post(
  '/generate-posts',
  [
    body('videoTitle').notEmpty().withMessage('Video title is required'),
    body('videoDescription').notEmpty().withMessage('Video description is required'),
    body('userGoal').notEmpty().withMessage('User goal is required'),
    body('targetAudience').optional().isString(),
    validate,
  ],
  videoPostController.generatePosts.bind(videoPostController)
);

/**
 * POST /api/video/regenerate-posts
 * Regenerate post variants with different approach
 *
 * Body:
 * {
 *   "videoTitle": "Amazing Video",
 *   "videoDescription": "This video shows...",
 *   "userGoal": "Increase sales in Asia",
 *   "previousAttempts": [...]
 * }
 */
router.post(
  '/regenerate-posts',
  [
    body('videoTitle').notEmpty().withMessage('Video title is required'),
    body('videoDescription').notEmpty().withMessage('Video description is required'),
    body('userGoal').notEmpty().withMessage('User goal is required'),
    body('previousAttempts').optional().isArray(),
    validate,
  ],
  videoPostController.regeneratePosts.bind(videoPostController)
);

/**
 * POST /api/video/generate-bulk-posts
 * Generate post variants for multiple videos (max 6)
 *
 * Body:
 * {
 *   "videos": [
 *     {
 *       "title": "Video 1",
 *       "description": "Description 1",
 *       "userGoal": "Goal 1"
 *     },
 *     ...
 *   ]
 * }
 */
router.post(
  '/generate-bulk-posts',
  [
    body('videos').isArray({ min: 1, max: 6 }).withMessage('Videos array is required (max 6)'),
    body('videos.*.title').notEmpty().withMessage('Each video must have a title'),
    body('videos.*.description').notEmpty().withMessage('Each video must have a description'),
    body('videos.*.userGoal').notEmpty().withMessage('Each video must have a user goal'),
    validate,
  ],
  videoPostController.generateBulkPosts.bind(videoPostController)
);

export default router;
