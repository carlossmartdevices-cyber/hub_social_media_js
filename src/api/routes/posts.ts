import { Router } from 'express';
import { body } from 'express-validator';
import multer from 'multer';
import path from 'path';
import PostController from '../controllers/PostController';
import { authMiddleware } from '../middlewares/auth';
import { validate } from '../middlewares/validation';
import { config } from '../../config';

// Configure multer for media uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(config.media.storagePath, 'posts'));
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `media-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

export const mediaUpload = multer({
  storage,
  limits: {
    fileSize: config.media.maxImageSize, // 10MB default
    files: 10, // Max 10 files per post
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images (JPEG, PNG, GIF, WEBP) and videos (MP4, MOV) are allowed.'));
    }
  },
});

const router = Router();

router.post(
  '/',
  authMiddleware,
  mediaUpload.array('media', 10),
  PostController.createPost
);

// Publish Now - Immediate publishing without scheduling
router.post(
  '/publish-now',
  authMiddleware,
  mediaUpload.array('media', 10),
  PostController.publishNow
);

router.get('/', authMiddleware, PostController.listPosts);

router.get('/:id', authMiddleware, PostController.getPost);

// Bulk delete posts
router.delete(
  '/bulk-delete',
  authMiddleware,
  [
    body('period').notEmpty().isIn(['24h', '7d', '30d', 'all']).withMessage('Period must be 24h, 7d, 30d, or all'),
    body('platform').optional().isString().withMessage('Platform must be a string'),
    validate,
  ],
  PostController.bulkDelete
);

router.delete('/:id/cancel', authMiddleware, PostController.cancelPost);

router.patch(
  '/:id/reschedule',
  authMiddleware,
  [
    body('scheduledAt').notEmpty().withMessage('scheduledAt is required'),
    validate,
  ],
  PostController.reschedulePost
);

router.get('/:id/metrics', authMiddleware, PostController.getMetrics);

// Analytics Routes
router.get('/analytics/metrics', authMiddleware, PostController.getAnalyticsMetrics);

// AI Content Generation Routes
router.post(
  '/ai/generate',
  authMiddleware,
  [
    body('optionsCount').optional().isInt({ min: 1, max: 24 }).withMessage('Options count must be between 1 and 24'),
    body('language').optional().isIn(['en', 'es']).withMessage('Language must be "en" or "es"'),
    body('platform').optional().isString().withMessage('Platform must be a string'),
    body('customInstructions').optional().isString().withMessage('Custom instructions must be a string'),
    validate,
  ],
  PostController.generateAIContent
);

router.post(
  '/ai/generate-single',
  authMiddleware,
  [
    body('platform').notEmpty().withMessage('Platform is required'),
    body('language').optional().isIn(['en', 'es']).withMessage('Language must be "en" or "es"'),
    validate,
  ],
  PostController.generateSingleAIPost
);

export default router;
