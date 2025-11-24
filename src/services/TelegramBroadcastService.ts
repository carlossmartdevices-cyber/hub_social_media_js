import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { config } from '../config';
import logger from '../utils/logger';
import aiContentGenerationService from './AIContentGenerationService';

interface TelegramChannel {
  id: string;
  type: 'channel' | 'group' | 'supergroup';
  title: string;
  username?: string; // @channelname
  chatId: string; // Numeric ID or @username
}

// BroadcastMessage interface removed - not used

export interface BroadcastResult {
  channelId: string;
  channelTitle: string;
  success: boolean;
  messageId?: number;
  error?: string;
}

interface VideoUploadResult {
  fileId: string;
  fileSize: number;
  duration: number;
  thumbnailFileId?: string;
}

/**
 * Telegram Broadcast Service
 *
 * Handles broadcasting messages and videos to multiple Telegram channels/groups
 * with AI-generated descriptions
 */
export class TelegramBroadcastService {
  private botToken: string;
  private apiBaseUrl: string;

  constructor() {
    this.botToken = config.platforms?.telegram?.botToken || process.env.TELEGRAM_BOT_TOKEN || '';
    this.apiBaseUrl = `https://api.telegram.org/bot${this.botToken}`;
  }

  /**
   * Upload video to Telegram servers (supports large files)
   */
  /**
   * Validate file path to prevent path traversal attacks
   */
  private validateFilePath(filePath: string, allowedDir?: string): string {
    const resolvedPath = path.resolve(filePath);

    // If an allowed directory is specified, ensure path is within it
    if (allowedDir) {
      const resolvedAllowedDir = path.resolve(allowedDir);
      if (!resolvedPath.startsWith(resolvedAllowedDir + path.sep) && resolvedPath !== resolvedAllowedDir) {
        throw new Error('Path traversal attempt detected');
      }
    }

    // Check for common path traversal patterns
    if (filePath.includes('..') || filePath.includes('\0')) {
      throw new Error('Invalid file path');
    }

    return resolvedPath;
  }

  public async uploadVideoToTelegram(
    videoPath: string,
    options?: {
      duration?: number;
      width?: number;
      height?: number;
      thumbnailPath?: string;
      supportsStreaming?: boolean;
    }
  ): Promise<VideoUploadResult> {
    try {
      // Validate paths to prevent path traversal
      const safeVideoPath = this.validateFilePath(videoPath);

      // For large files, we need to use a temporary chat to upload
      // Then we can reuse the file_id for broadcasts
      const formData = new FormData();
      formData.append('video', fs.createReadStream(safeVideoPath));

      if (options?.thumbnailPath) {
        const safeThumbnailPath = this.validateFilePath(options.thumbnailPath);
        formData.append('thumbnail', fs.createReadStream(safeThumbnailPath));
      }

      if (options?.duration) {
        formData.append('duration', options.duration.toString());
      }

      if (options?.width) {
        formData.append('width', options.width.toString());
      }

      if (options?.height) {
        formData.append('height', options.height.toString());
      }

      if (options?.supportsStreaming !== undefined) {
        formData.append('supports_streaming', options.supportsStreaming.toString());
      }

      // Upload to a temporary location (can be your own user ID or a dedicated channel)
      // This is just to get the file_id for later reuse
      const tempChatId = process.env.TELEGRAM_TEMP_CHAT_ID || '@me';

      const response = await axios.post(
        `${this.apiBaseUrl}/sendVideo`,
        formData,
        {
          params: {
            chat_id: tempChatId,
          },
          headers: formData.getHeaders(),
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
          timeout: 300000, // 5 minutes for large uploads
        }
      );

      if (!response.data.ok) {
        throw new Error(`Telegram API error: ${response.data.description}`);
      }

      const video = response.data.result.video;
      const thumbnail = response.data.result.thumbnail;

      return {
        fileId: video.file_id,
        fileSize: video.file_size,
        duration: video.duration,
        thumbnailFileId: thumbnail?.file_id,
      };
    } catch (error: any) {
      logger.error('Error uploading video to Telegram:', error);
      throw new Error(`Failed to upload video: ${error.message}`);
    }
  }

  /**
   * Generate broadcast description using Grok AI
   */
  public async generateBroadcastDescription(
    videoTitle: string,
    videoDescription: string,
    targetAudience: string,
    goal: string,
    language: 'en' | 'es' = 'es'
  ): Promise<{
    caption: string;
    hashtags: string[];
    callToAction: string;
  }> {
    try {
      // Use the existing AI service to generate optimized content
      const variants = await aiContentGenerationService.generatePostVariants(
        videoTitle,
        videoDescription,
        goal,
        targetAudience
      );

      const selectedVariant = language === 'en' ? variants.english : variants.spanish;

      // Format for Telegram (supports up to 1024 characters for captions)
      const caption = this.formatTelegramCaption(
        videoTitle,
        selectedVariant.content,
        selectedVariant.hashtags,
        selectedVariant.cta
      );

      return {
        caption,
        hashtags: selectedVariant.hashtags,
        callToAction: selectedVariant.cta || '',
      };
    } catch (error: any) {
      logger.error('Error generating broadcast description:', error);
      // Fallback
      return {
        caption: `${videoTitle}\n\n${videoDescription}`,
        hashtags: [],
        callToAction: '',
      };
    }
  }

  /**
   * Broadcast video to multiple channels/groups
   */
  public async broadcastVideo(
    videoFileId: string,
    caption: string,
    channels: TelegramChannel[],
    options?: {
      parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
      disableNotification?: boolean;
      thumbnailFileId?: string;
    }
  ): Promise<BroadcastResult[]> {
    const results: BroadcastResult[] = [];

    for (const channel of channels) {
      try {
        const response = await axios.post(
          `${this.apiBaseUrl}/sendVideo`,
          {
            chat_id: channel.chatId,
            video: videoFileId,
            caption,
            parse_mode: options?.parseMode || 'HTML',
            disable_notification: options?.disableNotification || false,
            thumbnail: options?.thumbnailFileId,
          }
        );

        if (response.data.ok) {
          results.push({
            channelId: channel.id,
            channelTitle: channel.title,
            success: true,
            messageId: response.data.result.message_id,
          });

          logger.info(`Successfully broadcasted to ${channel.title}`, {
            channelId: channel.id,
            messageId: response.data.result.message_id,
          });
        } else {
          results.push({
            channelId: channel.id,
            channelTitle: channel.title,
            success: false,
            error: response.data.description,
          });

          logger.error(`Failed to broadcast to ${channel.title}`, {
            error: response.data.description,
          });
        }

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error: any) {
        results.push({
          channelId: channel.id,
          channelTitle: channel.title,
          success: false,
          error: error.message,
        });

        logger.error(`Error broadcasting to ${channel.title}:`, error);
      }
    }

    return results;
  }

  /**
   * Broadcast text message to multiple channels/groups
   */
  public async broadcastText(
    message: string,
    channels: TelegramChannel[],
    options?: {
      parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
      disableNotification?: boolean;
      disableWebPagePreview?: boolean;
    }
  ): Promise<BroadcastResult[]> {
    const results: BroadcastResult[] = [];

    for (const channel of channels) {
      try {
        const response = await axios.post(
          `${this.apiBaseUrl}/sendMessage`,
          {
            chat_id: channel.chatId,
            text: message,
            parse_mode: options?.parseMode || 'HTML',
            disable_notification: options?.disableNotification || false,
            disable_web_page_preview: options?.disableWebPagePreview || false,
          }
        );

        if (response.data.ok) {
          results.push({
            channelId: channel.id,
            channelTitle: channel.title,
            success: true,
            messageId: response.data.result.message_id,
          });
        } else {
          results.push({
            channelId: channel.id,
            channelTitle: channel.title,
            success: false,
            error: response.data.description,
          });
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error: any) {
        results.push({
          channelId: channel.id,
          channelTitle: channel.title,
          success: false,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Get bot information
   */
  public async getBotInfo(): Promise<any> {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/getMe`);
      return response.data.result;
    } catch (error: any) {
      logger.error('Error getting bot info:', error);
      throw error;
    }
  }

  /**
   * Get channel/chat information
   */
  public async getChatInfo(chatId: string): Promise<any> {
    try {
      const response = await axios.post(`${this.apiBaseUrl}/getChat`, {
        chat_id: chatId,
      });
      return response.data.result;
    } catch (error: any) {
      logger.error('Error getting chat info:', error);
      throw error;
    }
  }

  /**
   * Check if bot is admin in channel/group
   */
  public async isBotAdmin(chatId: string): Promise<boolean> {
    try {
      const response = await axios.post(`${this.apiBaseUrl}/getChatMember`, {
        chat_id: chatId,
        user_id: (await this.getBotInfo()).id,
      });

      const status = response.data.result.status;
      return status === 'administrator' || status === 'creator';
    } catch (error: any) {
      logger.error('Error checking bot admin status:', error);
      return false;
    }
  }

  /**
   * Format caption for Telegram (max 1024 characters)
   */
  private formatTelegramCaption(
    title: string,
    content: string,
    hashtags: string[],
    cta?: string
  ): string {
    const parts: string[] = [];

    // Title in bold
    parts.push(`<b>${this.escapeHTML(title)}</b>\n`);

    // Content
    parts.push(this.escapeHTML(content));

    // CTA if provided
    if (cta) {
      parts.push(`\n\n${this.escapeHTML(cta)}`);
    }

    // Hashtags
    if (hashtags.length > 0) {
      parts.push(`\n\n${hashtags.map((h) => `#${h}`).join(' ')}`);
    }

    let caption = parts.join('');

    // Telegram caption limit is 1024 characters
    if (caption.length > 1024) {
      caption = caption.substring(0, 1020) + '...';
    }

    return caption;
  }

  /**
   * Escape HTML for Telegram
   */
  private escapeHTML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /**
   * Get file information from Telegram
   */
  public async getFile(fileId: string): Promise<any> {
    try {
      const response = await axios.post(`${this.apiBaseUrl}/getFile`, {
        file_id: fileId,
      });
      return response.data.result;
    } catch (error: any) {
      logger.error('Error getting file info:', error);
      throw error;
    }
  }

  /**
   * Download file from Telegram
   */
  public async downloadFile(filePath: string, destination: string): Promise<string> {
    try {
      const fileUrl = `https://api.telegram.org/file/bot${this.botToken}/${filePath}`;
      const response = await axios.get(fileUrl, {
        responseType: 'stream',
      });

      const writer = fs.createWriteStream(destination);
      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => resolve(destination));
        writer.on('error', reject);
      });
    } catch (error: any) {
      logger.error('Error downloading file:', error);
      throw error;
    }
  }
}

export default new TelegramBroadcastService();
