import { Router } from 'express';
import { body } from 'express-validator';
import { authMiddleware } from '../middlewares/auth';
import { validate } from '../middlewares/validation';
import { platformAccountController } from '../controllers/PlatformAccountController';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/platform-accounts
 * List all platform accounts for authenticated user
 */
router.get('/', platformAccountController.listAccounts.bind(platformAccountController));

/**
 * POST /api/platform-accounts
 * Add a new platform account
 */
router.post(
  '/',
  [
    body('platform').notEmpty().withMessage('Platform is required'),
    body('accountName').notEmpty().withMessage('Account name is required'),
    body('accountIdentifier').notEmpty().withMessage('Account identifier is required'),
    body('credentials').isObject().withMessage('Credentials must be an object'),
    validate,
  ],
  platformAccountController.addAccount.bind(platformAccountController)
);

/**
 * PATCH /api/platform-accounts/:id
 * Update a platform account
 */
router.patch(
  '/:id',
  [
    body('accountName').optional().notEmpty().withMessage('Account name cannot be empty'),
    body('credentials').optional().isObject().withMessage('Credentials must be an object'),
    body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
    validate,
  ],
  platformAccountController.updateAccount.bind(platformAccountController)
);

/**
 * DELETE /api/platform-accounts/:id
 * Delete a platform account
 */
router.delete('/:id', platformAccountController.deleteAccount.bind(platformAccountController));

/**
 * POST /api/platform-accounts/:id/test
 * Test platform account credentials
 */
router.post('/:id/test', platformAccountController.testAccount.bind(platformAccountController));

export default router;
