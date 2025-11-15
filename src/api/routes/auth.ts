import { Router } from 'express';
import { body } from 'express-validator';
import AuthController from '../controllers/AuthController';
import { authMiddleware } from '../middlewares/auth';
import { validate } from '../middlewares/validation';

const router = Router();

router.post(
  '/register',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('name').notEmpty().withMessage('Name is required'),
    validate,
  ],
  AuthController.register
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
    validate,
  ],
  AuthController.login
);

router.get('/profile', authMiddleware, AuthController.getProfile);

export default router;
