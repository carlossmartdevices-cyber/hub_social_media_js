import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { aiAnalyticsService } from '../../services/AIAnalyticsService';
import { logger } from '../../utils/logger';

/**
 * AIAnalyticsController - Handles AI-powered analytics and content suggestions
 */
export class AIAnalyticsController {
  /**
   * GET /api/ai/hashtags/smart
   * Generate smart hashtag suggestions based on historical performance
   */
  public async getSmartHashtags(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { platform, limit } = req.query;

      const hashtags = await aiAnalyticsService.generateSmartHashtags(
        userId,
        platform as string | undefined,
        limit ? parseInt(limit as string) : 10
      );

      res.json({
        success: true,
        data: hashtags,
        message: 'Smart hashtags generated successfully',
      });
    } catch (error: any) {
      logger.error('Error in getSmartHashtags', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to generate smart hashtags',
      });
    }
  }

  /**
   * POST /api/ai/captions/smart
   * Generate smart caption suggestions based on historical performance
   */
  public async getSmartCaptions(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { topic, platform } = req.body;

      const captions = await aiAnalyticsService.generateSmartCaptions(
        userId,
        topic,
        platform
      );

      res.json({
        success: true,
        data: captions,
        message: 'Smart captions generated successfully',
      });
    } catch (error: any) {
      logger.error('Error in getSmartCaptions', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to generate smart captions',
      });
    }
  }

  /**
   * POST /api/ai/ideas
   * Generate content ideas based on historical performance and trends
   */
  public async getContentIdeas(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { platform, count } = req.body;

      const ideas = await aiAnalyticsService.generateContentIdeas(
        userId,
        platform,
        count || 5
      );

      res.json({
        success: true,
        data: ideas,
        message: 'Content ideas generated successfully',
      });
    } catch (error: any) {
      logger.error('Error in getContentIdeas', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to generate content ideas',
      });
    }
  }

  /**
   * GET /api/ai/optimal-times
   * Analyze engagement to determine optimal posting times
   */
  public async getOptimalPostingTimes(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { platform } = req.query;

      const result = await aiAnalyticsService.analyzeOptimalPostingTimes(
        userId,
        platform as string | undefined
      );

      res.json({
        success: true,
        data: result,
        message: 'Optimal posting times analyzed successfully',
      });
    } catch (error: any) {
      logger.error('Error in getOptimalPostingTimes', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to analyze optimal posting times',
      });
    }
  }

  /**
   * POST /api/ai/suggest-schedule
   * Get intelligent schedule suggestion for a post
   */
  public async suggestSchedule(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { platform } = req.body;

      const result = await aiAnalyticsService.analyzeOptimalPostingTimes(
        userId,
        platform
      );

      if (result.bestTimes.length === 0) {
        // Return default best practice times
        res.json({
          success: true,
          data: {
            suggestedTime: this.getDefaultBestTime(platform),
            reason: 'No historical data available. Using platform best practices.',
            confidence: 'low',
          },
        });
        return;
      }

      // Get the best time from analytics
      const bestTime = result.bestTimes[0];
      const suggestedTime = this.calculateNextOccurrence(bestTime.dayOfWeek, bestTime.hour);

      res.json({
        success: true,
        data: {
          suggestedTime,
          dayOfWeek: bestTime.dayOfWeek,
          hour: bestTime.hour,
          reason: `Based on your historical data, ${this.getDayName(bestTime.dayOfWeek)}s at ${bestTime.hour}:00 typically get ${bestTime.avgEngagement.toFixed(2)}% engagement.`,
          confidence: result.bestTimes.length >= 5 ? 'high' : 'medium',
          insights: result.insights,
        },
      });
    } catch (error: any) {
      logger.error('Error in suggestSchedule', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to suggest schedule',
      });
    }
  }

  /**
   * Calculate the next occurrence of a specific day/hour
   */
  private calculateNextOccurrence(dayOfWeek: number, hour: number): Date {
    const now = new Date();

    // Calculate days until target day
    const currentDay = now.getDay();
    let daysUntil = dayOfWeek - currentDay;

    if (daysUntil < 0) {
      daysUntil += 7;
    } else if (daysUntil === 0 && now.getHours() >= hour) {
      daysUntil = 7; // If today but hour has passed, go to next week
    }

    const result = new Date(now);
    result.setDate(now.getDate() + daysUntil);
    result.setHours(hour, 0, 0, 0);

    return result;
  }

  /**
   * Get default best time based on platform best practices
   */
  private getDefaultBestTime(platform?: string): Date {

    // Platform-specific best practice times
    const bestPractices: Record<string, { day: number; hour: number }> = {
      twitter: { day: 3, hour: 12 }, // Wednesday noon
      instagram: { day: 2, hour: 11 }, // Tuesday 11am
      facebook: { day: 4, hour: 13 }, // Thursday 1pm
      linkedin: { day: 3, hour: 10 }, // Wednesday 10am
      telegram: { day: 5, hour: 19 }, // Friday 7pm
    };

    const best = platform ? bestPractices[platform.toLowerCase()] || bestPractices.twitter : bestPractices.twitter;

    return this.calculateNextOccurrence(best.day, best.hour);
  }

  /**
   * Get day name from day of week number
   */
  private getDayName(dayOfWeek: number): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayOfWeek];
  }
}

export const aiAnalyticsController = new AIAnalyticsController();
