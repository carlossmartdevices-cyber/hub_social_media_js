import { Router } from 'express';
import { body } from 'express-validator';
import AutomatedActionsController from '../controllers/AutomatedActionsController';
import { authMiddleware } from '../middlewares/auth';
import { validate } from '../middlewares/validation';

const router = Router();

// Create automated action
router.post(
  '/',
  authMiddleware,
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('type')
      .notEmpty()
      .isIn(['auto_reply_inbox', 'auto_reply_mentions', 'scheduled_promotion', 'auto_like', 'auto_follow'])
      .withMessage('Type must be one of: auto_reply_inbox, auto_reply_mentions, scheduled_promotion, auto_like, auto_follow'),
    body('platforms').isArray({ min: 1 }).withMessage('At least one platform is required'),
    body('config').notEmpty().isObject().withMessage('Config is required and must be an object'),
    validate,
  ],
  AutomatedActionsController.createAction
);

// List automated actions
router.get('/', authMiddleware, AutomatedActionsController.listActions);

// Get specific automated action
router.get('/:id', authMiddleware, AutomatedActionsController.getAction);

// Update automated action
router.put(
  '/:id',
  authMiddleware,
  [
    body('name').optional().notEmpty().withMessage('Name cannot be empty'),
    body('type')
      .optional()
      .isIn(['auto_reply_inbox', 'auto_reply_mentions', 'scheduled_promotion', 'auto_like', 'auto_follow'])
      .withMessage('Type must be one of: auto_reply_inbox, auto_reply_mentions, scheduled_promotion, auto_like, auto_follow'),
    body('platforms').optional().isArray({ min: 1 }).withMessage('At least one platform is required'),
    body('config').optional().isObject().withMessage('Config must be an object'),
    body('isEnabled').optional().isBoolean().withMessage('isEnabled must be a boolean'),
    validate,
  ],
  AutomatedActionsController.updateAction
);

// Delete automated action
router.delete('/:id', authMiddleware, AutomatedActionsController.deleteAction);

// Toggle automated action (enable/disable)
router.patch('/:id/toggle', authMiddleware, AutomatedActionsController.toggleAction);

// Get execution logs for an automated action
router.get('/:id/logs', authMiddleware, AutomatedActionsController.getActionLogs);

export default router;
