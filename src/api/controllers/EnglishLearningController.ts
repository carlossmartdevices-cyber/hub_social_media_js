import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { logger } from '../../utils/logger';
import englishLearningService from '../../services/EnglishLearningService';

/**
 * English Learning Controller
 * Handles English learning queries for adult content creators
 */
export class EnglishLearningController {
  /**
   * POST /api/english-learning/ask
   * Ask an English learning question
   */
  async askQuestion(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { question, context, level } = req.body;

      if (!question) {
        return res.status(400).json({
          success: false,
          error: 'Question is required',
        });
      }

      logger.info('Processing English learning query', {
        userId: req.user!.id,
        level: level || 'intermediate',
      });

      const response = await englishLearningService.answerEnglishQuestion({
        question,
        context,
        level: level || 'intermediate',
      });

      return res.json({
        success: true,
        response,
      });
    } catch (error: any) {
      logger.error('English learning query error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to process English learning query',
      });
    }
  }

  /**
   * GET /api/english-learning/topics
   * Get suggested learning topics
   */
  async getSuggestedTopics(_req: AuthRequest, res: Response): Promise<Response> {
    try {
      const topics = await englishLearningService.getSuggestedTopics();

      return res.json({
        success: true,
        topics,
      });
    } catch (error: any) {
      logger.error('Get topics error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to get suggested topics',
      });
    }
  }

  /**
   * POST /api/english-learning/practice
   * Generate a practice scenario
   */
  async generatePractice(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { scenario, level } = req.body;

      if (!scenario) {
        return res.status(400).json({
          success: false,
          error: 'Scenario is required',
        });
      }

      const practice = await englishLearningService.generatePracticeScenario(
        scenario,
        level || 'intermediate'
      );

      return res.json({
        success: true,
        practice,
      });
    } catch (error: any) {
      logger.error('Generate practice error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate practice scenario',
      });
    }
  }
}

export const englishLearningController = new EnglishLearningController();
