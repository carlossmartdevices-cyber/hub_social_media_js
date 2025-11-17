import { Router } from 'express';
import { body } from 'express-validator';
import PostController from '../controllers/PostController';
import { authMiddleware } from '../middlewares/auth';
import { validate } from '../middlewares/validation';

const router = Router();

router.post(
  '/',
  authMiddleware,
  [
    body('platforms').isArray({ min: 1 }).withMessage('At least one platform is required'),
    body('content').isObject().withMessage('Content is required'),
    body('content.text').notEmpty().withMessage('Content text is required'),
    validate,
  ],
  PostController.createPost
);

router.get('/', authMiddleware, PostController.listPosts);

router.get('/:id', authMiddleware, PostController.getPost);

router.delete('/:id/cancel', authMiddleware, PostController.cancelPost);

router.get('/:id/metrics', authMiddleware, PostController.getMetrics);

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
