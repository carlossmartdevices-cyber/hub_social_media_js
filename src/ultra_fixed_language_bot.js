// Enhanced Fixed Bot - Forces new messages to bypass Telegram caching
require('dotenv').config();

const TelegramBot = require('node-telegram-bot-api');
const { LanguageManager } = require('./utils/languageManager');
const InlineMenuManager = require('./utils/inlineMenuManager');
const Logger = require('./utils/logger');

const logger = new Logger();

class UltraFixedLanguageBot {
  constructor() {
    this.menuManager = new InlineMenuManager();
    this.bot = null;
    this.lastMessageTime = new Map();
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

    logger.info('Ultra Fixed Language Bot initialized successfully');
    return true;
  }

  async startUltraFixedBot() {
    logger.info('🚀 Starting Ultra Fixed Language Bot...');
    logger.info('✨ This version sends NEW messages to bypass Telegram caching');
    logger.info('Commands:');
    logger.info('• /start - Show main menu');
    logger.info('• /lang - Quick language test');
    logger.info('• /clear - Clear chat and start fresh');
    logger.info('');

    // Handle /start command
    this.bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id;
      await this.sendFreshMainMenu(chatId);
    });

    // Handle /lang command
    this.bot.onText(/\/lang/, async (msg) => {
      const chatId = msg.chat.id;
      await this.sendFreshLanguageMenu(chatId);
    });

    // Handle /clear command
    this.bot.onText(/\/clear/, async (msg) => {
      const chatId = msg.chat.id;
      const currentLang = LanguageManager.getUserLanguage(chatId);
      
      const clearMessage = currentLang === 'es' ? 
        '🧹 Chat limpiado. Enviando nuevo menú...' :
        '🧹 Chat cleared. Sending fresh menu...';
      
      await this.bot.sendMessage(chatId, clearMessage);
      
      setTimeout(async () => {
        await this.sendFreshMainMenu(chatId);
      }, 1000);
    });

    // Handle callback queries
    this.bot.on('callback_query', async (callbackQuery) => {
      await this.handleCallbackQueryUltraFixed(callbackQuery);
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
      logger.info('Shutting down Ultra Fixed Language Bot...');
      if (this.bot) {
        this.bot.stopPolling();
      }
      process.exit(0);
    });

    logger.info('✅ Ultra Fixed Language Bot is running!');
  }

  async sendFreshMainMenu(chatId) {
    try {
      const menu = this.menuManager.getMainMenu(chatId);
      const currentLang = LanguageManager.getUserLanguage(chatId);
      
      // Add language indicator to the message
      const enhancedText = menu.text + `\n\n🌍 Current Language: ${currentLang === 'es' ? '🇪🇸 Español' : '🇺🇸 English'}`;
      
      await this.bot.sendMessage(chatId, enhancedText, {
        parse_mode: 'HTML',
        ...this.menuManager.generateKeyboard(menu.keyboard)
      });
      
      logger.info(`✅ Fresh main menu sent to chat ${chatId} (lang: ${currentLang})`);
      logger.info(`Menu title: ${menu.text.split('\n')[0]}`); // Log the actual title sent
    } catch (error) {
      logger.error(`Failed to send fresh main menu to ${chatId}:`, error.message);
    }
  }

  async sendFreshLanguageMenu(chatId) {
    try {
      const menu = this.menuManager.getLanguageMenu(chatId);
      const currentLang = LanguageManager.getUserLanguage(chatId);
      
      await this.bot.sendMessage(chatId, menu.text, {
        parse_mode: 'HTML',
        ...this.menuManager.generateKeyboard(menu.keyboard)
      });
      
      logger.info(`✅ Fresh language menu sent to chat ${chatId} (lang: ${currentLang})`);
    } catch (error) {
      logger.error(`Failed to send fresh language menu to ${chatId}:`, error.message);
    }
  }

  async handleCallbackQueryUltraFixed(callbackQuery) {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;

    try {
      // Always answer the callback query first
      await this.bot.answerCallbackQuery(callbackQuery.id);

      logger.info(`🔧 Handling callback: ${data} from chat ${chatId}`);

      if (data === 'menu_language') {
        await this.sendFreshLanguageMenu(chatId);
      } else if (data.startsWith('lang_')) {
        await this.handleLanguageChangeUltraFixed(chatId, data);
      } else if (data === 'menu_main') {
        await this.sendFreshMainMenu(chatId);
      } else {
        // Handle other menu callbacks by sending fresh menus
        const menu = this.menuManager.getMenuByCallback(chatId, data);
        if (menu && typeof menu === 'object' && menu.text) {
          const currentLang = LanguageManager.getUserLanguage(chatId);
          await this.bot.sendMessage(chatId, menu.text, {
            parse_mode: 'HTML',
            ...this.menuManager.generateKeyboard(menu.keyboard)
          });
          logger.info(`✅ Fresh ${data} menu sent (lang: ${currentLang})`);
        }
      }

      logger.info(`✅ Successfully handled callback: ${data}`);
    } catch (error) {
      logger.error(`❌ Failed to handle callback ${data} from ${chatId}:`, error.message);
    }
  }

  async handleLanguageChangeUltraFixed(chatId, data) {
    try {
      const newLang = data.split('_')[1];
      const oldLang = LanguageManager.getUserLanguage(chatId);
      
      logger.info(`🔄 Language change request: ${oldLang} → ${newLang} for chat ${chatId}`);

      // Change the language
      LanguageManager.setUserLanguage(chatId, newLang);
      
      // Verify the change was successful
      const actualLang = LanguageManager.getUserLanguage(chatId);
      logger.info(`✅ Language verification: now set to '${actualLang}' for chat ${chatId}`);
      
      // Show confirmation message
      const confirmMessage = LanguageManager.getLanguageChangedMessage(newLang);
      await this.bot.sendMessage(chatId, confirmMessage, {
        parse_mode: 'HTML'
      });

      // Wait 2 seconds then send a COMPLETELY NEW main menu
      setTimeout(async () => {
        try {
          // Double-check language is still set correctly
          const verifyLang = LanguageManager.getUserLanguage(chatId);
          logger.info(`🔍 Final verification before new menu: language is '${verifyLang}'`);
          
          await this.sendFreshMainMenu(chatId);
          
          // Send an additional verification message
          const verificationMsg = newLang === 'es' ? 
            `🔍 Verificación: El idioma ahora está en ESPAÑOL 🇪🇸\n\n¿Puedes ver el menú en español arriba?` :
            `🔍 Verification: Language is now in ENGLISH 🇺🇸\n\nCan you see the English menu above?`;
          
          setTimeout(async () => {
            await this.bot.sendMessage(chatId, verificationMsg);
          }, 1000);
          
        } catch (error) {
          logger.error(`❌ Failed to send fresh menu after language change:`, error.message);
        }
      }, 2000);

      logger.info(`✅ Language change process completed: ${oldLang} → ${newLang}`);
    } catch (error) {
      logger.error(`❌ Failed to change language for ${chatId}:`, error.message);
    }
  }
}

async function main() {
  try {
    const bot = new UltraFixedLanguageBot();
    await bot.initialize();
    await bot.startUltraFixedBot();
  } catch (error) {
    logger.error('Failed to start Ultra Fixed Language Bot:', error);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});