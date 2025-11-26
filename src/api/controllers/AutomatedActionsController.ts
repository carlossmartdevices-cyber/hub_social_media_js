import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest } from '../middlewares/auth';
import database from '../../database/connection';
import { logger } from '../../utils/logger';
import { ValidationService } from '../../utils/validation';

export interface AutomatedAction {
  id: string;
  userId: string;
  name: string;
  type: 'auto_reply_inbox' | 'auto_reply_mentions' | 'scheduled_promotion' | 'auto_like' | 'auto_follow';
  platforms: string[];
  config: any;
  isEnabled: boolean;
  lastExecutedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class AutomatedActionsController {
  /**
   * Create a new automated action
   * POST /api/automated-actions
   *
   * Request body:
   * {
   *   "name": "Auto reply to mentions",
   *   "type": "auto_reply_mentions",
   *   "platforms": ["twitter"],
   *   "config": { "replyMessage": "Thank you for mentioning us!" }
   * }
   */
  async createAction(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.id;
      const { name, type, platforms, config } = req.body;

      // Validate required fields
      if (!name || !type || !platforms || !config) {
        return res.status(400).json({
          error: 'Missing required fields: name, type, platforms, and config are required'
        });
      }

      // Validate type
      const validTypes = ['auto_reply_inbox', 'auto_reply_mentions', 'scheduled_promotion', 'auto_like', 'auto_follow'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({
          error: `Invalid type. Must be one of: ${validTypes.join(', ')}`
        });
      }

      // Validate platforms
      if (!Array.isArray(platforms) || platforms.length === 0) {
        return res.status(400).json({ error: 'At least one platform is required' });
      }

      for (const platform of platforms) {
        if (!ValidationService.isValidPlatform(platform)) {
          return res.status(400).json({ error: `Invalid platform: ${platform}` });
        }
      }

      // Validate config based on type
      const configValidation = this.validateConfig(type, config);
      if (!configValidation.valid) {
        return res.status(400).json({ error: configValidation.error });
      }

      // Create action
      const id = uuidv4();
      const result = await database.query(
        `INSERT INTO automated_actions (id, user_id, name, type, platforms, config, is_enabled)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [id, userId, name, type, platforms, JSON.stringify(config), true]
      );

      logger.info('Automated action created', {
        userId,
        actionId: id,
        type,
        platforms,
      });

      return res.status(201).json({
        message: 'Automated action created successfully',
        action: this.mapActionFromDb(result.rows[0]),
      });
    } catch (error) {
      logger.error('Create automated action error:', error);
      return res.status(500).json({ error: 'Failed to create automated action' });
    }
  }

  /**
   * List all automated actions for the user
   * GET /api/automated-actions
   */
  async listActions(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.id;
      const { type, platform, enabled } = req.query;

      let query = 'SELECT * FROM automated_actions WHERE user_id = $1';
      const params: any[] = [userId];
      let paramCount = 1;

      if (type) {
        paramCount++;
        query += ` AND type = $${paramCount}`;
        params.push(type);
      }

      if (platform) {
        paramCount++;
        query += ` AND $${paramCount} = ANY(platforms)`;
        params.push(platform);
      }

      if (enabled !== undefined) {
        paramCount++;
        query += ` AND is_enabled = $${paramCount}`;
        params.push(enabled === 'true');
      }

      query += ' ORDER BY created_at DESC';

      const result = await database.query(query, params);

      return res.json({
        actions: result.rows.map(row => this.mapActionFromDb(row)),
        total: result.rowCount || 0,
      });
    } catch (error) {
      logger.error('List automated actions error:', error);
      return res.status(500).json({ error: 'Failed to list automated actions' });
    }
  }

  /**
   * Get a specific automated action
   * GET /api/automated-actions/:id
   */
  async getAction(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const result = await database.query(
        'SELECT * FROM automated_actions WHERE id = $1 AND user_id = $2',
        [id, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Automated action not found' });
      }

      return res.json({
        action: this.mapActionFromDb(result.rows[0]),
      });
    } catch (error) {
      logger.error('Get automated action error:', error);
      return res.status(500).json({ error: 'Failed to get automated action' });
    }
  }

  /**
   * Update an automated action
   * PUT /api/automated-actions/:id
   */
  async updateAction(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const { name, type, platforms, config, isEnabled } = req.body;

      // Verify ownership
      const existingResult = await database.query(
        'SELECT * FROM automated_actions WHERE id = $1 AND user_id = $2',
        [id, userId]
      );

      if (existingResult.rows.length === 0) {
        return res.status(404).json({ error: 'Automated action not found' });
      }

      const existing = existingResult.rows[0];

      // Build update query dynamically
      const updates: string[] = [];
      const params: any[] = [];
      let paramCount = 0;

      if (name !== undefined) {
        paramCount++;
        updates.push(`name = $${paramCount}`);
        params.push(name);
      }

      if (type !== undefined) {
        const validTypes = ['auto_reply_inbox', 'auto_reply_mentions', 'scheduled_promotion', 'auto_like', 'auto_follow'];
        if (!validTypes.includes(type)) {
          return res.status(400).json({
            error: `Invalid type. Must be one of: ${validTypes.join(', ')}`
          });
        }
        paramCount++;
        updates.push(`type = $${paramCount}`);
        params.push(type);
      }

      if (platforms !== undefined) {
        if (!Array.isArray(platforms) || platforms.length === 0) {
          return res.status(400).json({ error: 'At least one platform is required' });
        }
        for (const platform of platforms) {
          if (!ValidationService.isValidPlatform(platform)) {
            return res.status(400).json({ error: `Invalid platform: ${platform}` });
          }
        }
        paramCount++;
        updates.push(`platforms = $${paramCount}`);
        params.push(platforms);
      }

      if (config !== undefined) {
        const configValidation = this.validateConfig(type || existing.type, config);
        if (!configValidation.valid) {
          return res.status(400).json({ error: configValidation.error });
        }
        paramCount++;
        updates.push(`config = $${paramCount}`);
        params.push(JSON.stringify(config));
      }

      if (isEnabled !== undefined) {
        paramCount++;
        updates.push(`is_enabled = $${paramCount}`);
        params.push(isEnabled);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      paramCount++;
      params.push(id);
      paramCount++;
      params.push(userId);

      const query = `
        UPDATE automated_actions
        SET ${updates.join(', ')}, updated_at = NOW()
        WHERE id = $${paramCount - 1} AND user_id = $${paramCount}
        RETURNING *
      `;

      const result = await database.query(query, params);

      logger.info('Automated action updated', {
        userId,
        actionId: id,
      });

      return res.json({
        message: 'Automated action updated successfully',
        action: this.mapActionFromDb(result.rows[0]),
      });
    } catch (error) {
      logger.error('Update automated action error:', error);
      return res.status(500).json({ error: 'Failed to update automated action' });
    }
  }

  /**
   * Delete an automated action
   * DELETE /api/automated-actions/:id
   */
  async deleteAction(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const result = await database.query(
        'DELETE FROM automated_actions WHERE id = $1 AND user_id = $2 RETURNING id',
        [id, userId]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Automated action not found' });
      }

      logger.info('Automated action deleted', {
        userId,
        actionId: id,
      });

      return res.json({
        message: 'Automated action deleted successfully',
      });
    } catch (error) {
      logger.error('Delete automated action error:', error);
      return res.status(500).json({ error: 'Failed to delete automated action' });
    }
  }

  /**
   * Toggle an automated action (enable/disable)
   * PATCH /api/automated-actions/:id/toggle
   */
  async toggleAction(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const result = await database.query(
        `UPDATE automated_actions
         SET is_enabled = NOT is_enabled, updated_at = NOW()
         WHERE id = $1 AND user_id = $2
         RETURNING *`,
        [id, userId]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Automated action not found' });
      }

      const action = this.mapActionFromDb(result.rows[0]);

      logger.info('Automated action toggled', {
        userId,
        actionId: id,
        isEnabled: action.isEnabled,
      });

      return res.json({
        message: `Automated action ${action.isEnabled ? 'enabled' : 'disabled'} successfully`,
        action,
      });
    } catch (error) {
      logger.error('Toggle automated action error:', error);
      return res.status(500).json({ error: 'Failed to toggle automated action' });
    }
  }

  /**
   * Get execution logs for an automated action
   * GET /api/automated-actions/:id/logs
   */
  async getActionLogs(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const { limit = 50, offset = 0 } = req.query;

      // Verify ownership
      const actionResult = await database.query(
        'SELECT id FROM automated_actions WHERE id = $1 AND user_id = $2',
        [id, userId]
      );

      if (actionResult.rows.length === 0) {
        return res.status(404).json({ error: 'Automated action not found' });
      }

      // Get logs
      const logsResult = await database.query(
        `SELECT * FROM automated_action_logs
         WHERE action_id = $1
         ORDER BY executed_at DESC
         LIMIT $2 OFFSET $3`,
        [id, limit, offset]
      );

      return res.json({
        logs: logsResult.rows,
        total: logsResult.rowCount || 0,
      });
    } catch (error) {
      logger.error('Get action logs error:', error);
      return res.status(500).json({ error: 'Failed to get action logs' });
    }
  }

  /**
   * Validate config based on action type
   */
  private validateConfig(type: string, config: any): { valid: boolean; error?: string } {
    switch (type) {
      case 'auto_reply_inbox':
      case 'auto_reply_mentions':
        if (!config.replyMessage || typeof config.replyMessage !== 'string') {
          return { valid: false, error: 'Config must include a replyMessage string' };
        }
        break;

      case 'scheduled_promotion':
        if (!config.message || typeof config.message !== 'string') {
          return { valid: false, error: 'Config must include a message string' };
        }
        if (!config.frequency || !['daily', 'weekly', 'monthly'].includes(config.frequency)) {
          return { valid: false, error: 'Config must include a frequency (daily, weekly, or monthly)' };
        }
        break;

      case 'auto_like':
        if (config.keywords && !Array.isArray(config.keywords)) {
          return { valid: false, error: 'Config keywords must be an array' };
        }
        break;

      case 'auto_follow':
        if (config.criteria && typeof config.criteria !== 'object') {
          return { valid: false, error: 'Config criteria must be an object' };
        }
        break;

      default:
        return { valid: false, error: 'Unknown action type' };
    }

    return { valid: true };
  }

  /**
   * Map database row to AutomatedAction object
   */
  private mapActionFromDb(row: any): AutomatedAction {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      type: row.type,
      platforms: row.platforms,
      config: row.config,
      isEnabled: row.is_enabled,
      lastExecutedAt: row.last_executed_at ? new Date(row.last_executed_at) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

export default new AutomatedActionsController();
