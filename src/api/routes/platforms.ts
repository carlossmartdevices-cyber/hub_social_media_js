import { Router } from 'express';
import { body } from 'express-validator';
import PlatformController from '../controllers/PlatformController';
import { authMiddleware } from '../middlewares/auth';
import { validate } from '../middlewares/validation';

const router = Router();

router.get('/supported', authMiddleware, PlatformController.getSupportedPlatforms);

router.get('/credentials', authMiddleware, PlatformController.listCredentials);

router.post(
  '/credentials',
  authMiddleware,
  [
    body('platform').notEmpty().withMessage('Platform is required'),
    body('credentials').isObject().withMessage('Credentials are required'),
    validate,
  ],
  PlatformController.addCredentials
);

router.delete('/credentials/:platform', authMiddleware, PlatformController.removeCredentials);

export default router;
