import { Router } from 'express';
import { body } from 'express-validator';
import { authMiddleware } from '../middlewares/auth';
import { validate } from '../middlewares/validation';
import { englishLearningController } from '../controllers/EnglishLearningController';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * POST /api/english-learning/ask
 * Ask an English learning question
 *
 * Body:
 * {
 *   "question": "How do I write a professional thank you message?",
 *   "context": "I want to thank my subscribers for their support",
 *   "level": "intermediate" // beginner | intermediate | advanced
 * }
 */
router.post(
  '/ask',
  [
    body('question').notEmpty().withMessage('Question is required'),
    body('context').optional().isString(),
    body('level').optional().isIn(['beginner', 'intermediate', 'advanced']),
    validate,
  ],
  englishLearningController.askQuestion.bind(englishLearningController)
);

/**
 * GET /api/english-learning/topics
 * Get suggested learning topics for content creators
 */
router.get('/topics', englishLearningController.getSuggestedTopics.bind(englishLearningController));

/**
 * POST /api/english-learning/practice
 * Generate a practice scenario
 *
 * Body:
 * {
 *   "scenario": "Responding to a negative comment",
 *   "level": "intermediate"
 * }
 */
router.post(
  '/practice',
  [
    body('scenario').notEmpty().withMessage('Scenario is required'),
    body('level').optional().isIn(['beginner', 'intermediate', 'advanced']),
    validate,
  ],
  englishLearningController.generatePractice.bind(englishLearningController)
);

export default router;
