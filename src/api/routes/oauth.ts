import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth';
import { oauth2Controller } from '../controllers/OAuth2Controller';

const router = Router();

/**
 * OAuth 2.0 Configuration Routes
 */

// Get OAuth 2.0 configuration (public - no authentication required)
router.get('/config', oauth2Controller.getOAuth2Config.bind(oauth2Controller));

/**
 * Generic OAuth routes
 */

// Get OAuth authorization URL for any platform (requires JWT authentication)
router.get(
  '/:platform/auth-url',
  authMiddleware,
  oauth2Controller.getAuthUrl.bind(oauth2Controller)
);

/**
 * Twitter OAuth 2.0 routes
 */

// Start Twitter OAuth flow (optional authentication - supports Telegram bot)
router.get(
  '/twitter/authorize',
  (req, res, next) => {
    // Skip auth if userId is provided (Telegram bot)
    if (req.query.userId) {
      return next();
    }
    // Otherwise require JWT authentication
    return authMiddleware(req, res, next);
  },
  oauth2Controller.authorizeTwitter.bind(oauth2Controller)
);

// Twitter OAuth callback (no authentication required - Twitter calls this)
router.get('/twitter/callback', oauth2Controller.twitterCallback.bind(oauth2Controller));

// Refresh Twitter token
router.post(
  '/twitter/refresh/:accountId',
  authMiddleware,
  oauth2Controller.refreshTwitterToken.bind(oauth2Controller)
);

export default router;
