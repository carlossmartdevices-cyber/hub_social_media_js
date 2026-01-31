import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import axios from 'axios';
import { TwitterApi as TwitterClient } from 'twitter-api-v2';
import database from '../../database/connection';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import { ValidationService } from '../../utils/validation';
import { AuthRequest } from '../middlewares/auth';
import EncryptionService from '../../utils/encryption';

export class AuthController {
  private isLocalUrl(url: string): boolean {
    return url.includes('localhost') || url.includes('127.0.0.1');
  }

  private getXAuthRedirectUri(req: Request): string {
    const configured = config.platforms.twitter.authRedirectUri?.trim();
    if (configured) {
      return configured;
    }

    const apiUrl = config.apiUrl?.trim();
    const apiRedirect = apiUrl
      ? `${apiUrl.replace(/\/$/, '')}/api/auth/x/callback`
      : '';

    const host = req.get('host');
    const inferred = host ? `${req.protocol}://${host}/api/auth/x/callback` : '';

    if (apiUrl && !this.isLocalUrl(apiUrl)) {
      return apiRedirect;
    }

    return inferred || apiRedirect;
  }

  async register(req: Request, res: Response): Promise<Response> {
    try {
      const { email, password, name } = req.body;

      if (!ValidationService.isValidEmail(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }

      // Check if user already exists
      const existing = await database.query('SELECT id FROM users WHERE email = $1', [email]);

      if (existing.rows.length > 0) {
        return res.status(400).json({ error: 'User already exists' });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user
      const result = await database.query(
        `INSERT INTO users (id, email, password_hash, name, role, is_active)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, email, name, role`,
        [uuidv4(), email, passwordHash, name, 'user', true]
      );

      const user = result.rows[0];

      // Generate access and refresh tokens
      const accessToken = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        config.jwt.secret,
        { expiresIn: config.jwt.accessTokenExpiresIn } as jwt.SignOptions
      );

      const refreshToken = jwt.sign(
        { id: user.id, type: 'refresh' },
        config.jwt.refreshSecret,
        { expiresIn: config.jwt.refreshTokenExpiresIn } as jwt.SignOptions
      );

      logger.info(`User registered: ${email}`);

      return res.status(201).json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        accessToken,
        refreshToken,
        token: accessToken, // Backward compatibility
      });
    } catch (error) {
      logger.error('Registration error:', error);
      return res.status(500).json({ error: 'Failed to register user' });
    }
  }

  async login(req: Request, res: Response): Promise<Response> {
    try {
      const { email, password } = req.body;

      // Find user
      const result = await database.query(
        'SELECT id, email, password_hash, name, role, is_active FROM users WHERE email = $1',
        [email]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const user = result.rows[0];

      if (!user.is_active) {
        return res.status(401).json({ error: 'Account is disabled' });
      }

      // Verify password
      const validPassword = await bcrypt.compare(password, user.password_hash);

      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate access and refresh tokens
      const accessToken = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        config.jwt.secret,
        { expiresIn: config.jwt.accessTokenExpiresIn } as jwt.SignOptions
      );

      const refreshToken = jwt.sign(
        { id: user.id, type: 'refresh' },
        config.jwt.refreshSecret,
        { expiresIn: config.jwt.refreshTokenExpiresIn } as jwt.SignOptions
      );

      logger.info(`User logged in: ${email}`);

      return res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        accessToken,
        refreshToken,
        token: accessToken, // Backward compatibility
      });
    } catch (error) {
      logger.error('Login error:', error);
      return res.status(500).json({ error: 'Failed to login' });
    }
  }

  async getProfile(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.id;

      const result = await database.query(
        'SELECT id, email, name, role, created_at FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.json({ user: result.rows[0] });
    } catch (error) {
      logger.error('Get profile error:', error);
      return res.status(500).json({ error: 'Failed to get profile' });
    }
  }

  /**
   * 🟡 HIGH: Refresh token endpoint
   */
  async refresh(req: Request, res: Response): Promise<Response> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(401).json({ error: 'Refresh token is required' });
      }

      try {
        const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret) as {
          id: string;
          type: string;
          iat?: number;
          exp?: number;
        };

        if (decoded.type !== 'refresh') {
          return res.status(401).json({ error: 'Invalid token type' });
        }

        // Get user
        const result = await database.query(
          'SELECT id, email, role, is_active FROM users WHERE id = $1',
          [decoded.id]
        );

        if (result.rows.length === 0 || !result.rows[0].is_active) {
          return res.status(401).json({ error: 'User not found or inactive' });
        }

        const user = result.rows[0];

        // Generate new access token
        const newAccessToken = jwt.sign(
          { id: user.id, email: user.email, role: user.role },
          config.jwt.secret,
          { expiresIn: config.jwt.accessTokenExpiresIn } as jwt.SignOptions
        );

        return res.json({
          accessToken: newAccessToken,
          token: newAccessToken, // Backward compatibility
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Token verification failed:', errorMessage);
        return res.status(401).json({ error: 'Invalid or expired refresh token' });
      }
    } catch (error) {
      logger.error('Refresh token error:', error);
      return res.status(500).json({ error: 'Failed to refresh token' });
    }
  }

  /**
   * 🟡 HIGH: Logout endpoint
   */
  async logout(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.id;
      logger.info(`User logged out: ${userId}`);

      // Note: For stateless JWT, we can't truly "logout"
      // In production, implement a token blacklist in Redis
      return res.json({ message: 'Logged out successfully' });
    } catch (error) {
      logger.error('Logout error:', error);
      return res.status(500).json({ error: 'Failed to logout' });
    }
  }

  /**
   * Initiate X (Twitter) OAuth login/registration flow
   * GET /api/auth/x/login
   */
  initiateXLogin = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!config.platforms.twitter.clientId || !config.platforms.twitter.clientSecret) {
        res.status(500).json({
          error: 'X login is not configured. Please set TWITTER_CLIENT_ID and TWITTER_CLIENT_SECRET.',
        });
        return;
      }

      const redirectUri = this.getXAuthRedirectUri(req);

      // Generate PKCE code verifier and challenge
      const codeVerifier = crypto.randomBytes(32).toString('base64url');
      const codeChallenge = crypto
        .createHash('sha256')
        .update(codeVerifier)
        .digest('base64url');

      // Generate random state
      const state = crypto.randomBytes(32).toString('hex');

      // Store state and code verifier in the state parameter (encoded)
      const stateData = JSON.stringify({
        state,
        codeVerifier,
        redirectUri,
        purpose: 'auth', // To distinguish from account connection
      });

      const encodedState = Buffer.from(stateData).toString('base64url');

      // Build authorization URL
      const authUrl = new URL('https://twitter.com/i/oauth2/authorize');
      authUrl.searchParams.append('response_type', 'code');
      authUrl.searchParams.append('client_id', config.platforms.twitter.clientId);
      authUrl.searchParams.append('redirect_uri', redirectUri);
      authUrl.searchParams.append('scope', 'tweet.read tweet.write users.read offline.access');
      authUrl.searchParams.append('state', encodedState);
      authUrl.searchParams.append('code_challenge', codeChallenge);
      authUrl.searchParams.append('code_challenge_method', 'S256');

      res.json({ authUrl: authUrl.toString() });
    } catch (error) {
      logger.error('Error initiating X OAuth login:', error);
      res.status(500).json({ error: 'Failed to initiate X login' });
    }
  }

  /**
   * Telegram Login Widget authentication
   * POST /api/auth/telegram/callback
   * Body: Telegram auth data from widget (id, first_name, last_name, username, photo_url, auth_date, hash)
   */
  async handleTelegramCallback(req: Request, res: Response): Promise<Response> {
    try {
      const { id, first_name, last_name, username, photo_url, auth_date, hash } = req.body;

      if (!id || !hash || !auth_date) {
        return res.status(400).json({ error: 'Missing required Telegram auth data' });
      }

      // Verify Telegram auth data
      const botToken = config.platforms.telegram.botToken;

      if (!botToken) {
        return res.status(500).json({ error: 'Telegram bot not configured' });
      }

      // Create data check string
      const checkData: { [key: string]: string } = {};
      if (auth_date) checkData.auth_date = auth_date;
      if (first_name) checkData.first_name = first_name;
      if (id) checkData.id = id.toString();
      if (last_name) checkData.last_name = last_name;
      if (photo_url) checkData.photo_url = photo_url;
      if (username) checkData.username = username;

      const dataCheckString = Object.keys(checkData)
        .sort()
        .map(key => `${key}=${checkData[key]}`)
        .join('\n');

      // Generate secret key
      const secretKey = crypto.createHash('sha256').update(botToken).digest();

      // Calculate hash
      const calculatedHash = crypto
        .createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');

      // Verify hash
      if (calculatedHash !== hash) {
        return res.status(401).json({ error: 'Invalid Telegram authentication data' });
      }

      // Check if auth data is not too old (1 day)
      const authTimestamp = parseInt(auth_date, 10);
      const currentTimestamp = Math.floor(Date.now() / 1000);
      if (currentTimestamp - authTimestamp > 86400) {
        return res.status(401).json({ error: 'Telegram authentication data is too old' });
      }

      // Check if user exists with this Telegram account
      const existingResult = await database.query(
        'SELECT id, email, name, role, is_active FROM users WHERE telegram_id = $1',
        [id.toString()]
      );

      let user;

      if (existingResult.rows.length > 0) {
        // User exists - login
        user = existingResult.rows[0];

        if (!user.is_active) {
          return res.status(401).json({ error: 'Account is disabled' });
        }

        // Update Telegram profile info
        await database.query(
          `UPDATE users SET
            telegram_username = $1,
            telegram_first_name = $2,
            telegram_last_name = $3,
            telegram_photo_url = $4,
            updated_at = NOW()
          WHERE id = $5`,
          [username || null, first_name, last_name || null, photo_url || null, user.id]
        );

        logger.info(`User logged in via Telegram: ${user.email} (@${username || id})`);
      } else {
        // New user - register
        const userId = uuidv4();
        const email = username ? `${username}@telegram.temp` : `${id}@telegram.temp`;
        const name = first_name + (last_name ? ` ${last_name}` : '');

        const newUserResult = await database.query(
          `INSERT INTO users (
            id, email, name, role, is_active,
            telegram_id, telegram_username, telegram_first_name, telegram_last_name, telegram_photo_url,
            auth_provider, avatar_url
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          RETURNING id, email, name, role`,
          [
            userId,
            email,
            name,
            'user',
            true,
            id.toString(),
            username || null,
            first_name,
            last_name || null,
            photo_url || null,
            'telegram',
            photo_url || null
          ]
        );

        user = newUserResult.rows[0];
        logger.info(`User registered via Telegram: ${email} (@${username || id})`);
      }

      // Generate JWT tokens
      const accessToken = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        config.jwt.secret,
        { expiresIn: config.jwt.accessTokenExpiresIn } as jwt.SignOptions
      );

      const refreshToken = jwt.sign(
        { id: user.id, type: 'refresh' },
        config.jwt.refreshSecret,
        { expiresIn: config.jwt.refreshTokenExpiresIn } as jwt.SignOptions
      );

      return res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        accessToken,
        refreshToken,
        token: accessToken, // Backward compatibility
      });
    } catch (error) {
      logger.error('Error handling Telegram auth callback:', error);
      return res.status(500).json({ error: 'Failed to authenticate with Telegram' });
    }
  }

  /**
   * Handle X (Twitter) OAuth callback and create/login user
   * GET /api/auth/x/callback?code=...&state=...
   */
  handleXCallback = async (req: Request, res: Response): Promise<void> => {
    try {
      const { code, state: encodedState, error, error_description } = req.query;

      if (error) {
        const errorMessage = error_description || error;
        res.redirect(`${config.clientUrl}/login?error=${encodeURIComponent(errorMessage as string)}`);
        return;
      }

      if (!code || !encodedState) {
        res.redirect(`${config.clientUrl}/login?error=missing_parameters`);
        return;
      }

      // Decode state
      let stateData: { codeVerifier?: string; redirectUri?: string } = {};
      try {
        stateData = JSON.parse(Buffer.from(encodedState as string, 'base64url').toString());
      } catch (decodeError) {
        logger.error('Invalid OAuth state parameter', decodeError);
        res.redirect(`${config.clientUrl}/login?error=invalid_state`);
        return;
      }

      const redirectUri = stateData.redirectUri || this.getXAuthRedirectUri(req);
      const { codeVerifier } = stateData;

      if (!codeVerifier) {
        res.redirect(`${config.clientUrl}/login?error=missing_code_verifier`);
        return;
      }
      if (!config.platforms.twitter.clientId || !config.platforms.twitter.clientSecret) {
        res.redirect(`${config.clientUrl}/login?error=oauth_not_configured`);
        return;
      }

      // Exchange authorization code for tokens
      const tokenResponse = await axios.post(
        'https://api.twitter.com/2/oauth2/token',
        new URLSearchParams({
          code: code as string,
          grant_type: 'authorization_code',
          client_id: config.platforms.twitter.clientId,
          redirect_uri: redirectUri,
          code_verifier: codeVerifier,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${Buffer.from(
              `${config.platforms.twitter.clientId}:${config.platforms.twitter.clientSecret}`
            ).toString('base64')}`,
          },
          decompress: true, // Ensure response is decompressed
          responseType: 'json', // Ensure JSON parsing
        }
      );

      const tokens = tokenResponse.data;

      // Get user info from X/Twitter
      const twitterClient = new TwitterClient(tokens.access_token);
      const { data: twitterUser } = await twitterClient.v2.me({
        'user.fields': ['id', 'name', 'username', 'profile_image_url'],
      });

      // Check if user exists with this X account
      const existingResult = await database.query(
        'SELECT id, email, name, role, is_active FROM users WHERE x_user_id = $1',
        [twitterUser.id]
      );

      let user;

      if (existingResult.rows.length > 0) {
        // User exists - login
        user = existingResult.rows[0];

        if (!user.is_active) {
          res.redirect(`${config.clientUrl}/login?error=account_disabled`);
          return;
        }

        // Update X profile info
        await database.query(
          'UPDATE users SET x_username = $1, x_name = $2, x_profile_image = $3, updated_at = NOW() WHERE id = $4',
          [twitterUser.username, twitterUser.name, twitterUser.profile_image_url, user.id]
        );

        logger.info(`User logged in via X: ${user.email} (@${twitterUser.username})`);
      } else {
        // New user - register
        const userId = uuidv4();
        const email = `${twitterUser.username}@x.temp`; // Temporary email
        const name = twitterUser.name || twitterUser.username;

        const newUserResult = await database.query(
          `INSERT INTO users (id, email, name, role, is_active, x_user_id, x_username, x_name, x_profile_image, auth_provider)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           RETURNING id, email, name, role`,
          [userId, email, name, 'user', true, twitterUser.id, twitterUser.username, twitterUser.name, twitterUser.profile_image_url, 'x']
        );

        user = newUserResult.rows[0];

        logger.info(`User registered via X: ${email} (@${twitterUser.username})`);
      }

      // Auto-add X account to platform_credentials for immediate use
      try {
        const accountIdentifier = `@${twitterUser.username}`;
        const accountCredentials = {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
          userId: twitterUser.id,
          username: twitterUser.username,
        };

        const encryptedCredentials = EncryptionService.encrypt(JSON.stringify(accountCredentials));

        // Check if X account already exists in platform_credentials
        const existingAccount = await database.query(
          `SELECT id FROM platform_credentials
           WHERE user_id = $1 AND platform = 'twitter' AND account_identifier = $2`,
          [user.id, accountIdentifier]
        );

        if (existingAccount.rows.length > 0) {
          // Update existing X account
          await database.query(
            `UPDATE platform_credentials
             SET credentials = $1, is_active = true, last_validated = NOW(), updated_at = NOW()
             WHERE id = $2`,
            [encryptedCredentials, existingAccount.rows[0].id]
          );

          logger.info('X account updated in platform_credentials', {
            userId: user.id,
            accountIdentifier: accountIdentifier.substring(0, 3) + '***',
          });
        } else {
          // Create new X account entry
          await database.query(
            `INSERT INTO platform_credentials (user_id, platform, account_name, account_identifier, credentials, is_active)
             VALUES ($1, 'twitter', $2, $3, $4, true)`,
            [user.id, twitterUser.name || twitterUser.username, accountIdentifier, encryptedCredentials]
          );

          logger.info('X account added to platform_credentials', {
            userId: user.id,
            accountIdentifier: accountIdentifier.substring(0, 3) + '***',
          });
        }
      } catch (credentialError) {
        logger.warn('Failed to auto-add X account to platform_credentials', credentialError);
        // Continue with login even if this fails - it's non-critical
      }

      // Generate JWT tokens
      const accessToken = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        config.jwt.secret,
        { expiresIn: config.jwt.accessTokenExpiresIn } as jwt.SignOptions
      );

      const refreshToken = jwt.sign(
        { id: user.id, type: 'refresh' },
        config.jwt.refreshSecret,
        { expiresIn: config.jwt.refreshTokenExpiresIn } as jwt.SignOptions
      );

      // Redirect to frontend with tokens
      const redirectUrl = new URL(`${config.clientUrl}/auth/callback`);
      redirectUrl.searchParams.append('accessToken', accessToken);
      redirectUrl.searchParams.append('refreshToken', refreshToken);
      redirectUrl.searchParams.append('username', twitterUser.username);

      res.redirect(redirectUrl.toString());
    } catch (error) {
      logger.error('Error handling X OAuth callback:', error);
      res.redirect(`${config.clientUrl}/login?error=oauth_failed`);
    }
  }
}

export default new AuthController();
