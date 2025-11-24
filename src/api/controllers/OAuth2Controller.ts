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
   * Supports both JWT auth and direct userId (for Telegram bot)
   */
  async authorizeTwitter(req: AuthRequest | Request, res: Response): Promise<void> {
    try {
      // Get userId from JWT auth or query parameter (for Telegram)
      const userId = (req as AuthRequest).user?.id || (req.query.userId as string);
      
      if (!userId) {
        res.status(400).json({
          success: false,
          error: 'User ID is required',
        });
        return;
      }

      const returnUrl = req.query.returnUrl as string | undefined;
      const authUrl = oauth2Service.getTwitterAuthURL(userId, returnUrl);
      
      logger.info('Twitter OAuth authorize request:', {
        userId,
        returnUrl,
        hasJWT: !!(req as AuthRequest).user,
        authUrlPreview: authUrl.substring(0, 100) + '...'
      });

      // If request comes from browser (JWT auth), return JSON
      if ((req as AuthRequest).user) {
        res.json({
          success: true,
          authUrl,
          message: 'Redirect user to this URL to authorize',
        });
      } else {
        // If from Telegram bot, redirect directly
        res.redirect(authUrl);
      }
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

      // Check if this was from Telegram (returnUrl contains telegram-success)
      const returnUrl = result.returnUrl || '/settings';
      
      if (returnUrl.includes('telegram-success')) {
        // Show success page for Telegram users with auto-redirect
        res.send(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>✅ Cuenta Conectada</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
              }
              .container {
                text-align: center;
                padding: 40px;
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(10px);
                border-radius: 20px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                max-width: 450px;
                animation: fadeIn 0.5s ease-in;
              }
              @keyframes fadeIn {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
              }
              .icon {
                font-size: 80px;
                margin-bottom: 20px;
                animation: bounce 1s ease;
              }
              @keyframes bounce {
                0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
                40% { transform: translateY(-20px); }
                60% { transform: translateY(-10px); }
              }
              h1 {
                margin: 0 0 10px 0;
                font-size: 28px;
              }
              p {
                margin: 10px 0;
                font-size: 16px;
                opacity: 0.9;
                line-height: 1.5;
              }
              .username {
                font-weight: bold;
                color: #1DA1F2;
                font-size: 22px;
                margin: 15px 0;
                padding: 10px;
                background: rgba(29, 161, 242, 0.2);
                border-radius: 8px;
              }
              .telegram-button {
                margin-top: 30px;
                padding: 15px 40px;
                background: linear-gradient(135deg, #0088cc, #0099dd);
                color: white;
                border: none;
                border-radius: 30px;
                font-size: 18px;
                font-weight: bold;
                cursor: pointer;
                text-decoration: none;
                display: inline-block;
                box-shadow: 0 4px 15px rgba(0, 136, 204, 0.4);
                transition: all 0.3s ease;
              }
              .telegram-button:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(0, 136, 204, 0.6);
              }
              .telegram-button:active {
                transform: translateY(0);
              }
              .close-info {
                margin-top: 20px;
                font-size: 13px;
                opacity: 0.7;
              }
              code {
                background: rgba(255, 255, 255, 0.2);
                padding: 3px 8px;
                border-radius: 4px;
                font-family: 'Courier New', monospace;
              }
            </style>
            <script>
              // Try to close the window after 3 seconds (some browsers allow this)
              setTimeout(() => {
                window.close();
              }, 3000);
            </script>
          </head>
          <body>
            <div class="container">
              <div class="icon">✅</div>
              <h1>¡Cuenta Conectada!</h1>
              <p>Tu cuenta de X (Twitter)</p>
              <div class="username">@${result.accountInfo.username}</div>
              <p>se ha conectado exitosamente.</p>
              <a href="https://t.me/ContenidoPNPtvbot" class="telegram-button">
                📱 Volver a Telegram
              </a>
              <p class="close-info">
                Esta ventana se cerrará automáticamente en 3 segundos.<br>
                Usa <code>/xaccounts</code> para ver tus cuentas.
              </p>
            </div>
          </body>
          </html>
        `);
      } else {
        // Regular web dashboard redirect
        res.redirect(
          `${returnUrl}?oauth_success=true&account=${encodeURIComponent(result.accountInfo.username)}`
        );
      }
    } catch (error: any) {
      logger.error('Twitter callback error:', error);

      // Show error page for Telegram users or redirect for web
      const returnUrl = error.returnUrl || '/settings';
      
      if (returnUrl.includes('telegram-success')) {
        res.send(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>❌ Error al Conectar</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                color: white;
              }
              .container {
                text-align: center;
                padding: 40px;
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(10px);
                border-radius: 20px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                max-width: 450px;
                animation: fadeIn 0.5s ease-in;
              }
              @keyframes fadeIn {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
              }
              .icon { 
                font-size: 80px; 
                margin-bottom: 20px;
                animation: shake 0.5s ease;
              }
              @keyframes shake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-10px); }
                75% { transform: translateX(10px); }
              }
              h1 { margin: 0 0 10px 0; font-size: 28px; }
              p { margin: 10px 0; font-size: 16px; opacity: 0.9; line-height: 1.5; }
              .error { 
                font-size: 14px; 
                background: rgba(0,0,0,0.3); 
                padding: 15px; 
                border-radius: 8px; 
                margin-top: 20px;
                word-wrap: break-word;
              }
              .telegram-button {
                margin-top: 25px;
                padding: 15px 40px;
                background: linear-gradient(135deg, #0088cc, #0099dd);
                color: white;
                border: none;
                border-radius: 30px;
                font-size: 18px;
                font-weight: bold;
                cursor: pointer;
                text-decoration: none;
                display: inline-block;
                box-shadow: 0 4px 15px rgba(0, 136, 204, 0.4);
                transition: all 0.3s ease;
              }
              .telegram-button:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(0, 136, 204, 0.6);
              }
              code {
                background: rgba(255, 255, 255, 0.2);
                padding: 3px 8px;
                border-radius: 4px;
                font-family: 'Courier New', monospace;
              }
            </style>
            <script>
              // Try to close the window after 5 seconds
              setTimeout(() => {
                window.close();
              }, 5000);
            </script>
          </head>
          <body>
            <div class="container">
              <div class="icon">❌</div>
              <h1>Error al Conectar</h1>
              <p>No se pudo conectar tu cuenta de X.</p>
              <div class="error">${error.message}</div>
              <a href="https://t.me/ContenidoPNPtvbot" class="telegram-button">
                📱 Volver a Telegram
              </a>
              <p style="margin-top: 20px; font-size: 14px; opacity: 0.7;">
                Intenta de nuevo con <code>/addxaccount</code><br>
                Esta ventana se cerrará automáticamente en 5 segundos.
              </p>
            </div>
          </body>
          </html>
        `);
      } else {
        res.redirect(`/settings?oauth_error=${encodeURIComponent(error.message)}`);
      }
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
