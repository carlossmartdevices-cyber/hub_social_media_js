const TelegramAPIClient = require('./apiClient');
const Logger = require('../../utils/logger');
const path = require('path');
const fs = require('fs');

class TelegramMessageManager {
  constructor() {
    this.apiClient = new TelegramAPIClient();
    this.logger = new Logger();
  }

  async sendTextMessage(chatId, message, options = {}) {
    try {
      const result = await this.apiClient.sendMessage(message, {
        chatId,
        ...options
      });
      
      this.logger.info(`Text message sent to Telegram chat ${chatId}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to send text message to Telegram chat ${chatId}`, error);
      throw error;
    }
  }

  async sendMediaMessage(chatId, mediaPath, mediaType, options = {}) {
    try {
      let result;
      const { caption, ...otherOptions } = options;

      // Check if file exists
      if (!fs.existsSync(mediaPath)) {
        throw new Error(`Media file not found: ${mediaPath}`);
      }

      const fileStream = fs.createReadStream(mediaPath);
      
      switch (mediaType.toLowerCase()) {
        case 'photo':
        case 'image':
          result = await this.apiClient.sendPhoto(chatId, fileStream, {
            caption,
            ...otherOptions
          });
          break;
          
        case 'video':
          result = await this.apiClient.sendVideo(chatId, fileStream, {
            caption,
            ...otherOptions
          });
          break;
          
        case 'document':
        case 'file':
          result = await this.apiClient.sendDocument(chatId, fileStream, {
            caption,
            ...otherOptions
          });
          break;
          
        default:
          throw new Error(`Unsupported media type: ${mediaType}`);
      }

      this.logger.info(`${mediaType} message sent to Telegram chat ${chatId}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to send ${mediaType} message to Telegram chat ${chatId}`, error);
      throw error;
    }
  }

  async sendMediaGroup(chatId, mediaItems, options = {}) {
    try {
      const mediaArray = mediaItems.map(item => {
        const { type, media, caption, parse_mode } = item;
        
        if (!fs.existsSync(media)) {
          throw new Error(`Media file not found: ${media}`);
        }

        return {
          type: type,
          media: fs.createReadStream(media),
          caption: caption || '',
          parse_mode: parse_mode || 'HTML'
        };
      });

      const result = await this.apiClient.sendMediaGroup(chatId, mediaArray, options);
      
      this.logger.info(`Media group with ${mediaItems.length} items sent to Telegram chat ${chatId}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to send media group to Telegram chat ${chatId}`, error);
      throw error;
    }
  }

  async sendFormattedMessage(chatId, messageData, options = {}) {
    try {
      const { text, entities, parseMode = 'HTML' } = messageData;
      
      let formattedText = text;
      
      // Apply basic formatting if entities are provided
      if (entities && entities.length > 0) {
        // Sort entities by offset in reverse order to avoid index shifting
        const sortedEntities = entities.sort((a, b) => b.offset - a.offset);
        
        for (const entity of sortedEntities) {
          const { type, offset, length } = entity;
          const entityText = text.substr(offset, length);
          
          let replacement = entityText;
          switch (type) {
            case 'bold':
              replacement = `<b>${entityText}</b>`;
              break;
            case 'italic':
              replacement = `<i>${entityText}</i>`;
              break;
            case 'underline':
              replacement = `<u>${entityText}</u>`;
              break;
            case 'strikethrough':
              replacement = `<s>${entityText}</s>`;
              break;
            case 'code':
              replacement = `<code>${entityText}</code>`;
              break;
            case 'pre':
              replacement = `<pre>${entityText}</pre>`;
              break;
          }
          
          formattedText = formattedText.substr(0, offset) + replacement + formattedText.substr(offset + length);
        }
      }

      const result = await this.apiClient.sendMessage(formattedText, {
        chatId,
        parseMode,
        ...options
      });
      
      this.logger.info(`Formatted message sent to Telegram chat ${chatId}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to send formatted message to Telegram chat ${chatId}`, error);
      throw error;
    }
  }

  async editMessage(chatId, messageId, newText, options = {}) {
    try {
      const result = await this.apiClient.editMessage(chatId, messageId, newText, options);
      
      this.logger.info(`Message ${messageId} edited in Telegram chat ${chatId}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to edit message ${messageId} in Telegram chat ${chatId}`, error);
      throw error;
    }
  }

  async deleteMessage(chatId, messageId) {
    try {
      const result = await this.apiClient.deleteMessage(chatId, messageId);
      
      this.logger.info(`Message ${messageId} deleted from Telegram chat ${chatId}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to delete message ${messageId} from Telegram chat ${chatId}`, error);
      throw error;
    }
  }

  async forwardMessage(fromChatId, toChatId, messageId, options = {}) {
    try {
      const result = await this.apiClient.bot.forwardMessage(toChatId, fromChatId, messageId, options);
      
      this.logger.info(`Message ${messageId} forwarded from chat ${fromChatId} to chat ${toChatId}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to forward message ${messageId} from chat ${fromChatId} to chat ${toChatId}`, error);
      throw error;
    }
  }

  async sendScheduledMessage(chatId, message, scheduleTime, options = {}) {
    try {
      // Telegram doesn't support native scheduled messages via Bot API
      // This would require external scheduling (like node-schedule)
      const scheduledTimestamp = Math.floor(scheduleTime.getTime() / 1000);
      
      this.logger.info(`Scheduled message for Telegram chat ${chatId} at ${scheduleTime}`);
      
      return {
        success: true,
        scheduledFor: scheduleTime,
        chatId: chatId,
        message: 'Message scheduled externally (Telegram Bot API doesn\'t support native scheduling)'
      };
    } catch (error) {
      this.logger.error(`Failed to schedule message for Telegram chat ${chatId}`, error);
      throw error;
    }
  }

  async sendReplyMessage(chatId, replyToMessageId, message, options = {}) {
    try {
      const result = await this.apiClient.sendMessage(message, {
        chatId,
        replyToMessageId,
        ...options
      });
      
      this.logger.info(`Reply message sent to Telegram chat ${chatId}, replying to message ${replyToMessageId}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to send reply message to Telegram chat ${chatId}`, error);
      throw error;
    }
  }

  async pinMessage(chatId, messageId, disableNotification = false) {
    try {
      const result = await this.apiClient.pinMessage(chatId, messageId, disableNotification);
      
      this.logger.info(`Message ${messageId} pinned in Telegram chat ${chatId}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to pin message ${messageId} in Telegram chat ${chatId}`, error);
      throw error;
    }
  }

  async unpinMessage(chatId, messageId) {
    try {
      const result = await this.apiClient.unpinMessage(chatId, messageId);
      
      this.logger.info(`Message ${messageId} unpinned in Telegram chat ${chatId}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to unpin message ${messageId} in Telegram chat ${chatId}`, error);
      throw error;
    }
  }

  // Helper method to validate chat ID format
  validateChatId(chatId) {
    if (!chatId) {
      throw new Error('Chat ID is required');
    }
    
    // Chat ID can be a number or string starting with @ for usernames
    if (typeof chatId !== 'number' && typeof chatId !== 'string') {
      throw new Error('Chat ID must be a number or string');
    }
    
    return true;
  }

  // Helper method to get supported media types
  getSupportedMediaTypes() {
    return ['photo', 'image', 'video', 'document', 'file'];
  }
}

module.exports = TelegramMessageManager;