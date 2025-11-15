import { Router } from 'express';
import { body } from 'express-validator';
import rateLimit from 'express-rate-limit';
import AuthController from '../controllers/AuthController';
import { authMiddleware } from '../middlewares/auth';
import { validate } from '../middlewares/validation';

const router = Router();

// 🔴 CRITICAL: Rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many authentication attempts from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Only count failed requests
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 registration attempts per hour
  message: 'Too many accounts created from this IP, please try again after an hour',
  standardHeaders: true,
  legacyHeaders: false,
});

router.post(
  '/register',
  registerLimiter,
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 12 })
      .withMessage('Password must be at least 12 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]/)
      .withMessage('Password must contain uppercase, lowercase, number and special character'),
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Name is required')
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),
    validate,
  ],
  AuthController.register
);

router.post(
  '/login',
  authLimiter,
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
    validate,
  ],
  AuthController.login
);

router.post(
  '/refresh',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: 'Too many refresh requests',
  }),
  [
    body('refreshToken')
      .notEmpty()
      .withMessage('Refresh token is required'),
    validate,
  ],
  AuthController.refresh
);

router.post(
  '/logout',
  authMiddleware,
  AuthController.logout
);

router.get('/profile', authMiddleware, AuthController.getProfile);

export default router;
