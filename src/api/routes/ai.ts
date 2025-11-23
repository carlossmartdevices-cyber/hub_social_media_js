import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth';
import { aiAnalyticsController } from '../controllers/AIAnalyticsController';

const router = Router();

// All AI routes require authentication
router.use(authMiddleware);

/**
 * Smart hashtag suggestions based on historical performance
 * GET /api/ai/hashtags/smart?platform=twitter&limit=10
 */
router.get('/hashtags/smart', aiAnalyticsController.getSmartHashtags.bind(aiAnalyticsController));

/**
 * Smart caption suggestions based on successful patterns
 * POST /api/ai/captions/smart
 * Body: { topic?: string, platform?: string }
 */
router.post('/captions/smart', aiAnalyticsController.getSmartCaptions.bind(aiAnalyticsController));

/**
 * Content ideas based on trends and historical data
 * POST /api/ai/ideas
 * Body: { platform?: string, count?: number }
 */
router.post('/ideas', aiAnalyticsController.getContentIdeas.bind(aiAnalyticsController));

/**
 * Analyze optimal posting times
 * GET /api/ai/optimal-times?platform=twitter
 */
router.get('/optimal-times', aiAnalyticsController.getOptimalPostingTimes.bind(aiAnalyticsController));

/**
 * Get intelligent schedule suggestion
 * POST /api/ai/suggest-schedule
 * Body: { platform?: string, timezone?: string }
 */
router.post('/suggest-schedule', aiAnalyticsController.suggestSchedule.bind(aiAnalyticsController));

export default router;
