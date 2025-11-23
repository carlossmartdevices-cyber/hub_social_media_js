import { Telegraf } from 'telegraf';
import { config } from '../config';
import { logger } from '../utils/logger';
import axios from 'axios';

export interface NotificationConfig {
  email?: string;
  telegramChatId?: string;
  webhookUrl?: string;
}

export interface PostNotification {
  postId: string;
  status: 'success' | 'failure';
  platform: string;
  error?: string;
  timestamp: Date;
  userId: string;
}

/**
 * NotificationService - Unified notification system for post publishing events
 *
 * Supports multiple notification channels:
 * - Email notifications
 * - Telegram messages
 * - Webhook callbacks
 */
export class NotificationService {
  private telegramBot: Telegraf | null = null;

  constructor() {
    // Initialize Telegram bot if configured
    if (config.platforms.telegram?.botToken) {
      try {
        this.telegramBot = new Telegraf(config.platforms.telegram.botToken);
        logger.info('NotificationService: Telegram bot initialized');
      } catch (error: any) {
        logger.error('Failed to initialize Telegram bot for notifications', {
          error: error.message
        });
      }
    }
  }

  /**
   * Send notification about post publishing result
   */
  public async notifyPostResult(
    notification: PostNotification,
    notificationConfig: NotificationConfig
  ): Promise<void> {
    const { postId, status, platform, error, timestamp } = notification;

    const message = this.formatNotificationMessage(notification);

    // Send notifications through all configured channels
    const promises: Promise<void>[] = [];

    if (notificationConfig.telegramChatId && this.telegramBot) {
      promises.push(this.sendTelegramNotification(notificationConfig.telegramChatId, message));
    }

    if (notificationConfig.webhookUrl) {
      promises.push(this.sendWebhookNotification(notificationConfig.webhookUrl, notification));
    }

    // Wait for all notifications to complete (don't fail if some fail)
    await Promise.allSettled(promises);
  }

  /**
   * Send Telegram notification
   */
  private async sendTelegramNotification(chatId: string, message: string): Promise<void> {
    if (!this.telegramBot) {
      logger.warn('Telegram bot not initialized, skipping notification');
      return;
    }

    try {
      await this.telegramBot.telegram.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
      });
      logger.info('Telegram notification sent successfully', { chatId });
    } catch (error: any) {
      logger.error('Failed to send Telegram notification', {
        error: error.message,
        chatId,
      });
    }
  }

  /**
   * Send webhook notification
   */
  private async sendWebhookNotification(
    webhookUrl: string,
    notification: PostNotification
  ): Promise<void> {
    try {
      await axios.post(
        webhookUrl,
        {
          event: 'post_published',
          data: {
            postId: notification.postId,
            status: notification.status,
            platform: notification.platform,
            error: notification.error,
            timestamp: notification.timestamp.toISOString(),
            userId: notification.userId,
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'ContentHub-Notification-Service/1.0',
          },
          timeout: 5000, // 5 second timeout
        }
      );
      logger.info('Webhook notification sent successfully', { webhookUrl });
    } catch (error: any) {
      logger.error('Failed to send webhook notification', {
        error: error.message,
        webhookUrl,
      });
    }
  }

  /**
   * Format notification message for display
   */
  private formatNotificationMessage(notification: PostNotification): string {
    const { postId, status, platform, error, timestamp } = notification;

    const emoji = status === 'success' ? '✅' : '❌';
    const statusText = status === 'success' ? 'Published Successfully' : 'Publication Failed';

    let message = `${emoji} *${statusText}*\n\n`;
    message += `*Platform:* ${platform}\n`;
    message += `*Post ID:* \`${postId}\`\n`;
    message += `*Time:* ${timestamp.toLocaleString()}\n`;

    if (error) {
      message += `\n*Error:* ${error}`;
    }

    return message;
  }

  /**
   * Notify about post failure
   */
  public async notifyFailure(
    postId: string,
    platform: string,
    error: string,
    userId: string,
    notificationConfig: NotificationConfig
  ): Promise<void> {
    await this.notifyPostResult(
      {
        postId,
        status: 'failure',
        platform,
        error,
        timestamp: new Date(),
        userId,
      },
      notificationConfig
    );
  }

  /**
   * Notify about post success
   */
  public async notifySuccess(
    postId: string,
    platform: string,
    userId: string,
    notificationConfig: NotificationConfig
  ): Promise<void> {
    await this.notifyPostResult(
      {
        postId,
        status: 'success',
        platform,
        timestamp: new Date(),
        userId,
      },
      notificationConfig
    );
  }

  /**
   * Send a batch notification for multiple posts
   */
  public async notifyBatch(
    notifications: PostNotification[],
    notificationConfig: NotificationConfig
  ): Promise<void> {
    const successCount = notifications.filter(n => n.status === 'success').length;
    const failureCount = notifications.filter(n => n.status === 'failure').length;

    let message = `📊 *Batch Publishing Summary*\n\n`;
    message += `✅ Successful: ${successCount}\n`;
    message += `❌ Failed: ${failureCount}\n`;
    message += `📝 Total: ${notifications.length}\n\n`;

    if (failureCount > 0) {
      message += `*Failed Posts:*\n`;
      notifications
        .filter(n => n.status === 'failure')
        .forEach(n => {
          message += `- ${n.platform}: ${n.postId.substring(0, 8)}...\n`;
        });
    }

    if (notificationConfig.telegramChatId && this.telegramBot) {
      await this.sendTelegramNotification(notificationConfig.telegramChatId, message);
    }

    if (notificationConfig.webhookUrl) {
      await axios.post(notificationConfig.webhookUrl, {
        event: 'batch_published',
        data: {
          successCount,
          failureCount,
          total: notifications.length,
          notifications,
        },
      }).catch(error => {
        logger.error('Failed to send batch webhook notification', { error: error.message });
      });
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
