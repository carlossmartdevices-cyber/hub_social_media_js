import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth';
import { oauth2Controller } from '../controllers/OAuth2Controller';

const router = Router();

/**
 * Twitter OAuth 2.0 routes
 */

// Start Twitter OAuth flow (requires authentication)
router.get(
  '/twitter/authorize',
  authMiddleware,
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
