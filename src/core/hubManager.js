const TwitterAPIClient = require('../platforms/twitter/apiClient');
const MultiAccountTwitterClient = require('../auth/multiAccountTwitterClient');
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
    // Initialize platform clients only if their required env vars are present.
    // This avoids throwing during app start when some tokens are not set.
    // Twitter can operate in two modes:
    // - Multi-account OAuth1 flow (preferred): TWITTER_CONSUMER_KEY + TWITTER_CONSUMER_SECRET are provided and auth server credentials exist
    // - Legacy single-account mode: TWITTER_ACCESS_TOKEN + TWITTER_ACCESS_TOKEN_SECRET present
    try {
      if (process.env.TWITTER_CONSUMER_KEY && process.env.TWITTER_CONSUMER_SECRET) {
        // Multi-account manager loads credentials from credentials/twitter_accounts.json and watches for changes
        this.twitterMulti = new MultiAccountTwitterClient();
      } else if (process.env.TWITTER_ACCESS_TOKEN && process.env.TWITTER_ACCESS_TOKEN_SECRET) {
        // Legacy single account client
        this.twitterSingle = new TwitterAPIClient();
      } else {
        this.twitterMulti = null;
        this.twitterSingle = null;
      }
    } catch (err) {
      this.twitterMulti = null;
      this.twitterSingle = null;
      new Logger().error('Failed to initialize Twitter client(s)', err);
    }

    try {
      this.telegram = process.env.TELEGRAM_BOT_TOKEN ? new TelegramAPIClient() : null;
    } catch (err) {
      this.telegram = null;
      new Logger().error('Failed to initialize Telegram client', err);
    }

    try {
      this.instagram = process.env.INSTAGRAM_API_KEY ? new InstagramAPIClient() : null;
    } catch (err) {
      this.instagram = null;
      new Logger().error('Failed to initialize Instagram client', err);
    }

    try {
      this.tiktok = process.env.TIKTOK_API_KEY ? new TikTokAPIClient() : null;
    } catch (err) {
      this.tiktok = null;
      new Logger().error('Failed to initialize TikTok client', err);
    }
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
          // Prefer multi-account client when available
          if (this.twitterMulti) {
            // If accountName provided in options, use it; otherwise pick the first available account
            const accountName = validOptions.accountName || this.twitterMulti.getAccountNames()[0];
            if (!accountName) throw new PlatformAPIError('twitter', 'No authenticated Twitter accounts available');
            // Support media via options.mediaPath if present
            if (validOptions.mediaPath) {
              result = await this.twitterMulti.sendMessageWithMedia(accountName, adaptedMessage, validOptions.mediaPath, validOptions);
            } else {
              result = await this.twitterMulti.sendMessage(accountName, adaptedMessage, validOptions);
            }
          } else if (this.twitterSingle) {
            // Legacy single-account client
            if (validOptions.mediaPath) {
              result = await this.twitterSingle.sendMessageWithMedia(adaptedMessage, validOptions.mediaPath, validOptions);
            } else {
              result = await this.twitterSingle.sendMessage(adaptedMessage, validOptions);
            }
          } else {
            throw new PlatformAPIError('twitter', 'Twitter client not configured');
          }
          break;
        case 'telegram':
          if (!this.telegram) throw new PlatformAPIError('telegram', 'Telegram client not configured');
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
          if (!this.instagram) throw new PlatformAPIError('instagram', 'Instagram client not configured');
          result = await this.instagram.sendMessage(adaptedMessage, validOptions);
          break;
        case 'tiktok':
          if (!this.tiktok) throw new PlatformAPIError('tiktok', 'TikTok client not configured');
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
          if (!this.twitter) throw new PlatformAPIError('twitter', 'Twitter client not configured');
          result = await this.twitter.startLive(validOptions);
          break;
        case 'telegram':
          if (!this.telegram) throw new PlatformAPIError('telegram', 'Telegram client not configured');
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
          if (!this.tiktok) throw new PlatformAPIError('tiktok', 'TikTok client not configured');
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