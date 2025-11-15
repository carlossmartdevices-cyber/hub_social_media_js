import { Router } from 'express';
import { body, query } from 'express-validator';
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

export default router;
