import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth';
import { aiAnalyticsController } from '../controllers/AIAnalyticsController';
import aiContentGenerationService from '../../services/AIContentGenerationService';
import logger from '../../utils/logger';

const router = Router();

// All AI routes require authentication
router.use(authMiddleware);

/**
 * Generate AI-powered caption for social media post
 * POST /api/ai/generate-caption
 * Body: { prompt: string, options?: { platform, tone, length, includeHashtags, includeEmojis, targetAudience } }
 */
router.post('/generate-caption', async (req, res) => {
  try {
    const { prompt, options } = req.body;

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const result = await aiContentGenerationService.generateCaption(prompt, options || {});

    res.json(result);
  } catch (error: any) {
    logger.error('Error in /generate-caption:', error);
    res.status(500).json({
      error: 'Failed to generate caption',
      details: error.message
    });
  }
});

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
