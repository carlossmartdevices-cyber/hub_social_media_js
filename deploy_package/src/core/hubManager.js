const TwitterAPIClient = require('../platforms/twitter/apiClient');
const TelegramAPIClient = require('../platforms/telegram/apiClient');
const InstagramAPIClient = require('../platforms/instagram/apiClient');
const TikTokAPIClient = require('../platforms/tiktok/apiClient');
const ContentRepository = require('../database/repository');
const ContentAdapter = require('./contentAdapter');
const Logger = require('../utils/logger');
const Validator = require('../utils/validator');
const { LanguageManager } = require('../utils/languageManager');
const { PlatformAPIError } = require('../utils/errorHandler');

class HubManager {
  constructor() {
    this.twitter = new TwitterAPIClient();
    this.telegram = new TelegramAPIClient();
    this.instagram = new InstagramAPIClient();
    this.tiktok = new TikTokAPIClient();
    this.repository = new ContentRepository();
    this.logger = new Logger();
  }

  async sendMessage(platform, message, options = {}) {
    // Validate inputs
    const validPlatform = Validator.validatePlatform(platform);
    const validMessage = Validator.validateMessage(message);
    const validOptions = Validator.validateOptions(options);

    // Adapt content for the platform
    const adaptedMessage = ContentAdapter.adaptForPlatform(validPlatform, validMessage);

    try {
      let result;
      switch (validPlatform) {
        case 'twitter':
          result = await this.twitter.sendMessage(adaptedMessage, validOptions);
          break;
        case 'telegram':
          // Telegram requires chatId, so validate it's provided
          if (!validOptions.chatId) {
            const errorMessage = validOptions.chatId ? 
              LanguageManager.getMessage(validOptions.chatId, 'errors.chat_required') :
              'chatId is required for Telegram messages. Provide it in options: {chatId: "your-chat-id"} / Se requiere chatId para mensajes de Telegram. Proporciónalo en options: {chatId: "tu-chat-id"}';
            throw new Error(errorMessage);
          }
          result = await this.telegram.sendMessage(adaptedMessage, validOptions);
          break;
        case 'instagram':
          result = await this.instagram.sendMessage(adaptedMessage, validOptions);
          break;
        case 'tiktok':
          result = await this.tiktok.sendMessage(adaptedMessage, validOptions);
          break;
        default:
          throw new PlatformAPIError(validPlatform, 'Unsupported platform');
      }
      this.logger.info(`Message sent to ${validPlatform}: ${adaptedMessage.substring(0, 50)}...`);
      return result;
    } catch (error) {
      this.logger.error(`Error sending message to ${validPlatform}`, error);
      throw new PlatformAPIError(validPlatform, error.message);
    }
  }

  async startLive(platform, options = {}) {
    const validPlatform = Validator.validatePlatform(platform);
    const validOptions = Validator.validateOptions(options);

    try {
      let result;
      switch (validPlatform) {
        case 'twitter':
          result = await this.twitter.startLive(validOptions);
          break;
        case 'telegram':
          // Telegram requires chatId, so validate it's provided
          if (!validOptions.chatId) {
            const errorMessage = validOptions.chatId ? 
              LanguageManager.getMessage(validOptions.chatId, 'errors.live_required') :
              'chatId is required for Telegram live streams. Provide it in options: {chatId: "your-chat-id", title: "Stream Title"} / Se requiere chatId para transmisiones en vivo de Telegram. Proporciónalo en options: {chatId: "tu-chat-id", title: "Título del Stream"}';
            throw new Error(errorMessage);
          }
          result = await this.telegram.startLive(validOptions);
          break;
        case 'tiktok':
          result = await this.tiktok.startLive(validOptions);
          break;
        case 'instagram':
          throw new PlatformAPIError(validPlatform, 'Live streaming not supported on Instagram via this API');
        default:
          throw new PlatformAPIError(validPlatform, 'Unsupported platform');
      }
      this.logger.info(`Live stream started on ${validPlatform}`);
      return result;
    } catch (error) {
      this.logger.error(`Error starting live stream on ${validPlatform}`, error);
      throw new PlatformAPIError(validPlatform, error.message);
    }
  }
}

module.exports = HubManager;