import { Telegraf } from 'telegraf';
import {
  PlatformAdapter,
  PlatformRequirements,
  PublishResult,
} from '../base/PlatformAdapter';
import { PostContent, Platform, PlatformMetrics } from '../../core/content/types';
import { logger } from '../../utils/logger';

export class TelegramAdapter extends PlatformAdapter {
  private bot?: Telegraf;
  private chatId?: string;

  constructor() {
    super(Platform.TELEGRAM);
  }

  /**
   * 🔴 CRITICAL FIX: Validate chat ID format
   * 🟡 HIGH: Added bot verification
   * ✅ IMPROVED: Tolerant with partial/empty credentials for startup
   */
  async initialize(credentials: Record<string, string>): Promise<void> {
    const botToken = credentials.botToken;
    this.chatId = credentials.chatId;

    if (!botToken || botToken.trim() === '') {
      logger.warn('Telegram bot token is not configured - adapter will not be functional');
      this.bot = undefined;
      this.chatId = undefined;
      return;
    }

    // Validate chat ID format only if provided
    if (this.chatId && this.chatId.trim() !== '' && !this.isValidChatId(this.chatId)) {
      throw new Error(
        `Invalid Telegram chat ID format: "${this.chatId}". ` +
        `Expected formats: @username, -100123456789 (supergroups), or 123456789 (users)`
      );
    }

    this.bot = new Telegraf(botToken);

    // Verify bot token and chat access
    try {
      const botInfo = await this.bot.telegram.getMe();
      logger.info(`Telegram bot initialized: @${botInfo.username}`);

      if (this.chatId && this.chatId.trim() !== '') {
        try {
          await this.bot.telegram.getChat(this.chatId);
          logger.info(`Telegram bot has access to chat: ${this.chatId}`);
        } catch (error: any) {
          logger.error(`Bot does not have access to chat ${this.chatId}:`, error.message);
          throw new Error(
            `Bot cannot access chat ${this.chatId}. Make sure the bot is added to the chat.`
          );
        }
      } else {
        logger.warn('Telegram chat ID is not configured - bot initialized but cannot publish');
      }
    } catch (error: any) {
      logger.error('Telegram bot initialization failed:', error);
      // Clear bot instance on failure
      this.bot = undefined;
      this.chatId = undefined;
      throw new Error(`Telegram bot validation failed: ${error.message}`);
    }
  }

  /**
   * Validate Telegram chat ID format
   */
  private isValidChatId(chatId: string): boolean {
    if (chatId.startsWith('@')) {
      return /^@[a-zA-Z0-9_]{5,32}$/.test(chatId);
    }
    return /^-?\d+$/.test(chatId);
  }

  getRequirements(): PlatformRequirements {
    return {
      maxTextLength: 4096,
      maxMediaCount: 10,
      supportedMediaTypes: [
        'image/jpeg',
        'image/png',
        'image/gif',
        'video/mp4',
        'application/pdf',
      ],
      maxImageSize: 10 * 1024 * 1024, // 10MB
      maxVideoSize: 50 * 1024 * 1024, // 50MB
      supportsHashtags: true,
      supportsMentions: true,
      supportsScheduling: false,
    };
  }

  /**
   * 🟡 HIGH: Added retry logic with exponential backoff
   */
  async publish(content: PostContent): Promise<PublishResult> {
    if (!this.bot || !this.chatId) {
      throw new Error('Telegram bot not initialized');
    }

    const maxRetries = 3;
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const validation = await this.validateContent(content);
        if (!validation.valid) {
          throw new Error(`Content validation failed: ${validation.errors.join(', ')}`);
        }

        let messageId: number;

        if (content.media && content.media.length > 0) {
          const media = content.media[0];

          if (media.type === 'image') {
            if (!media.buffer) {
              throw new Error('Media buffer is required');
            }
            const result = await this.bot.telegram.sendPhoto(
              this.chatId,
              { source: media.buffer },
              { caption: content.text }
            );
            messageId = result.message_id;
          } else if (media.type === 'video') {
            if (!media.buffer) {
              throw new Error('Media buffer is required');
            }
            const result = await this.bot.telegram.sendVideo(
              this.chatId,
              { source: media.buffer },
              { caption: content.text }
            );
            messageId = result.message_id;
          } else {
            const result = await this.bot.telegram.sendMessage(this.chatId, content.text);
            messageId = result.message_id;
          }
        } else {
          const result = await this.bot.telegram.sendMessage(this.chatId, content.text);
          messageId = result.message_id;
        }

        logger.info(`Telegram message published successfully: ${messageId}`);

        return {
          success: true,
          platformPostId: messageId.toString(),
          publishedAt: new Date(),
        };
      } catch (error: any) {
        lastError = error;

        // Handle specific Telegram errors
        if (error.response?.error_code === 403) {
          logger.error('Bot was blocked by user or kicked from chat');
          return {
            success: false,
            error: 'Bot has no access to this chat. Bot may have been blocked or removed.',
            publishedAt: new Date(),
          };
        } else if (error.response?.error_code === 400) {
          logger.error('Invalid request to Telegram API:', error.message);
          return {
            success: false,
            error: `Invalid request: ${error.message}`,
            publishedAt: new Date(),
          };
        } else if (error.response?.error_code === 429) {
          const retryAfter = error.response?.parameters?.retry_after || (attempt * 2);
          logger.warn(
            `Telegram rate limit hit. Attempt ${attempt}/${maxRetries}. Retrying after ${retryAfter}s...`
          );
          if (attempt < maxRetries) {
            await this.sleep(retryAfter * 1000);
            continue;
          }
        } else if ([500, 502, 503, 504].includes(error.response?.error_code)) {
          const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          logger.warn(
            `Temporary error on attempt ${attempt}/${maxRetries}. Retrying in ${backoffMs}ms...`
          );
          if (attempt < maxRetries) {
            await this.sleep(backoffMs);
            continue;
          }
        }

        logger.error(`Failed to publish Telegram message (attempt ${attempt}):`, error);
        if (attempt === maxRetries) {
          return {
            success: false,
            error: error.message || 'Failed to publish message after multiple attempts',
            publishedAt: new Date(),
          };
        }
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Unknown error',
      publishedAt: new Date(),
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async getMetrics(platformPostId: string): Promise<PlatformMetrics> {
    // Telegram doesn't provide public engagement metrics for bot messages
    // This would require the MTProto API or business features
    return {
      platform: Platform.TELEGRAM,
      postId: platformPostId,
      likes: 0,
      shares: 0,
      comments: 0,
      views: 0,
      engagement: 0,
      timestamp: new Date(),
    };
  }

  async validateCredentials(): Promise<boolean> {
    if (!this.bot) {
      return false;
    }

    try {
      await this.bot.telegram.getMe();
      return true;
    } catch (error) {
      logger.error('Telegram credentials validation failed:', error);
      return false;
    }
  }
}
