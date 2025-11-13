require('dotenv').config();

const HubManager = require('./core/hubManager');
const ContentScheduler = require('./core/contentScheduler');
const TelegramAPIClient = require('./platforms/telegram/apiClient');
const TelegramMessageManager = require('./platforms/telegram/messageManager');
const TelegramLiveManager = require('./platforms/telegram/liveManager');
const Logger = require('./utils/logger');
const { LanguageManager } = require('./utils/languageManager');
const dbConnection = require('./database/dbConnection');
const { ScheduledContent } = require('./database/models');
const { handleError } = require('./utils/errorHandler');

const logger = new Logger();

async function initializeDatabase() {
  try {
    await dbConnection.testConnection();
    await dbConnection.sync({ alter: process.env.NODE_ENV === 'development' });
    logger.info('Database synchronized successfully');
  } catch (error) {
    logger.error('Database initialization failed', error);
    throw error;
  }
}

class BotManager {
  constructor() {
    this.hub = null;
    this.scheduler = null;
    this.telegramClient = null;
    this.telegramMessageManager = null;
    this.telegramLiveManager = null;
    this.isRunning = false;
  }

  async initialize() {
    try {
      // Initialize database first
      await initializeDatabase();

      // Initialize core components
      this.hub = new HubManager();
      this.scheduler = new ContentScheduler(this.hub);

      // Initialize Telegram components if token is available
      if (process.env.TELEGRAM_BOT_TOKEN) {
        this.telegramClient = new TelegramAPIClient();
        this.telegramMessageManager = new TelegramMessageManager();
        this.telegramLiveManager = new TelegramLiveManager();
        
        // Test Telegram connection
        const botInfo = await this.telegramClient.getBotInfo();
        logger.info(`Telegram Bot initialized: @${botInfo.username} - ${botInfo.first_name}`);
      } else {
        logger.warn('Telegram Bot Token not found. Telegram functionality disabled.');
      }

      logger.info('Bot Manager initialized successfully');
      return true;
    } catch (error) {
      logger.error('Failed to initialize Bot Manager', error);
      throw error;
    }
  }

  async startInteractiveMode() {
    if (!this.telegramClient) {
      logger.error('Telegram not configured. Please set TELEGRAM_BOT_TOKEN in .env file');
      return;
    }

    logger.info('Starting Telegram Bot in interactive mode...');
    logger.info('The bot is now listening for messages and commands.');
    logger.info('');
    logger.info('Available commands:');
    logger.info('• Send any message to any chat where the bot is added');
    logger.info('• Use /start to get welcome message');
    logger.info('• Use /live to start a live stream');
    logger.info('• Use /status to check bot status');
    logger.info('');
    logger.info('To test the bot:');
    logger.info('1. Add the bot to a channel or group');
    logger.info('2. Send messages to test functionality');
    logger.info('3. Use the examples in telegram_examples.js');
    logger.info('');
    logger.info('Press Ctrl+C to stop the bot');

    this.isRunning = true;

    // Set up polling to listen for messages
    const TelegramBot = require('node-telegram-bot-api');
    const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

    // Handle /start command
    bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id;
      const welcomeMessage = LanguageManager.getWelcomeMessage(chatId);

      try {
        await this.telegramMessageManager.sendTextMessage(chatId, welcomeMessage, {
          parseMode: 'HTML'
        });
        logger.info(`Welcome message sent to chat ${chatId} in ${LanguageManager.getUserLanguage(chatId)}`);
      } catch (error) {
        logger.error(`Failed to send welcome message to ${chatId}`, error);
      }
    });

    // Handle /status command
    bot.onText(/\/status/, async (msg) => {
      const chatId = msg.chat.id;
      const botInfo = await this.telegramClient.getBotInfo();
      const statusMessage = LanguageManager.getStatusMessage(chatId, botInfo);

      try {
        await this.telegramMessageManager.sendTextMessage(chatId, statusMessage, {
          parseMode: 'HTML'
        });
        logger.info(`Status message sent to chat ${chatId} in ${LanguageManager.getUserLanguage(chatId)}`);
      } catch (error) {
        logger.error(`Failed to send status message to ${chatId}`, error);
      }
    });

    // Handle /live command
    bot.onText(/\/live(?:\s+(.+))?/, async (msg, match) => {
      const chatId = msg.chat.id;
      const title = match[1] || (LanguageManager.getUserLanguage(chatId) === 'es' ? 'Transmisión en Vivo' : 'Live Stream');

      try {
        const liveResult = await this.telegramLiveManager.startLiveStream(chatId, {
          title: title,
          description: LanguageManager.getUserLanguage(chatId) === 'es' ? 
            'Iniciado mediante comando del bot' : 'Started via bot command',
          autoPin: true,
          createInviteLink: false
        });

        const successMessage = LanguageManager.getUserLanguage(chatId) === 'es' ?
          `${LanguageManager.getMessage(chatId, 'live.started')} ${chatId}: ${title}` :
          `${LanguageManager.getMessage(chatId, 'live.started')} ${chatId}: ${title}`;
        
        logger.info(`Live stream started in chat ${chatId}: ${title}`);
      } catch (error) {
        logger.error(`Failed to start live stream in ${chatId}`, error);
        const errorMessage = `${LanguageManager.getMessage(chatId, 'live.failed')} ${error.message}`;
        await this.telegramMessageManager.sendTextMessage(chatId, errorMessage);
      }
    });

    // Handle /help command
    bot.onText(/\/help/, async (msg) => {
      const chatId = msg.chat.id;
      const helpMessage = LanguageManager.getHelpMessage(chatId);

      try {
        await this.telegramMessageManager.sendTextMessage(chatId, helpMessage, {
          parseMode: 'HTML'
        });
        logger.info(`Help message sent to chat ${chatId} in ${LanguageManager.getUserLanguage(chatId)}`);
      } catch (error) {
        logger.error(`Failed to send help message to ${chatId}`, error);
      }
    });

    // Handle /lang command for language switching
    bot.onText(/\/lang/, async (msg) => {
      const chatId = msg.chat.id;
      const currentLang = LanguageManager.getUserLanguage(chatId);
      
      // Create inline keyboard for language selection
      const keyboard = {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🇪🇸 Español', callback_data: 'lang_es' },
              { text: '🇺🇸 English', callback_data: 'lang_en' }
            ]
          ]
        }
      };

      const langMessage = LanguageManager.getLanguageSelectionMessage(chatId);

      try {
        await bot.sendMessage(chatId, langMessage, keyboard);
        logger.info(`Language selection sent to chat ${chatId}`);
      } catch (error) {
        logger.error(`Failed to send language selection to ${chatId}`, error);
      }
    });

    // Handle language selection callbacks
    bot.on('callback_query', async (callbackQuery) => {
      const chatId = callbackQuery.message.chat.id;
      const messageId = callbackQuery.message.message_id;
      const data = callbackQuery.data;

      if (data.startsWith('lang_')) {
        const newLang = data.split('_')[1];
        LanguageManager.setUserLanguage(chatId, newLang);
        
        const confirmMessage = LanguageManager.getLanguageChangedMessage(newLang);
        
        try {
          // Edit the original message
          await bot.editMessageText(confirmMessage, {
            chat_id: chatId,
            message_id: messageId
          });
          
          // Answer the callback query
          await bot.answerCallbackQuery(callbackQuery.id);
          
          logger.info(`Language changed to ${newLang} for chat ${chatId}`);
        } catch (error) {
          logger.error(`Failed to change language for ${chatId}`, error);
        }
      }
    });

    // Handle regular messages
    bot.on('message', async (msg) => {
      // Skip if it's a command (already handled above)
      if (msg.text && msg.text.startsWith('/')) {
        return;
      }

      const chatId = msg.chat.id;
      const messageText = msg.text || (LanguageManager.getUserLanguage(chatId) === 'es' ? 
        '[Mensaje multimedia/especial]' : '[Media/Special message]');
      
      logger.info(`Received message from ${chatId}: ${messageText.substring(0, 50)}...`);

      // Echo the message back with some processing info
      if (msg.text) {
        const responseMessage = LanguageManager.getMessageResponse(chatId, msg);

        try {
          await this.telegramMessageManager.sendTextMessage(chatId, responseMessage, {
            parseMode: 'HTML',
            replyToMessageId: msg.message_id
          });
        } catch (error) {
          logger.error(`Failed to reply to message in ${chatId}`, error);
        }
      }
    });

    // Handle errors
    bot.on('error', (error) => {
      logger.error('Telegram Bot error:', error);
    });

    // Handle polling errors
    bot.on('polling_error', (error) => {
      logger.error('Telegram Bot polling error:', error);
    });

    // Keep the process running
    process.on('SIGINT', async () => {
      logger.info('Stopping Telegram Bot...');
      bot.stopPolling();
      this.isRunning = false;
      await this.shutdown();
    });

    logger.info('✅ Telegram Bot is now running and listening for messages!');
  }

  async runScheduledContentDemo() {
    logger.info('Running scheduled content demo...');

    const platforms = ['twitter'];
    if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_DEFAULT_CHAT_ID) {
      platforms.push('telegram');
    }

    for (const platform of platforms) {
      try {
        const scheduledTime = new Date(Date.now() + 30000); // 30 seconds from now
        const options = platform === 'telegram' ? 
          { chatId: process.env.TELEGRAM_DEFAULT_CHAT_ID } : {};

        const result = await this.scheduler.scheduleContent(
          platform,
          `Hello from ${platform}! This is a scheduled message at ${new Date().toLocaleString()}`,
          scheduledTime,
          options
        );

        logger.info(`Scheduled content for ${platform} at ${scheduledTime}`);
      } catch (error) {
        logger.error(`Failed to schedule content for ${platform}:`, error);
      }
    }
  }

  async shutdown() {
    try {
      await dbConnection.close();
      logger.info('Database connection closed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown', error);
      process.exit(1);
    }
  }
}

async function main() {
  try {
    const botManager = new BotManager();
    await botManager.initialize();

    // Check command line arguments for mode
    const args = process.argv.slice(2);
    const mode = args[0] || 'interactive';

    switch (mode) {
      case 'interactive':
      case 'bot':
        await botManager.startInteractiveMode();
        break;
        
      case 'demo':
      case 'schedule':
        await botManager.runScheduledContentDemo();
        logger.info('Demo completed. Scheduled jobs are running...');
        logger.info('Press Ctrl+C to exit');
        break;
        
      case 'test':
        logger.info('Running quick test...');
        if (botManager.telegramClient) {
          const botInfo = await botManager.telegramClient.getBotInfo();
          logger.info(`✅ Telegram Bot: @${botInfo.username}`);
        }
        logger.info('✅ All systems operational');
        await botManager.shutdown();
        break;
        
      default:
        logger.info('Available modes:');
        logger.info('• npm start (or no args) - Interactive Telegram bot');
        logger.info('• npm run start demo - Run scheduling demo');
        logger.info('• npm run start test - Quick system test');
        await botManager.shutdown();
    }

  } catch (error) {
    handleError(error, logger);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  try {
    await dbConnection.close();
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', error);
    process.exit(1);
  }
});

main().catch(error => {
  handleError(error, logger);
  process.exit(1);
});