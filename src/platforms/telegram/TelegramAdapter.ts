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

  async initialize(credentials: Record<string, string>): Promise<void> {
    const botToken = credentials.botToken;
    this.chatId = credentials.chatId;

    if (!botToken || botToken.trim() === '') {
      logger.warn('Telegram bot token is not configured - adapter will not be functional');
      return;
    }

    this.bot = new Telegraf(botToken);
    logger.info('Telegram adapter initialized');
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

  async publish(content: PostContent): Promise<PublishResult> {
    if (!this.bot || !this.chatId) {
      throw new Error('Telegram bot not initialized');
    }

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
      logger.error('Failed to publish Telegram message:', error);
      return {
        success: false,
        error: error.message,
        publishedAt: new Date(),
      };
    }
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
