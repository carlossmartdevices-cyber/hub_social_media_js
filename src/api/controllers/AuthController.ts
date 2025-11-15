import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import database from '../../database/connection';
import config from '../../config';
import { logger } from '../../utils/logger';
import { ValidationService } from '../../utils/validation';

export class AuthController {
  async register(req: Request, res: Response) {
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

      // 🟡 HIGH: Generate access and refresh tokens
      const accessToken = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        config.jwt.secret,
        { expiresIn: config.jwt.accessTokenExpiresIn }
      );

      const refreshToken = jwt.sign(
        { id: user.id, type: 'refresh' },
        config.jwt.refreshSecret,
        { expiresIn: config.jwt.refreshTokenExpiresIn }
      );

      logger.info(`User registered: ${email}`);

      res.status(201).json({
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
      res.status(500).json({ error: 'Failed to register user' });
    }
  }

  async login(req: Request, res: Response) {
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

      // 🟡 HIGH: Generate access and refresh tokens
      const accessToken = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        config.jwt.secret,
        { expiresIn: config.jwt.accessTokenExpiresIn }
      );

      const refreshToken = jwt.sign(
        { id: user.id, type: 'refresh' },
        config.jwt.refreshSecret,
        { expiresIn: config.jwt.refreshTokenExpiresIn }
      );

      logger.info(`User logged in: ${email}`);

      res.json({
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
      res.status(500).json({ error: 'Failed to login' });
    }
  }

  async getProfile(req: any, res: Response) {
    try {
      const userId = req.user.id;

      const result = await database.query(
        'SELECT id, email, name, role, created_at FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ user: result.rows[0] });
    } catch (error) {
      logger.error('Get profile error:', error);
      res.status(500).json({ error: 'Failed to get profile' });
    }
  }

  /**
   * 🟡 HIGH: Refresh token endpoint
   */
  async refresh(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(401).json({ error: 'Refresh token is required' });
      }

      try {
        const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret) as any;

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
          { expiresIn: config.jwt.accessTokenExpiresIn }
        );

        res.json({
          accessToken: newAccessToken,
          token: newAccessToken, // Backward compatibility
        });
      } catch (error: any) {
        logger.error('Token verification failed:', error.message);
        return res.status(401).json({ error: 'Invalid or expired refresh token' });
      }
    } catch (error) {
      logger.error('Refresh token error:', error);
      res.status(500).json({ error: 'Failed to refresh token' });
    }
  }

  /**
   * 🟡 HIGH: Logout endpoint
   */
  async logout(req: any, res: Response) {
    try {
      const userId = req.user.id;
      logger.info(`User logged out: ${userId}`);

      // Note: For stateless JWT, we can't truly "logout"
      // In production, implement a token blacklist in Redis
      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      logger.error('Logout error:', error);
      res.status(500).json({ error: 'Failed to logout' });
    }
  }
}

export default new AuthController();
