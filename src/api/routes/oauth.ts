import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth';
import { oauth2Controller } from '../controllers/OAuth2Controller';

const router = Router();

/**
 * Twitter OAuth 2.0 routes
 */

// Generic auth URL endpoint (for frontend)
router.get(
  '/:platform/auth-url',
  authMiddleware,
  oauth2Controller.getAuthUrl.bind(oauth2Controller)
);

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
