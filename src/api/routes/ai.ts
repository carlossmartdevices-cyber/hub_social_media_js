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

    return res.json(result);
  } catch (error: any) {
    logger.error('Error in /generate-caption:', error);
    return res.status(500).json({
      error: 'Failed to generate caption',
      details: error.message
    });
  }
});

/**
 * Generate post variants in English and Spanish
 * POST /api/ai/generate-post-variants
 * Body: { title: string, description: string, goal: string, targetAudience?: string }
 */
router.post('/generate-post-variants', async (req, res) => {
  try {
    const { title, description, goal, targetAudience } = req.body;

    if (!title || !description || !goal) {
      return res.status(400).json({ error: 'Title, description, and goal are required' });
    }

    const result = await aiContentGenerationService.generatePostVariants(
      title,
      description,
      goal,
      targetAudience
    );

    return res.json(result);
  } catch (error: any) {
    logger.error('Error in /generate-post-variants:', error);
    return res.status(500).json({ error: 'Failed to generate post variants' });
  }
});

/**
 * Generate video metadata with SEO optimization
 * POST /api/ai/generate-video-metadata
 * Body: { explanation: string, fileName: string }
 */
router.post('/generate-video-metadata', async (req, res) => {
  try {
    const { explanation, fileName } = req.body;

    if (!explanation) {
      return res.status(400).json({ error: 'Explanation is required' });
    }

    const result = await aiContentGenerationService.generateVideoMetadata(
      explanation,
      fileName || 'video.mp4'
    );

    return res.json(result);
  } catch (error: any) {
    logger.error('Error in /generate-video-metadata:', error);
    return res.status(500).json({ error: 'Failed to generate video metadata' });
  }
});

/**
 * Generate English lesson for content creators
 * POST /api/ai/english-lesson
 * Body: { topic: string, level?: string, focusArea?: string }
 */
router.post('/english-lesson', async (req, res) => {
  try {
    const { topic, level = 'intermediate', focusArea = 'vocabulary' } = req.body;

    if (!topic) {
      return res.status(400).json({ error: 'Topic is required' });
    }

    const result = await aiContentGenerationService.generateEnglishLesson(
      topic,
      level as 'beginner' | 'intermediate' | 'advanced',
      focusArea as 'vocabulary' | 'grammar' | 'phrases' | 'pronunciation' | 'writing'
    );

    return res.json(result);
  } catch (error: any) {
    logger.error('Error in /english-lesson:', error);
    return res.status(500).json({ error: 'Failed to generate English lesson' });
  }
});

/**
 * Translate and improve content
 * POST /api/ai/translate
 * Body: { content: string, fromLang: string, toLang: string, context?: string }
 */
router.post('/translate', async (req, res) => {
  try {
    const { content, fromLang, toLang, context = 'social_media' } = req.body;

    if (!content || !fromLang || !toLang) {
      return res.status(400).json({ error: 'Content, fromLang, and toLang are required' });
    }

    const result = await aiContentGenerationService.translateAndImprove(
      content,
      fromLang as 'en' | 'es',
      toLang as 'en' | 'es',
      context as 'social_media' | 'video_script' | 'caption' | 'bio'
    );

    return res.json(result);
  } catch (error: any) {
    logger.error('Error in /translate:', error);
    return res.status(500).json({ error: 'Failed to translate content' });
  }
});

/**
 * Generate weekly post ideas
 * POST /api/ai/weekly-ideas
 * Body: { niche: string, platforms: string[], previousPosts?: string[] }
 */
router.post('/weekly-ideas', async (req, res) => {
  try {
    const { niche, platforms, previousPosts } = req.body;

    if (!niche || !platforms || !platforms.length) {
      return res.status(400).json({ error: 'Niche and platforms are required' });
    }

    const result = await aiContentGenerationService.generateWeeklyPostIdeas(
      niche,
      platforms,
      previousPosts
    );

    return res.json(result);
  } catch (error: any) {
    logger.error('Error in /weekly-ideas:', error);
    return res.status(500).json({ error: 'Failed to generate weekly ideas' });
  }
});

/**
 * Chat with Grok AI
 * POST /api/ai/chat
 * Body: { message: string, history?: array, context?: string }
 */
router.post('/chat', async (req, res) => {
  try {
    const { message, history = [], context = 'content_creation' } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const result = await aiContentGenerationService.chat(
      message,
      history,
      context as 'content_creation' | 'english_learning' | 'social_media' | 'general'
    );

    return res.json(result);
  } catch (error: any) {
    logger.error('Error in /chat:', error);
    return res.status(500).json({ error: 'Failed to process chat message' });
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
