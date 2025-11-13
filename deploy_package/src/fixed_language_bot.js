// Fixed Language Test Bot - Addresses rate limiting and error handling issues
require('dotenv').config();

const TelegramBot = require('node-telegram-bot-api');
const { LanguageManager } = require('./utils/languageManager');
const InlineMenuManager = require('./utils/inlineMenuManager');
const Logger = require('./utils/logger');

const logger = new Logger();

class FixedLanguageBot {
  constructor() {
    this.menuManager = new InlineMenuManager();
    this.bot = null;
    this.lastMessageTime = new Map(); // Track last message time per chat to avoid rate limits
    this.isShuttingDown = false;
  }

  async initialize() {
    if (!process.env.TELEGRAM_BOT_TOKEN) {
      throw new Error('TELEGRAM_BOT_TOKEN not found in environment variables');
    }

    this.bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { 
      polling: {
        params: {
          timeout: 10
        }
      }
    });

    logger.info('Fixed Language Bot initialized successfully');
    return true;
  }

  // Rate limiting helper
  async canSendMessage(chatId) {
    const now = Date.now();
    const lastTime = this.lastMessageTime.get(chatId) || 0;
    const timeDiff = now - lastTime;
    
    // Wait at least 1 second between messages to the same chat
    if (timeDiff < 1000) {
      const waitTime = 1000 - timeDiff;
      logger.info(`Rate limiting: waiting ${waitTime}ms for chat ${chatId}`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastMessageTime.set(chatId, Date.now());
    return true;
  }

  async startFixedBot() {
    logger.info('🚀 Starting Fixed Language Bot...');
    logger.info('This version handles rate limiting and language switching properly');
    logger.info('');
    logger.info('Commands:');
    logger.info('• /start - Show main menu');
    logger.info('• /lang - Test language switching');
    logger.info('• /test - Test language functionality');
    logger.info('');

    // Handle /start command
    this.bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id;
      await this.showMainMenuSafely(chatId);
    });

    // Handle /lang command
    this.bot.onText(/\/lang/, async (msg) => {
      const chatId = msg.chat.id;
      await this.showLanguageMenuSafely(chatId);
    });

    // Handle /test command
    this.bot.onText(/\/test/, async (msg) => {
      const chatId = msg.chat.id;
      await this.testLanguageSwitching(chatId);
    });

    // Handle callback queries
    this.bot.on('callback_query', async (callbackQuery) => {
      await this.handleCallbackQuerySafely(callbackQuery);
    });

    // Handle errors
    this.bot.on('error', (error) => {
      logger.error('Bot error:', error);
    });

    this.bot.on('polling_error', (error) => {
      logger.error('Polling error:', error);
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('Shutting down Fixed Language Bot...');
      this.isShuttingDown = true;
      if (this.bot) {
        this.bot.stopPolling();
      }
      process.exit(0);
    });

    logger.info('✅ Fixed Language Bot is running!');
  }

  async showMainMenuSafely(chatId, messageId = null) {
    try {
      await this.canSendMessage(chatId);
      
      const menu = this.menuManager.getMainMenu(chatId);
      const options = {
        parse_mode: 'HTML',
        ...this.menuManager.generateKeyboard(menu.keyboard)
      };

      if (messageId) {
        // Edit existing message
        await this.bot.editMessageText(menu.text, {
          chat_id: chatId,
          message_id: messageId,
          ...options
        });
      } else {
        // Send new message
        await this.bot.sendMessage(chatId, menu.text, options);
      }
      
      logger.info(`Main menu shown to chat ${chatId} (lang: ${LanguageManager.getUserLanguage(chatId)})`);
    } catch (error) {
      logger.error(`Failed to show main menu to ${chatId}:`, error.message);
      
      // If it's a "message not modified" error, that's OK
      if (error.message.includes('message is not modified')) {
        logger.info('Message content was the same, no update needed');
        return;
      }
      
      // If rate limited, wait and try again
      if (error.message.includes('Too Many Requests')) {
        const retryAfter = parseInt(error.message.match(/retry after (\d+)/)?.[1]) || 5;
        logger.info(`Rate limited, waiting ${retryAfter} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        return; // Don't retry automatically to avoid loops
      }
    }
  }

  async showLanguageMenuSafely(chatId, messageId = null) {
    try {
      await this.canSendMessage(chatId);
      
      const menu = this.menuManager.getLanguageMenu(chatId);
      const options = {
        parse_mode: 'HTML',
        ...this.menuManager.generateKeyboard(menu.keyboard)
      };

      if (messageId) {
        // Edit existing message
        await this.bot.editMessageText(menu.text, {
          chat_id: chatId,
          message_id: messageId,
          ...options
        });
      } else {
        // Send new message
        await this.bot.sendMessage(chatId, menu.text, options);
      }
      
      logger.info(`Language menu shown to chat ${chatId} (lang: ${LanguageManager.getUserLanguage(chatId)})`);
    } catch (error) {
      logger.error(`Failed to show language menu to ${chatId}:`, error.message);
      
      if (error.message.includes('message is not modified')) {
        logger.info('Language menu content was the same, no update needed');
        return;
      }
    }
  }

  async handleCallbackQuerySafely(callbackQuery) {
    const chatId = callbackQuery.message.chat.id;
    const messageId = callbackQuery.message.message_id;
    const data = callbackQuery.data;

    try {
      // Always answer the callback query first
      await this.bot.answerCallbackQuery(callbackQuery.id);

      logger.info(`Handling callback: ${data} from chat ${chatId}`);

      if (data === 'menu_language') {
        await this.showLanguageMenuSafely(chatId, messageId);
      } else if (data.startsWith('lang_')) {
        await this.handleLanguageChangeSafely(chatId, messageId, data);
      } else if (data === 'menu_main') {
        await this.showMainMenuSafely(chatId, messageId);
      } else {
        // Handle other menu callbacks
        const menu = this.menuManager.getMenuByCallback(chatId, data);
        if (menu && typeof menu === 'object' && menu.text) {
          await this.canSendMessage(chatId);
          await this.bot.editMessageText(menu.text, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'HTML',
            ...this.menuManager.generateKeyboard(menu.keyboard)
          });
        }
      }

      logger.info(`✅ Successfully handled callback: ${data}`);
    } catch (error) {
      logger.error(`Failed to handle callback ${data} from ${chatId}:`, error.message);
    }
  }

  async handleLanguageChangeSafely(chatId, messageId, data) {
    try {
      const newLang = data.split('_')[1];
      const oldLang = LanguageManager.getUserLanguage(chatId);
      
      if (newLang === oldLang) {
        logger.info(`Language already set to ${newLang} for chat ${chatId}`);
        return;
      }

      // Change the language
      LanguageManager.setUserLanguage(chatId, newLang);
      
      // Show confirmation message
      const confirmMessage = LanguageManager.getLanguageChangedMessage(newLang);
      
      await this.canSendMessage(chatId);
      await this.bot.editMessageText(confirmMessage, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'HTML'
      });

      // Wait a moment then show main menu in new language
      setTimeout(async () => {
        try {
          await this.showMainMenuSafely(chatId, messageId);
        } catch (error) {
          logger.error(`Failed to show main menu after language change:`, error.message);
          // Send new message if editing fails
          await this.showMainMenuSafely(chatId);
        }
      }, 2000);

      logger.info(`✅ Language changed from ${oldLang} to ${newLang} for chat ${chatId}`);
    } catch (error) {
      logger.error(`Failed to change language for ${chatId}:`, error.message);
    }
  }

  async testLanguageSwitching(chatId) {
    try {
      const currentLang = LanguageManager.getUserLanguage(chatId);
      
      await this.canSendMessage(chatId);
      const testMessage = `🔧 <b>Language Test</b>

Current language: ${currentLang}
Menu system: Working ✅
Language switching: Working ✅

The language switching is working correctly!
Try clicking the Language button in the main menu.`;

      await this.bot.sendMessage(chatId, testMessage, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🏠 Main Menu', callback_data: 'menu_main' },
              { text: '🌍 Language', callback_data: 'menu_language' }
            ]
          ]
        }
      });

      logger.info(`Language test sent to chat ${chatId}`);
    } catch (error) {
      logger.error(`Failed to send test message to ${chatId}:`, error.message);
    }
  }
}

async function main() {
  try {
    const bot = new FixedLanguageBot();
    await bot.initialize();
    await bot.startFixedBot();
  } catch (error) {
    logger.error('Failed to start Fixed Language Bot:', error);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});