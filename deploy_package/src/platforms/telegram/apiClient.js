const TelegramBot = require('node-telegram-bot-api');
const config = require('../../../config/telegram');
const fs = require('fs');
const path = require('path');

class TelegramAPIClient {
  constructor() {
    if (!config.token) {
      throw new Error('Telegram Bot Token is required. Please set TELEGRAM_BOT_TOKEN in your .env file.');
    }
    
    this.bot = new TelegramBot(config.token, { polling: false });
    this.token = config.token;
  }

  async sendMessage(message, options = {}) {
    try {
      const { chatId, parseMode = 'HTML', disableWebPagePreview = false, replyToMessageId } = options;
      
      if (!chatId) {
        throw new Error('chatId is required for Telegram messages');
      }

      const sendOptions = {
        parse_mode: parseMode,
        disable_web_page_preview: disableWebPagePreview
      };

      if (replyToMessageId) {
        sendOptions.reply_to_message_id = replyToMessageId;
      }

      const result = await this.bot.sendMessage(chatId, message, sendOptions);
      return result;
    } catch (error) {
      throw new Error(`Telegram API error: ${error.message}`);
    }
  }

  async sendPhoto(chatId, photo, options = {}) {
    try {
      const { caption, parseMode = 'HTML', replyToMessageId } = options;
      
      const sendOptions = {};
      if (caption) sendOptions.caption = caption;
      if (parseMode) sendOptions.parse_mode = parseMode;
      if (replyToMessageId) sendOptions.reply_to_message_id = replyToMessageId;

      const result = await this.bot.sendPhoto(chatId, photo, sendOptions);
      return result;
    } catch (error) {
      throw new Error(`Telegram photo send error: ${error.message}`);
    }
  }

  async sendVideo(chatId, video, options = {}) {
    try {
      const { caption, parseMode = 'HTML', duration, width, height, replyToMessageId } = options;
      
      const sendOptions = {};
      if (caption) sendOptions.caption = caption;
      if (parseMode) sendOptions.parse_mode = parseMode;
      if (duration) sendOptions.duration = duration;
      if (width) sendOptions.width = width;
      if (height) sendOptions.height = height;
      if (replyToMessageId) sendOptions.reply_to_message_id = replyToMessageId;

      const result = await this.bot.sendVideo(chatId, video, sendOptions);
      return result;
    } catch (error) {
      throw new Error(`Telegram video send error: ${error.message}`);
    }
  }

  async sendDocument(chatId, document, options = {}) {
    try {
      const { caption, parseMode = 'HTML', replyToMessageId } = options;
      
      const sendOptions = {};
      if (caption) sendOptions.caption = caption;
      if (parseMode) sendOptions.parse_mode = parseMode;
      if (replyToMessageId) sendOptions.reply_to_message_id = replyToMessageId;

      const result = await this.bot.sendDocument(chatId, document, sendOptions);
      return result;
    } catch (error) {
      throw new Error(`Telegram document send error: ${error.message}`);
    }
  }

  async sendMediaGroup(chatId, media, options = {}) {
    try {
      const { replyToMessageId } = options;
      
      const sendOptions = {};
      if (replyToMessageId) sendOptions.reply_to_message_id = replyToMessageId;

      const result = await this.bot.sendMediaGroup(chatId, media, sendOptions);
      return result;
    } catch (error) {
      throw new Error(`Telegram media group send error: ${error.message}`);
    }
  }

  async editMessage(chatId, messageId, text, options = {}) {
    try {
      const { parseMode = 'HTML', disableWebPagePreview = false } = options;
      
      const editOptions = {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: parseMode,
        disable_web_page_preview: disableWebPagePreview
      };

      const result = await this.bot.editMessageText(text, editOptions);
      return result;
    } catch (error) {
      throw new Error(`Telegram message edit error: ${error.message}`);
    }
  }

  async deleteMessage(chatId, messageId) {
    try {
      const result = await this.bot.deleteMessage(chatId, messageId);
      return result;
    } catch (error) {
      throw new Error(`Telegram message delete error: ${error.message}`);
    }
  }

  async getChatInfo(chatId) {
    try {
      const result = await this.bot.getChat(chatId);
      return result;
    } catch (error) {
      throw new Error(`Telegram get chat info error: ${error.message}`);
    }
  }

  async getChatMembersCount(chatId) {
    try {
      const result = await this.bot.getChatMembersCount(chatId);
      return result;
    } catch (error) {
      throw new Error(`Telegram get chat members count error: ${error.message}`);
    }
  }

  async startLive(options = {}) {
    try {
      const { chatId, title, description } = options;
      
      if (!chatId) {
        throw new Error('chatId is required for starting live stream');
      }

      // Telegram doesn't have a direct "start live" API like other platforms
      // Instead, we can create a video chat link or send instructions
      const liveMessage = `🔴 <b>Live Stream Starting</b>\n\n`;
      const titlePart = title ? `<b>Title:</b> ${title}\n` : '';
      const descPart = description ? `<b>Description:</b> ${description}\n` : '';
      const instructions = `\nTo join the live stream:\n1. Click on the video call button in this chat\n2. Or use the voice chat feature\n\n<i>Live streaming is now available in this chat!</i>`;
      
      const fullMessage = liveMessage + titlePart + descPart + instructions;
      
      const result = await this.sendMessage(fullMessage, { 
        chatId, 
        parseMode: 'HTML' 
      });
      
      return {
        success: true,
        message: 'Live stream announcement sent',
        messageId: result.message_id,
        chatId: chatId
      };
    } catch (error) {
      throw new Error(`Telegram live stream error: ${error.message}`);
    }
  }

  async createChatInviteLink(chatId, options = {}) {
    try {
      const { expireDate, memberLimit, name, createsJoinRequest = false } = options;
      
      const linkOptions = {
        chat_id: chatId,
        creates_join_request: createsJoinRequest
      };
      
      if (expireDate) linkOptions.expire_date = expireDate;
      if (memberLimit) linkOptions.member_limit = memberLimit;
      if (name) linkOptions.name = name;

      const result = await this.bot.createChatInviteLink(chatId, linkOptions);
      return result;
    } catch (error) {
      throw new Error(`Telegram create invite link error: ${error.message}`);
    }
  }

  async pinMessage(chatId, messageId, disableNotification = false) {
    try {
      const result = await this.bot.pinChatMessage(chatId, messageId, {
        disable_notification: disableNotification
      });
      return result;
    } catch (error) {
      throw new Error(`Telegram pin message error: ${error.message}`);
    }
  }

  async unpinMessage(chatId, messageId) {
    try {
      const result = await this.bot.unpinChatMessage(chatId, messageId);
      return result;
    } catch (error) {
      throw new Error(`Telegram unpin message error: ${error.message}`);
    }
  }

  // Method to setup webhook for receiving messages (optional)
  async setWebhook(url, options = {}) {
    try {
      const result = await this.bot.setWebHook(url, options);
      return result;
    } catch (error) {
      throw new Error(`Telegram webhook setup error: ${error.message}`);
    }
  }

  // Method to get bot info
  async getBotInfo() {
    try {
      const result = await this.bot.getMe();
      return result;
    } catch (error) {
      throw new Error(`Telegram get bot info error: ${error.message}`);
    }
  }
}

module.exports = TelegramAPIClient;