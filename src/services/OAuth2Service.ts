import crypto from 'crypto';
import axios from 'axios';
import { logger } from '../utils/logger';
import database from '../database/connection';
import EncryptionService from '../utils/encryption';
import { Platform } from '../core/content/types';
import { getOAuth2Credentials } from '../utils/oauth2Config';
import cacheService from './CacheService';

interface OAuthState {
  userId: string;
  platform: string;
  codeVerifier: string;
  returnUrl?: string;
}

/**
 * OAuth2Service - Handle OAuth 2.0 flows for multiple platforms
 *
 * Supports:
 * - Twitter OAuth 2.0 with PKCE
 * - Multiple accounts per platform
 * - Secure token storage
 * - Redis-backed state storage for scalability
 */
export class OAuth2Service {
  private readonly STATE_TTL = 10 * 60; // 10 minutes in seconds
  private readonly STATE_KEY_PREFIX = 'oauth2:state:';

  /**
   * Generate PKCE code verifier and challenge
   */
  private generatePKCE() {
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');

    return { codeVerifier, codeChallenge };
  }

  /**
   * Generate random state parameter
   */
  private generateState(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Get Twitter OAuth 2.0 authorization URL
   *
   * @param userId - User ID initiating the OAuth flow
   * @param returnUrl - Optional URL to return to after OAuth
   * @returns Authorization URL to redirect user to
   * @throws Error if Twitter OAuth 2.0 is not configured
   */
  public getTwitterAuthURL(userId: string, returnUrl?: string): string {
    // Validate OAuth 2.0 configuration
    const credentials = getOAuth2Credentials(Platform.TWITTER);
    if (!credentials) {
      throw new Error(
        'Twitter OAuth 2.0 is not configured. Please set TWITTER_CLIENT_ID, TWITTER_CLIENT_SECRET, and TWITTER_REDIRECT_URI.'
      );
    }

    const { codeVerifier, codeChallenge } = this.generatePKCE();
    const state = this.generateState();

    // Store state in Redis with automatic expiration
    const stateData: OAuthState = {
      userId,
      platform: 'twitter',
      codeVerifier,
      returnUrl,
    };

    const stateKey = `${this.STATE_KEY_PREFIX}${state}`;
    cacheService.set(stateKey, stateData, this.STATE_TTL)
      .catch(error => {
        logger.error('Failed to store OAuth state in Redis:', error);
      });

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: credentials.clientId,
      redirect_uri: credentials.redirectUri,
      scope: 'tweet.read tweet.write users.read offline.access',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    logger.info('Generated Twitter OAuth URL:', {
      clientId: credentials.clientId.substring(0, 10) + '...',
      redirectUri: credentials.redirectUri,
      scope: 'tweet.read tweet.write users.read offline.access',
      userId,
    });

    return `https://twitter.com/i/oauth2/authorize?${params.toString()}`;
  }



  /**
   * Handle Twitter OAuth 2.0 callback
   *
   * @param code - Authorization code from Twitter
   * @param state - State parameter for CSRF protection
   * @returns User ID and return URL
   */
  public async handleTwitterCallback(
    code: string,
    state: string
  ): Promise<{ userId: string; returnUrl?: string; accountInfo: any }> {
    // Verify and retrieve state from Redis
    const stateKey = `${this.STATE_KEY_PREFIX}${state}`;
    const oauthState = await cacheService.get<OAuthState>(stateKey);

    if (!oauthState) {
      throw new Error('Invalid or expired state parameter');
    }

    // Clean up state from Redis
    await cacheService.del(stateKey);

    try {
      // Use the user UUID directly from OAuth state
      const userUuid = oauthState.userId;
      
      // Get validated credentials
      const oauthCredentials = getOAuth2Credentials(Platform.TWITTER);
      if (!oauthCredentials) {
        throw new Error('Twitter OAuth 2.0 credentials are not configured');
      }

      // Exchange code for access token
      const tokenResponse = await axios.post(
        'https://api.twitter.com/2/oauth2/token',
        new URLSearchParams({
          code,
          grant_type: 'authorization_code',
          client_id: oauthCredentials.clientId,
          redirect_uri: oauthCredentials.redirectUri,
          code_verifier: oauthState.codeVerifier,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${Buffer.from(
              `${oauthCredentials.clientId}:${oauthCredentials.clientSecret}`
            ).toString('base64')}`,
          },
        }
      );

      const {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: expiresIn,
      } = tokenResponse.data;

      // Get user info from Twitter
      const userResponse = await axios.get('https://api.twitter.com/2/users/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const twitterUser = userResponse.data.data;
      const accountIdentifier = `@${twitterUser.username}`;
      const accountName = twitterUser.name;

      // Store credentials
      const accountCredentials = {
        accessToken,
        refreshToken,
        expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
        userId: twitterUser.id,
        username: twitterUser.username,
      };

      const encryptedCredentials = EncryptionService.encrypt(JSON.stringify(accountCredentials));

      // Check if account already exists
      const existingAccount = await database.query(
        `SELECT id FROM platform_credentials
         WHERE user_id = $1 AND platform = 'twitter' AND account_identifier = $2`,
        [userUuid, accountIdentifier]
      );

      if (existingAccount.rows.length > 0) {
        // Update existing account
        await database.query(
          `UPDATE platform_credentials
           SET credentials = $1, is_active = true, last_validated = NOW(), updated_at = NOW()
           WHERE id = $2`,
          [encryptedCredentials, existingAccount.rows[0].id]
        );

        logger.info('Twitter account updated', {
          userId: userUuid,
          accountIdentifier: accountIdentifier.substring(0, 3) + '***',
        });
      } else {
        // Create new account
        await database.query(
          `INSERT INTO platform_credentials
           (user_id, platform, account_name, account_identifier, credentials, is_active)
           VALUES ($1, 'twitter', $2, $3, $4, true)`,
          [userUuid, accountName, accountIdentifier, encryptedCredentials]
        );

        logger.info('Twitter account connected', {
          userId: userUuid,
          accountIdentifier: accountIdentifier.substring(0, 3) + '***',
        });
      }

      return {
        userId: userUuid,
        returnUrl: oauthState.returnUrl,
        accountInfo: {
          name: accountName,
          username: twitterUser.username,
          id: twitterUser.id,
        },
      };
    } catch (error: any) {
      logger.error('Twitter OAuth callback error:', error.response?.data || error.message);
      throw new Error(`Failed to connect Twitter account: ${error.response?.data?.error_description || error.message}`);
    }
  }

  /**
   * Refresh Twitter access token
   *
   * @param accountId - Platform account ID
   * @returns Updated credentials
   */
  public async refreshTwitterToken(accountId: string): Promise<void> {
    try {
      // Get account
      const account = await database.query(
        `SELECT * FROM platform_credentials WHERE id = $1`,
        [accountId]
      );

      if (account.rows.length === 0) {
        throw new Error('Account not found');
      }

      const accountData = account.rows[0];
      if (accountData.platform !== 'twitter') {
        throw new Error('Not a Twitter account');
      }

      // Decrypt account credentials
      const storedCredentials = JSON.parse(EncryptionService.decrypt(accountData.credentials));

      if (!storedCredentials.refreshToken) {
        throw new Error('No refresh token available');
      }

      // Get validated OAuth 2.0 credentials
      const oauthCredentials = getOAuth2Credentials(Platform.TWITTER);
      if (!oauthCredentials) {
        throw new Error('Twitter OAuth 2.0 credentials are not configured');
      }

      // Refresh the token
      const tokenResponse = await axios.post(
        'https://api.twitter.com/2/oauth2/token',
        new URLSearchParams({
          refresh_token: storedCredentials.refreshToken,
          grant_type: 'refresh_token',
          client_id: oauthCredentials.clientId,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${Buffer.from(
              `${oauthCredentials.clientId}:${oauthCredentials.clientSecret}`
            ).toString('base64')}`,
          },
        }
      );

      const {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: expiresIn,
      } = tokenResponse.data;

      // Update credentials
      const updatedCredentials = {
        ...storedCredentials,
        accessToken,
        refreshToken: refreshToken || storedCredentials.refreshToken,
        expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      };

      const encryptedCredentials = EncryptionService.encrypt(JSON.stringify(updatedCredentials));

      await database.query(
        `UPDATE platform_credentials
         SET credentials = $1, last_validated = NOW(), updated_at = NOW()
         WHERE id = $2`,
        [encryptedCredentials, accountId]
      );

      logger.info('Twitter token refreshed', { accountId });
    } catch (error: any) {
      logger.error('Token refresh error:', error.response?.data || error.message);
      throw new Error(`Failed to refresh token: ${error.response?.data?.error_description || error.message}`);
    }
  }
}

export const oauth2Service = new OAuth2Service();
