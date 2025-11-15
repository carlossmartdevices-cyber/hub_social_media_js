import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest } from '../middlewares/auth';
import { Platform } from '../../core/content/types';
import { PlatformFactory } from '../../platforms';
import { EncryptionService } from '../../utils/encryption';
import { ValidationService } from '../../utils/validation';
import { logger } from '../../utils/logger';
import database from '../../database/connection';

export class PlatformController {
  async addCredentials(req: AuthRequest, res: Response) {
    try {
      const { platform, credentials } = req.body;
      const userId = req.user!.id;

      if (!ValidationService.isValidPlatform(platform)) {
        return res.status(400).json({ error: 'Invalid platform' });
      }

      // Validate credentials by attempting to initialize adapter
      const adapter = PlatformFactory.createAdapter(platform as Platform);
      await adapter.initialize(credentials);
      const isValid = await adapter.validateCredentials();

      if (!isValid) {
        return res.status(400).json({ error: 'Invalid credentials' });
      }

      // Encrypt credentials
      const encrypted = EncryptionService.encrypt(JSON.stringify(credentials));

      // Store in database
      await database.query(
        `INSERT INTO platform_credentials (id, user_id, platform, credentials, is_active, last_validated)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id, platform)
         DO UPDATE SET credentials = $4, is_active = $5, last_validated = CURRENT_TIMESTAMP`,
        [uuidv4(), userId, platform, encrypted, true]
      );

      logger.info(`Credentials added for ${platform} by user ${userId}`);

      res.status(201).json({
        message: 'Credentials added successfully',
        platform,
      });
    } catch (error) {
      logger.error('Add credentials error:', error);
      res.status(500).json({ error: 'Failed to add credentials' });
    }
  }

  async listCredentials(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;

      const result = await database.query(
        `SELECT platform, is_active, last_validated, created_at
         FROM platform_credentials
         WHERE user_id = $1`,
        [userId]
      );

      res.json({ credentials: result.rows });
    } catch (error) {
      logger.error('List credentials error:', error);
      res.status(500).json({ error: 'Failed to list credentials' });
    }
  }

  async removeCredentials(req: AuthRequest, res: Response) {
    try {
      const { platform } = req.params;
      const userId = req.user!.id;

      await database.query(
        'DELETE FROM platform_credentials WHERE user_id = $1 AND platform = $2',
        [userId, platform]
      );

      logger.info(`Credentials removed for ${platform} by user ${userId}`);

      res.json({ message: 'Credentials removed successfully' });
    } catch (error) {
      logger.error('Remove credentials error:', error);
      res.status(500).json({ error: 'Failed to remove credentials' });
    }
  }

  async getSupportedPlatforms(req: AuthRequest, res: Response) {
    try {
      const platforms = PlatformFactory.getSupportedPlatforms();
      res.json({ platforms });
    } catch (error) {
      logger.error('Get supported platforms error:', error);
      res.status(500).json({ error: 'Failed to get supported platforms' });
    }
  }
}

export default new PlatformController();
