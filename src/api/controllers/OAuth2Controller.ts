import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { oauth2Service } from '../../services/OAuth2Service';
import { logger } from '../../utils/logger';

/**
 * OAuth2Controller - Handle OAuth 2.0 flows for social platforms
 */
export class OAuth2Controller {
  /**
   * GET /api/oauth/twitter/authorize
   * Start Twitter OAuth 2.0 flow
   */
  async authorizeTwitter(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const returnUrl = req.query.returnUrl as string | undefined;

      const authUrl = oauth2Service.getTwitterAuthURL(userId, returnUrl);

      res.json({
        success: true,
        authUrl,
        message: 'Redirect user to this URL to authorize',
      });
    } catch (error: any) {
      logger.error('Twitter authorize error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate authorization URL',
      });
    }
  }

  /**
   * GET /api/oauth/twitter/callback
   * Handle Twitter OAuth 2.0 callback
   *
   * This endpoint is called by Twitter after user authorizes
   */
  async twitterCallback(req: Request, res: Response): Promise<void> {
    try {
      const { code, state, error, error_description } = req.query;

      // Handle OAuth error
      if (error) {
        const errorMessage = error_description || error;
        logger.error('Twitter OAuth error:', errorMessage);

        // Redirect to frontend with error
        res.redirect(`/settings?oauth_error=${encodeURIComponent(errorMessage as string)}`);
        return;
      }

      if (!code || !state) {
        res.status(400).json({
          success: false,
          error: 'Missing code or state parameter',
        });
        return;
      }

      // Process the callback
      const result = await oauth2Service.handleTwitterCallback(
        code as string,
        state as string
      );

      logger.info('Twitter account connected successfully', {
        userId: result.userId,
        account: result.accountInfo.username ? result.accountInfo.username.substring(0, 3) + '***' : 'unknown',
      });

      // Redirect to frontend with success
      const returnUrl = result.returnUrl || '/settings';
      res.redirect(
        `${returnUrl}?oauth_success=true&account=${encodeURIComponent(result.accountInfo.username)}`
      );
    } catch (error: any) {
      logger.error('Twitter callback error:', error);

      // Redirect to frontend with error
      res.redirect(`/settings?oauth_error=${encodeURIComponent(error.message)}`);
    }
  }

  /**
   * POST /api/oauth/twitter/refresh/:accountId
   * Refresh Twitter access token
   */
  async refreshTwitterToken(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.id;
      const { accountId } = req.params;

      // Verify account ownership
      const { default: database } = await import('../../database/connection');
      const account = await database.query(
        `SELECT id FROM platform_credentials WHERE id = $1 AND user_id = $2`,
        [accountId, userId]
      );

      if (account.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Account not found',
        });
      }

      await oauth2Service.refreshTwitterToken(accountId);

      return res.json({
        success: true,
        message: 'Token refreshed successfully',
      });
    } catch (error: any) {
      logger.error('Refresh token error:', error);
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
}

export const oauth2Controller = new OAuth2Controller();
