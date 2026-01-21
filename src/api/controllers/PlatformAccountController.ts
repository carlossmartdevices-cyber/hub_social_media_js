import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import database from '../../database/connection';
import { logger } from '../../utils/logger';
import EncryptionService from '../../utils/encryption';
import { ValidationService } from '../../utils/validation';

/** Database row type for platform_credentials table */
interface PlatformCredentialRow {
  id: string;
  user_id: string;
  platform: string;
  account_name: string;
  account_identifier: string;
  credentials: string;
  is_active: boolean;
  last_validated: Date | null;
  created_at: Date;
  updated_at?: Date;
}

/**
 * PlatformAccountController - Manage multiple platform accounts per user
 */
export class PlatformAccountController {
  /**
   * GET /api/platform-accounts
   * List all platform accounts for the authenticated user
   */
  async listAccounts(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.id;
      const { platform } = req.query;

      let query = `
        SELECT id, user_id, platform, account_name, account_identifier, is_active, last_validated, created_at
        FROM platform_credentials
        WHERE user_id = $1
      `;
      const params: (string | number)[] = [userId];

      if (platform) {
        query += ` AND platform = $2`;
        params.push(String(platform));
      }

      query += ` ORDER BY platform, account_name`;

      const result = await database.query(query, params);

      // Transform data to match frontend expectations
      const accounts = result.rows.map((row: PlatformCredentialRow) => ({
        id: row.id,
        platform: row.platform,
        accountName: row.account_name,
        accountId: row.account_identifier,
        isConnected: row.is_active,
        profileUrl: this.getProfileUrl(row.platform, row.account_identifier),
        lastValidated: row.last_validated,
        createdAt: row.created_at,
      }));

      return res.json(accounts);
    } catch (error: unknown) {
      logger.error('List accounts error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to list accounts',
      });
    }
  }

  /**
   * Get profile URL for a platform account
   */
  private getProfileUrl(platform: string, accountIdentifier: string): string | undefined {
    const urlMap: Record<string, (id: string) => string> = {
      twitter: (id) => `https://twitter.com/${id.replace('@', '')}`,
      instagram: (id) => `https://instagram.com/${id.replace('@', '')}`,
      facebook: (id) => `https://facebook.com/${id}`,
      linkedin: (id) => `https://linkedin.com/in/${id}`,
      youtube: (id) => `https://youtube.com/${id}`,
      tiktok: (id) => `https://tiktok.com/@${id.replace('@', '')}`,
      telegram: (id) => `https://t.me/${id.replace('@', '')}`,
    };

    const urlBuilder = urlMap[platform.toLowerCase()];
    return urlBuilder ? urlBuilder(accountIdentifier) : undefined;
  }

  /**
   * POST /api/platform-accounts
   * Add a new platform account
   *
   * Body:
   * {
   *   "platform": "twitter",
   *   "accountName": "My Personal Account",
   *   "accountIdentifier": "@myhandle",
   *   "credentials": {
   *     "apiKey": "...",
   *     "apiSecret": "...",
   *     "accessToken": "...",
   *     "accessTokenSecret": "..."
   *   }
   * }
   */
  async addAccount(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.id;
      const { platform, accountName, accountIdentifier, credentials } = req.body;

      // Validate platform
      if (!ValidationService.isValidPlatform(platform)) {
        return res.status(400).json({
          success: false,
          error: `Invalid platform: ${platform}`,
        });
      }

      // Validate required fields
      if (!accountName || !accountIdentifier || !credentials) {
        return res.status(400).json({
          success: false,
          error: 'accountName, accountIdentifier, and credentials are required',
        });
      }

      // Validate credentials based on platform
      const validationError = this.validatePlatformCredentials(platform, credentials);
      if (validationError) {
        return res.status(400).json({
          success: false,
          error: validationError,
        });
      }

      // Check if account already exists
      const existingAccount = await database.query(
        `SELECT id FROM platform_credentials
         WHERE user_id = $1 AND platform = $2 AND account_identifier = $3`,
        [userId, platform, accountIdentifier]
      );

      if (existingAccount.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Account ${accountIdentifier} for ${platform} already exists`,
        });
      }

      // Encrypt credentials
      const encryptedCredentials = EncryptionService.encrypt(JSON.stringify(credentials));

      // Insert new account
      const result = await database.query(
        `INSERT INTO platform_credentials
         (user_id, platform, account_name, account_identifier, credentials, is_active)
         VALUES ($1, $2, $3, $4, $5, true)
         RETURNING id, platform, account_name, account_identifier, is_active, created_at`,
        [userId, platform, accountName, accountIdentifier, encryptedCredentials]
      );

      logger.info('Platform account added', {
        userId,
        platform,
        accountIdentifier,
      });

      return res.status(201).json({
        success: true,
        message: 'Account added successfully',
        account: result.rows[0],
      });
    } catch (error: unknown) {
      logger.error('Add account error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to add account',
      });
    }
  }

  /**
   * PATCH /api/platform-accounts/:id
   * Update a platform account
   */
  async updateAccount(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const { accountName, credentials, isActive } = req.body;

      // Verify ownership
      const account = await database.query(
        `SELECT * FROM platform_credentials WHERE id = $1 AND user_id = $2`,
        [id, userId]
      );

      if (account.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Account not found',
        });
      }

      const updates: string[] = [];
      const values: (string | number | boolean)[] = [];
      let paramCount = 1;

      if (accountName !== undefined) {
        updates.push(`account_name = $${paramCount}`);
        values.push(accountName);
        paramCount++;
      }

      if (credentials !== undefined) {
        const platform = account.rows[0].platform;
        const validationError = this.validatePlatformCredentials(platform, credentials);
        if (validationError) {
          return res.status(400).json({
            success: false,
            error: validationError,
          });
        }

        const encryptedCredentials = EncryptionService.encrypt(JSON.stringify(credentials));
        updates.push(`credentials = $${paramCount}`);
        values.push(encryptedCredentials);
        paramCount++;
      }

      if (isActive !== undefined) {
        updates.push(`is_active = $${paramCount}`);
        values.push(isActive);
        paramCount++;
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No fields to update',
        });
      }

      updates.push(`updated_at = NOW()`);
      values.push(id, userId);

      const query = `
        UPDATE platform_credentials
        SET ${updates.join(', ')}
        WHERE id = $${paramCount} AND user_id = $${paramCount + 1}
        RETURNING id, platform, account_name, account_identifier, is_active, updated_at
      `;

      const result = await database.query(query, values);

      logger.info('Platform account updated', { userId, accountId: id });

      return res.json({
        success: true,
        message: 'Account updated successfully',
        account: result.rows[0],
      });
    } catch (error: unknown) {
      logger.error('Update account error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update account',
      });
    }
  }

  /**
   * DELETE /api/platform-accounts/:id
   * Delete a platform account
   */
  async deleteAccount(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const result = await database.query(
        `DELETE FROM platform_credentials
         WHERE id = $1 AND user_id = $2
         RETURNING id`,
        [id, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Account not found',
        });
      }

      logger.info('Platform account deleted', { userId, accountId: id });

      return res.json({
        success: true,
        message: 'Account deleted successfully',
      });
    } catch (error: unknown) {
      logger.error('Delete account error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete account',
      });
    }
  }

  /**
   * POST /api/platform-accounts/:id/test
   * Test platform account credentials
   */
  async testAccount(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      // Get account
      const account = await database.query(
        `SELECT * FROM platform_credentials WHERE id = $1 AND user_id = $2`,
        [id, userId]
      );

      if (account.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Account not found',
        });
      }

      const accountData = account.rows[0];
      const credentials = JSON.parse(EncryptionService.decrypt(accountData.credentials));

      // Try to initialize the platform adapter
      try {
        const { PlatformFactory } = await import('../../platforms');
        const adapter = PlatformFactory.createAdapter(accountData.platform);
        await adapter.initialize(credentials);

        // Update last validated timestamp
        await database.query(
          `UPDATE platform_credentials SET last_validated = NOW() WHERE id = $1`,
          [id]
        );

        return res.json({
          success: true,
          message: 'Account credentials are valid',
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return res.status(400).json({
          success: false,
          error: `Credentials test failed: ${errorMessage}`,
        });
      }
    } catch (error: unknown) {
      logger.error('Test account error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to test account',
      });
    }
  }

  /**
   * Validate platform-specific credentials
   */
  private validatePlatformCredentials(
    platform: string,
    credentials: Record<string, string>
  ): string | null {
    const required: Record<string, string[]> = {
      twitter: ['apiKey', 'apiSecret', 'accessToken', 'accessTokenSecret'],
      telegram: ['botToken'],
      instagram: ['username', 'password'],
      facebook: ['accessToken', 'pageId'],
      linkedin: ['accessToken'],
      youtube: ['apiKey'],
    };

    const requiredFields = required[platform.toLowerCase()];
    if (!requiredFields) {
      return `Unknown platform: ${platform}`;
    }

    for (const field of requiredFields) {
      if (!credentials[field]) {
        return `Missing required field: ${field}`;
      }
    }

    return null;
  }
}

export const platformAccountController = new PlatformAccountController();
