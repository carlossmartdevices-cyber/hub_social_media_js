import database from '../database/connection';
import { logger } from '../utils/logger';
import { HubManager } from '../core/hub/HubManager';
import { Post, Platform, PostStatus } from '../core/content/types';

interface AutomatedAction {
  id: string;
  userId: string;
  name: string;
  type: 'auto_reply_inbox' | 'auto_reply_mentions' | 'scheduled_promotion' | 'auto_like' | 'auto_follow';
  platforms: string[];
  config: any;
  isEnabled: boolean;
  lastExecutedAt?: Date;
}

export class AutomatedActionsService {
  private hubManager: HubManager;
  private intervalId: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL = 60 * 1000; // Check every minute
  private isProcessing = false; // Prevent concurrent executions

  constructor() {
    this.hubManager = new HubManager();
  }

  /**
   * Start the automated actions service
   */
  start(): void {
    if (this.intervalId) {
      logger.warn('Automated actions service is already running');
      return;
    }

    logger.info('Starting automated actions service');
    this.intervalId = setInterval(() => {
      this.processActions();
    }, this.CHECK_INTERVAL);

    // Run immediately on start
    this.processActions();
  }

  /**
   * Stop the automated actions service
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('Automated actions service stopped');
    }
  }

  /**
   * Process all enabled automated actions
   */
  private async processActions(): Promise<void> {
    // Prevent concurrent executions to avoid connection pool exhaustion
    if (this.isProcessing) {
      logger.debug('Automated actions processing already in progress, skipping this cycle');
      return;
    }

    this.isProcessing = true;
    try {
      const result = await database.query(
        `SELECT * FROM automated_actions WHERE is_enabled = true`
      );

      const actions: AutomatedAction[] = result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        name: row.name,
        type: row.type,
        platforms: row.platforms,
        config: row.config,
        isEnabled: row.is_enabled,
        lastExecutedAt: row.last_executed_at ? new Date(row.last_executed_at) : undefined,
      }));

      for (const action of actions) {
        if (this.shouldExecuteAction(action)) {
          await this.executeAction(action);
        }
      }
    } catch (error) {
      logger.error('Error processing automated actions:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Determine if an action should be executed based on its last execution time
   */
  private shouldExecuteAction(action: AutomatedAction): boolean {
    if (!action.lastExecutedAt) {
      return true;
    }

    const now = new Date();
    const lastExecuted = new Date(action.lastExecutedAt);
    const timeSinceLastExecution = now.getTime() - lastExecuted.getTime();

    switch (action.type) {
      case 'auto_reply_inbox':
      case 'auto_reply_mentions':
        // Check every 5 minutes
        return timeSinceLastExecution > 5 * 60 * 1000;

      case 'scheduled_promotion':
        if (action.config.frequency === 'daily') {
          // Check if 24 hours have passed
          return timeSinceLastExecution > 24 * 60 * 60 * 1000;
        } else if (action.config.frequency === 'weekly') {
          // Check if 7 days have passed
          return timeSinceLastExecution > 7 * 24 * 60 * 60 * 1000;
        } else if (action.config.frequency === 'monthly') {
          // Check if 30 days have passed
          return timeSinceLastExecution > 30 * 24 * 60 * 60 * 1000;
        }
        return false;

      case 'auto_like':
      case 'auto_follow':
        // Check every 30 minutes
        return timeSinceLastExecution > 30 * 60 * 1000;

      default:
        return false;
    }
  }

  /**
   * Execute a specific automated action
   */
  private async executeAction(action: AutomatedAction): Promise<void> {
    try {
      logger.info(`Executing automated action: ${action.name} (${action.type})`);

      let success = false;
      let error: string | null = null;

      switch (action.type) {
        case 'auto_reply_inbox':
          success = await this.executeAutoReplyInbox(action);
          break;

        case 'auto_reply_mentions':
          success = await this.executeAutoReplyMentions(action);
          break;

        case 'scheduled_promotion':
          success = await this.executeScheduledPromotion(action);
          break;

        case 'auto_like':
          success = await this.executeAutoLike(action);
          break;

        case 'auto_follow':
          success = await this.executeAutoFollow(action);
          break;

        default:
          error = `Unknown action type: ${action.type}`;
      }

      // Update last executed time
      await database.query(
        'UPDATE automated_actions SET last_executed_at = NOW() WHERE id = $1',
        [action.id]
      );

      // Log execution
      for (const platform of action.platforms) {
        await database.query(
          `INSERT INTO automated_action_logs (action_id, platform, status, details, error)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            action.id,
            platform,
            success ? 'success' : 'failure',
            JSON.stringify({ timestamp: new Date() }),
            error,
          ]
        );
      }

      logger.info(`Automated action executed: ${action.name} - ${success ? 'success' : 'failure'}`);
    } catch (error) {
      logger.error(`Error executing automated action ${action.name}:`, error);

      // Log failure
      for (const platform of action.platforms) {
        await database.query(
          `INSERT INTO automated_action_logs (action_id, platform, status, error)
           VALUES ($1, $2, $3, $4)`,
          [
            action.id,
            platform,
            'failure',
            error instanceof Error ? error.message : 'Unknown error',
          ]
        );
      }
    }
  }

  /**
   * Execute auto-reply to inbox messages
   */
  private async executeAutoReplyInbox(action: AutomatedAction): Promise<boolean> {
    logger.info('Auto-reply inbox execution - placeholder', {
      actionId: action.id,
      replyMessage: action.config.replyMessage,
    });

    // Placeholder implementation
    // In a real implementation, this would:
    // 1. Connect to each platform's API
    // 2. Fetch unread inbox messages
    // 3. Reply with the configured message
    // 4. Mark messages as handled

    return true;
  }

  /**
   * Execute auto-reply to mentions
   */
  private async executeAutoReplyMentions(action: AutomatedAction): Promise<boolean> {
    logger.info('Auto-reply mentions execution - placeholder', {
      actionId: action.id,
      replyMessage: action.config.replyMessage,
    });

    // Placeholder implementation
    // In a real implementation, this would:
    // 1. Connect to each platform's API
    // 2. Fetch recent mentions
    // 3. Reply with the configured message
    // 4. Track replied mentions to avoid duplicates

    return true;
  }

  /**
   * Execute scheduled promotion
   */
  private async executeScheduledPromotion(action: AutomatedAction): Promise<boolean> {
    try {
      logger.info('Scheduled promotion execution', {
        actionId: action.id,
        message: action.config.message,
        frequency: action.config.frequency,
      });

      // Create a post using the HubManager
      const post: Post = {
        id: `promo-${Date.now()}`,
        userId: action.userId,
        platforms: action.platforms as Platform[],
        content: {
          text: action.config.message,
          hashtags: action.config.hashtags || [],
          link: action.config.link,
        },
        scheduledAt: new Date(),
        status: PostStatus.SCHEDULED,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await this.hubManager.schedulePost(post, action.userId);

      logger.info('Scheduled promotion posted successfully', {
        actionId: action.id,
      });

      return true;
    } catch (error) {
      logger.error('Error executing scheduled promotion:', error);
      return false;
    }
  }

  /**
   * Execute auto-like
   */
  private async executeAutoLike(action: AutomatedAction): Promise<boolean> {
    logger.info('Auto-like execution - placeholder', {
      actionId: action.id,
      keywords: action.config.keywords,
    });

    // Placeholder implementation
    // In a real implementation, this would:
    // 1. Connect to each platform's API
    // 2. Search for posts matching keywords
    // 3. Like posts that match criteria
    // 4. Track liked posts to avoid duplicates

    return true;
  }

  /**
   * Execute auto-follow
   */
  private async executeAutoFollow(action: AutomatedAction): Promise<boolean> {
    logger.info('Auto-follow execution - placeholder', {
      actionId: action.id,
      criteria: action.config.criteria,
    });

    // Placeholder implementation
    // In a real implementation, this would:
    // 1. Connect to each platform's API
    // 2. Search for users matching criteria
    // 3. Follow users that match
    // 4. Track followed users to avoid duplicates

    return true;
  }

  /**
   * Manually execute an action (for testing or immediate execution)
   */
  async executeActionManually(actionId: string): Promise<{ success: boolean; message: string }> {
    try {
      const result = await database.query(
        'SELECT * FROM automated_actions WHERE id = $1',
        [actionId]
      );

      if (result.rows.length === 0) {
        return { success: false, message: 'Action not found' };
      }

      const row = result.rows[0];
      const action: AutomatedAction = {
        id: row.id,
        userId: row.user_id,
        name: row.name,
        type: row.type,
        platforms: row.platforms,
        config: row.config,
        isEnabled: row.is_enabled,
        lastExecutedAt: row.last_executed_at ? new Date(row.last_executed_at) : undefined,
      };

      await this.executeAction(action);

      return { success: true, message: 'Action executed successfully' };
    } catch (error) {
      logger.error('Error executing action manually:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export default new AutomatedActionsService();
