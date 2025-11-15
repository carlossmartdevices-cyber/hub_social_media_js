require('dotenv').config();

const TelegramBot = require('node-telegram-bot-api');
const HubManager = require('./core/hubManager');
const ContentScheduler = require('./core/contentScheduler');
const TelegramAPIClient = require('./platforms/telegram/apiClient');
const TelegramMessageManager = require('./platforms/telegram/messageManager');
const TelegramLiveManager = require('./platforms/telegram/liveManager');
const TwitterAPIClient = require('./platforms/twitter/apiClient');
const Logger = require('./utils/logger');
const { LanguageManager } = require('./utils/languageManager');
const InlineMenuManager = require('./utils/inlineMenuManager');
const TwitterAccountSelector = require('./utils/twitterAccountSelector');
const dbConnection = require('./database/dbConnection');
const { ScheduledContent } = require('./database/models');
const { handleError } = require('./utils/errorHandler');

const logger = new Logger();

// Colombian timezone helper functions (UTC-5)
function getColombianTime() {
  const now = new Date();
  // Get current UTC time and convert to Colombian time (UTC-5)
  // UTC time - 5 hours = Colombian time
  const colombianTime = new Date(now.getTime() - (5 * 60 * 60 * 1000));
  return colombianTime;
}

function addHoursToColombianTime(hours) {
  // Add hours to Colombian time and return the UTC equivalent for scheduling
  // Current time (UTC) + (hours * 3600000 ms)
  // This directly adds hours to the current UTC time
  return new Date(Date.now() + (hours * 60 * 60 * 1000));
}

function convertColombianTimeToUTC(colombianDate) {
  // Convert a date that is in Colombian timezone format to UTC
  // If user inputs "15:00" in Colombia, that's actually 20:00 UTC
  // So we need to add 5 hours to get UTC equivalent
  return new Date(colombianDate.getTime() + (5 * 60 * 60 * 1000));
}

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

class EnhancedBotManager {
  constructor() {
    this.hub = null;
    this.scheduler = null;
    this.telegramClient = null;
    this.telegramMessageManager = null;
    this.telegramLiveManager = null;
    this.twitterClient = null;
    this.menuManager = new InlineMenuManager();
    this.twitterAccountSelector = new TwitterAccountSelector();
    this.bot = null;
    this.isRunning = false;
    
    // Lista de administradores autorizados (user IDs de Telegram)
    this.adminUsers = [
      8365312597, // Usuario principal existente
      7246621722  // Usuario administrador
    ];
  }

  // Verificar si un usuario es administrador
  isAdmin(userId) {
    return this.adminUsers.includes(parseInt(userId));
  }

  // Helper para verificar admin y enviar mensaje de error si no autorizado
  async checkAdminAccess(msg, allowLangCommand = false) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    if (!this.isAdmin(userId)) {
      // Para el comando /lang, permitir acceso pero con funcionalidad limitada
      if (allowLangCommand) {
        return false; // No es admin pero se permite el comando
      }
      
      const lang = LanguageManager.getUserLanguage(chatId);
      const unauthorizedMessage = lang === 'es' ?
        '🚫 <b>Acceso No Autorizado</b>\n\nEste bot está restringido solo para administradores autorizados.\n\n📧 Para solicitar acceso, contacta al administrador del sistema.\n\n<i>Tu ID de usuario: <code>' + userId + '</code></i>' :
        '🚫 <b>Unauthorized Access</b>\n\nThis bot is restricted to authorized administrators only.\n\n📧 To request access, contact the system administrator.\n\n<i>Your user ID: <code>' + userId + '</code></i>';
      
      await this.bot.sendMessage(chatId, unauthorizedMessage, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🌍 Cambiar Idioma / Change Language', callback_data: 'menu_language' }]
          ]
        }
      });
      return false;
    }
    return true;
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
        try {
          this.telegramClient = new TelegramAPIClient();
          this.telegramMessageManager = new TelegramMessageManager();
          this.telegramLiveManager = new TelegramLiveManager();
          
          // Test Telegram connection first before starting polling
          const botInfo = await this.telegramClient.getBotInfo();
          
          // Only initialize bot with polling if connection is successful
          this.bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
          
          logger.info(`Telegram Bot initialized: @${botInfo.username} - ${botInfo.first_name}`);
        } catch (telegramError) {
          logger.error('Failed to initialize Telegram bot. Telegram functionality disabled.', telegramError);
          logger.warn('Bot will continue to run without Telegram. Please check your TELEGRAM_BOT_TOKEN.');
          // Reset Telegram components to null
          this.telegramClient = null;
          this.telegramMessageManager = null;
          this.telegramLiveManager = null;
          this.bot = null;
        }
      } else {
        logger.warn('Telegram Bot Token not found. Telegram functionality disabled.');
      }

      // Initialize Twitter if configured
      if (process.env.TWITTER_API_KEY || process.env.TWITTER_CONSUMER_KEY) {
        this.twitterClient = new TwitterAPIClient();
        logger.info('Twitter API client initialized');
      }

      logger.info('Enhanced Bot Manager initialized successfully');
      return true;
    } catch (error) {
      logger.error('Failed to initialize Enhanced Bot Manager', error);
      throw error;
    }
  }

  async startEnhancedInteractiveMode() {
    if (!this.bot) {
      logger.error('Telegram not configured. Please set TELEGRAM_BOT_TOKEN in .env file');
      return;
    }

    logger.info('🚀 Starting Enhanced Telegram Bot with Inline Menus...');
    logger.info('✨ New Features:');
    logger.info('  • Comprehensive inline menu system');
    logger.info('  • Quick actions and easy navigation');
    logger.info('  • Improved user experience');
    logger.info('  • Multi-step workflows');
    logger.info('');
    logger.info('Available commands:');
    logger.info('• /start - Show main menu with all options');
    logger.info('• /menu - Quick access to main menu');
    logger.info('• /quick - Show quick actions menu');
    logger.info('• /lang - Change language (Spanish/English)');
    logger.info('• /help - Show help information');
    logger.info('');
    logger.info('🎯 Enhanced Bot is now running!');

    this.isRunning = true;
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    if (!this.bot) {
      logger.warn('Telegram bot not initialized. Skipping event handler setup.');
      return;
    }
    
    // Handle /start command - Show main menu
    this.bot.onText(/\/start/, async (msg) => {
      if (!(await this.checkAdminAccess(msg))) return;
      
      const chatId = msg.chat.id;
      await this.showMainMenu(chatId);
    });

    // Handle /menu command - Quick access to main menu
    this.bot.onText(/\/menu/, async (msg) => {
      if (!(await this.checkAdminAccess(msg))) return;
      
      const chatId = msg.chat.id;
      await this.showMainMenu(chatId);
    });

    // Handle /quick command - Quick actions
    this.bot.onText(/\/quick/, async (msg) => {
      if (!(await this.checkAdminAccess(msg))) return;
      
      const chatId = msg.chat.id;
      await this.showQuickActions(chatId);
    });

    // Handle /lang command for language switching
    this.bot.onText(/\/lang/, async (msg) => {
      const chatId = msg.chat.id;
      await this.showLanguageMenu(chatId);
    });

    // Handle /help command
    this.bot.onText(/\/help/, async (msg) => {
      if (!(await this.checkAdminAccess(msg))) return;
      
      const chatId = msg.chat.id;
      const helpMessage = LanguageManager.getHelpMessage(chatId);
      
      try {
        await this.bot.sendMessage(chatId, helpMessage, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🏠 Main Menu', callback_data: 'menu_main' }]
            ]
          }
        });
      } catch (error) {
        logger.error(`Failed to send help message to ${chatId}`, error);
      }
    });

    // Handle callback queries (inline button presses)
    this.bot.on('callback_query', async (callbackQuery) => {
      await this.handleCallbackQuery(callbackQuery);
    });

    // Handle text messages for multi-step processes
    this.bot.on('message', async (msg) => {
      // Skip if it's a command (already handled above)
      if (msg.text && msg.text.startsWith('/')) {
        return;
      }

      const chatId = msg.chat.id;
      const userId = msg.from?.id;
      
      // Validar que userId exista
      if (!userId) {
        console.log(`[WARNING] Message received without user ID:`, msg);
        return;
      }
      
      // Verificar si el usuario es administrador
      if (!this.isAdmin(userId)) {
        const lang = LanguageManager.getUserLanguage(chatId);
        const unauthorizedMessage = lang === 'es' ?
          '🚫 <b>Acceso No Autorizado</b>\n\nEste bot está restringido solo para administradores autorizados.\n\n📧 Para solicitar acceso, contacta al administrador del sistema.' :
          '🚫 <b>Unauthorized Access</b>\n\nThis bot is restricted to authorized administrators only.\n\n📧 To request access, contact the system administrator.';
        
        try {
          await this.bot.sendMessage(chatId, unauthorizedMessage, {
            parse_mode: 'HTML'
          });
        } catch (error) {
          console.log(`[ERROR] Failed to send unauthorized message:`, error.message);
        }
        return;
      }

      const userState = this.menuManager.getUserState(chatId);

      if (userState) {
        await this.handleUserInput(msg, userState);
      } else {
        // For new users or when no state, show main menu
        await this.showMainMenu(chatId, 'Let me help you get started! 🚀');
      }
    });

    // Handle errors
    this.bot.on('error', (error) => {
      logger.error('Telegram Bot error:', error);
    });

    this.bot.on('polling_error', (error) => {
      logger.error('Telegram Bot polling error:', error);
    });

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('Stopping Enhanced Telegram Bot...');
      if (this.bot) {
        this.bot.stopPolling();
      }
      this.isRunning = false;
      await this.shutdown();
    });
  }

  async showMainMenu(chatId, customMessage = null) {
    try {
      const menu = this.menuManager.getMainMenu(chatId);
      const message = customMessage || menu.text;
      
      await this.bot.sendMessage(chatId, message, {
        parse_mode: 'HTML',
        ...this.menuManager.generateKeyboard(menu.keyboard)
      });
      
      logger.info(`Main menu shown to chat ${chatId}`);
    } catch (error) {
      logger.error(`Failed to show main menu to ${chatId}`, error);
    }
  }

  async showQuickActions(chatId) {
    try {
      const menu = this.menuManager.getQuickActionsMenu(chatId);
      
      await this.bot.sendMessage(chatId, menu.text, {
        parse_mode: 'HTML',
        ...this.menuManager.generateKeyboard(menu.keyboard)
      });
      
      logger.info(`Quick actions shown to chat ${chatId}`);
    } catch (error) {
      logger.error(`Failed to show quick actions to ${chatId}`, error);
    }
  }

  async showLanguageMenu(chatId, messageId = null) {
    try {
      const menu = this.menuManager.getLanguageMenu(chatId);
      
      if (messageId) {
        // Edit existing message
        await this.bot.editMessageText(menu.text, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'HTML',
          ...this.menuManager.generateKeyboard(menu.keyboard)
        });
      } else {
        // Send new message
        await this.bot.sendMessage(chatId, menu.text, {
          parse_mode: 'HTML',
          ...this.menuManager.generateKeyboard(menu.keyboard)
        });
      }
      
      logger.info(`Language menu shown to chat ${chatId}`);
    } catch (error) {
      logger.error(`Failed to show language menu to ${chatId}`, error);
    }
  }

  async handleCallbackQuery(callbackQuery) {
    const chatId = callbackQuery.message.chat.id;
    const messageId = callbackQuery.message.message_id;
    const data = callbackQuery.data;
    const userId = callbackQuery.from.id;

    try {
      // Answer the callback query first
      await this.bot.answerCallbackQuery(callbackQuery.id);

      // Verificar si el usuario es administrador (excepto para cambio de idioma)
      if (!data.startsWith('lang_') && !this.isAdmin(userId)) {
        const lang = LanguageManager.getUserLanguage(chatId);
        const unauthorizedMessage = lang === 'es' ?
          '🚫 <b>Acceso No Autorizado</b>\n\nEste bot está restringido solo para administradores autorizados.' :
          '🚫 <b>Unauthorized Access</b>\n\nThis bot is restricted to authorized administrators only.';
        
        try {
          await this.bot.editMessageText(unauthorizedMessage, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [{ text: '🌍 Cambiar Idioma / Change Language', callback_data: 'menu_language' }]
              ]
            }
          });
        } catch (editError) {
          console.log(`[DEBUG] Could not edit message for unauthorized user:`, editError.message);
          try {
            await this.bot.sendMessage(chatId, unauthorizedMessage, {
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🌍 Cambiar Idioma / Change Language', callback_data: 'menu_language' }]
                ]
              }
            });
          } catch (sendError) {
            console.log(`[ERROR] Failed to send unauthorized message:`, sendError.message);
          }
        }
        return;
      }

      // Handle different callback types
      if (data === 'menu_language') {
        await this.showLanguageMenu(chatId, messageId);
      } else if (data.startsWith('menu_')) {
        await this.handleMenuNavigation(chatId, messageId, data);
      } else if (data.startsWith('lang_')) {
        await this.handleLanguageChange(chatId, messageId, data);
      } else if (data.startsWith('post_now_twitter_account_')) {
        await this.handlePostNowTwitterAccountSelection(chatId, messageId, data);
      } else if (data.startsWith('post_now_')) {
        await this.handlePostNowAction(chatId, messageId, data);
      } else if (data.startsWith('post_')) {
        await this.handlePostAction(chatId, messageId, data);
      } else if (data.startsWith('schedule_platform_')) {
        await this.handleSchedulePlatformSelection(chatId, messageId, data);
      } else if (data.startsWith('post_twitter_account_')) {
        await this.handlePostTwitterAccountSelection(chatId, messageId, data);
      } else if (data.startsWith('schedule_twitter_account_')) {
        await this.handleTwitterAccountSelection(chatId, messageId, data);
      } else if (data.startsWith('schedule_')) {
        await this.handleScheduleAction(chatId, messageId, data);
      } else if (data.startsWith('settings_')) {
        await this.handleSettingsAction(chatId, messageId, data);
      } else if (data.startsWith('manage_')) {
        await this.handleManageAction(chatId, messageId, data);
      } else if (data.startsWith('live_')) {
        await this.handleLiveAction(chatId, messageId, data);
      } else if (data.startsWith('quick_')) {
        await this.handleQuickAction(chatId, messageId, data);
      } else if (data.startsWith('platform_')) {
        await this.handlePlatformSelection(chatId, messageId, data);
      } else if (data.startsWith('time_')) {
        await this.handleTimeSelection(chatId, messageId, data);
      } else if (data.startsWith('confirm_')) {
        await this.handleConfirmation(chatId, messageId, data);
      } else if (data.startsWith('cancel_post_')) {
        await this.handleCancelPost(chatId, messageId, data);
      } else if (data.startsWith('status_')) {
        await this.handleStatusAction(chatId, messageId, data);
      } else {
        // Default to main menu for unknown callbacks
        await this.showMainMenu(chatId);
      }

      logger.info(`Callback query handled: ${data} from chat ${chatId}`);
    } catch (error) {
      logger.error(`Failed to handle callback query ${data} from ${chatId}`, error);
    }
  }

  async handleMenuNavigation(chatId, messageId, data) {
    const menu = this.menuManager.getMenuByCallback(chatId, data);
    
    if (typeof menu === 'string') {
      // It's a help message
      await this.bot.editMessageText(menu, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🏠 Main Menu', callback_data: 'menu_main' }]
          ]
        }
      });
    } else {
      // It's a menu object
      await this.bot.editMessageText(menu.text, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'HTML',
        ...this.menuManager.generateKeyboard(menu.keyboard)
      });
    }
  }

  async handleLanguageChange(chatId, messageId, data) {
    const newLang = data.split('_')[1];
    LanguageManager.setUserLanguage(chatId, newLang);
    
    const confirmMessage = LanguageManager.getLanguageChangedMessage(newLang);
    
    // First show confirmation message
    await this.bot.editMessageText(confirmMessage, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'HTML'
    });
    
    // Wait a moment then show main menu in new language
    setTimeout(async () => {
      try {
        const mainMenu = this.menuManager.getMainMenu(chatId);
        await this.bot.editMessageText(mainMenu.text, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'HTML',
          ...this.menuManager.generateKeyboard(mainMenu.keyboard)
        });
      } catch (error) {
        logger.error(`Failed to show main menu after language change`, error);
        // If editing fails, send a new message
        await this.showMainMenu(chatId);
      }
    }, 1500);
    
    logger.info(`Language changed to ${newLang} for chat ${chatId}`);
  }

  async handlePostNowAction(chatId, messageId, data) {
    const action = data.replace('post_now_', '');
    const lang = LanguageManager.getUserLanguage(chatId);

    console.log(`[DEBUG] handlePostNowAction called with action: ${action}`);

    // For immediate posting, we use the same flow as regular posting
    // but we emphasize it's immediate
    if (action === 'all') {
      // Set state for multi-platform immediate posting
      this.menuManager.setUserState(chatId, 'awaiting_content', {
        action: 'post_all',
        platforms: ['twitter', 'telegram', 'instagram', 'tiktok'],
        immediate: true
      });

      const message = lang === 'es' ?
        '⚡ <b>Publicación Inmediata</b>\n\n📝 Envía el contenido que quieres publicar <b>inmediatamente</b> en todas las plataformas:' :
        '⚡ <b>Immediate Posting</b>\n\n📝 Send the content you want to post <b>immediately</b> to all platforms:';

      await this.bot.editMessageText(message, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: lang === 'es' ? '❌ Cancelar' : '❌ Cancel', callback_data: 'menu_main' }]
          ]
        }
      });
    } else if (action === 'twitter') {
      // For Twitter, show account selection
      const accounts = this.twitterAccountSelector.getAvailableAccounts();

      if (accounts.length === 0) {
        const noAccountsMessage = lang === 'es' ?
          `❌ <b>No hay cuentas de Twitter configuradas</b>\n\nPara usar Twitter, primero debes configurar al menos una cuenta.\n\n📧 Contacta al administrador para configurar cuentas de Twitter.` :
          `❌ <b>No Twitter accounts configured</b>\n\nTo use Twitter, you need to configure at least one account first.\n\n📧 Contact the administrator to set up Twitter accounts.`;

        await this.bot.editMessageText(noAccountsMessage, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: lang === 'es' ? '🔙 Volver' : '🔙 Back', callback_data: 'menu_schedule' }]
            ]
          }
        });
        return;
      }

      // Show Twitter account selection for immediate posting
      const accountMessage = lang === 'es' ?
        `⚡ <b>Publicación Inmediata en Twitter</b>\n\n👇 Elige la cuenta de Twitter para publicar <b>inmediatamente</b>:` :
        `⚡ <b>Immediate Twitter Posting</b>\n\n👇 Choose the Twitter account to post <b>immediately</b>:`;

      const keyboard = this.twitterAccountSelector.generateAccountSelectionKeyboard('twitter', 'now', lang, 'post_now');

      await this.bot.editMessageText(accountMessage, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'HTML',
        reply_markup: keyboard
      });
    } else {
      // Single platform immediate posting
      this.menuManager.setUserState(chatId, 'awaiting_content', {
        action: `post_${action}`,
        platform: action,
        immediate: true
      });

      const platformNames = {
        telegram: 'Telegram',
        instagram: 'Instagram',
        tiktok: 'TikTok'
      };

      const message = lang === 'es' ?
        `⚡ <b>Publicación Inmediata</b>\n\n📝 Envía el contenido que quieres publicar <b>inmediatamente</b> en ${platformNames[action]}:` :
        `⚡ <b>Immediate Posting</b>\n\n📝 Send the content you want to post <b>immediately</b> to ${platformNames[action]}:`;

      await this.bot.editMessageText(message, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: lang === 'es' ? '❌ Cancelar' : '❌ Cancel', callback_data: 'menu_main' }]
          ]
        }
      });
    }
  }

  async handlePostNowTwitterAccountSelection(chatId, messageId, data) {
    const lang = LanguageManager.getUserLanguage(chatId);
    console.log(`[DEBUG] handlePostNowTwitterAccountSelection called with data: ${data}`);

    // Parse: post_now_twitter_account_<accountName>_<platform>_<timestamp>
    const parts = data.replace('post_now_twitter_account_', '').split('_');
    const accountName = parts[0];
    const platform = parts[1];

    console.log(`[DEBUG] Selected Twitter account for immediate posting: ${accountName}`);

    // Set state for immediate Twitter posting with specific account
    this.menuManager.setUserState(chatId, 'awaiting_content', {
      action: 'post_twitter',
      platform: 'twitter',
      immediate: true,
      accountName: accountName
    });

    const contentMessage = lang === 'es' ?
      `⚡ <b>Publicación Inmediata en Twitter</b>\n\nCuenta: <b>@${accountName}</b>\n\n💬 Envía el contenido que quieres publicar <b>inmediatamente</b> (texto o multimedia):` :
      `⚡ <b>Immediate Twitter Posting</b>\n\nAccount: <b>@${accountName}</b>\n\n💬 Send the content you want to post <b>immediately</b> (text or media):`;

    await this.bot.editMessageText(contentMessage, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: lang === 'es' ? '❌ Cancelar' : '❌ Cancel', callback_data: 'menu_main' }]
        ]
      }
    });
  }

  async handlePostAction(chatId, messageId, data) {
    const action = data.replace('post_', '');
    const lang = LanguageManager.getUserLanguage(chatId);
    
    if (action === 'all') {
      // Set state for multi-platform posting
      this.menuManager.setUserState(chatId, 'awaiting_content', { 
        action: 'post_all',
        platforms: ['twitter', 'telegram', 'instagram', 'tiktok']
      });
      
      const message = lang === 'es' ? 
        '📝 Envía el contenido que quieres publicar en todas las plataformas:' :
        '📝 Send the content you want to post to all platforms:';
      
      await this.bot.editMessageText(message, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '❌ Cancel', callback_data: 'menu_main' }]
          ]
        }
      });
    } else if (action === 'twitter') {
      // Show Twitter account selection for immediate posting
      const accounts = this.twitterAccountSelector.getAvailableAccounts();
      
      if (accounts.length === 0) {
        const noAccountsMessage = lang === 'es' ?
          `❌ <b>No hay cuentas de Twitter configuradas</b>\n\nPara publicar en Twitter, primero debes configurar al menos una cuenta.\n\n📧 Visita https://pnptv.app para configurar cuentas de Twitter.` :
          `❌ <b>No Twitter accounts configured</b>\n\nTo post to Twitter, you need to configure at least one account first.\n\n📧 Visit https://pnptv.app to set up Twitter accounts.`;

        await this.bot.editMessageText(noAccountsMessage, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: lang === 'es' ? '🔙 Volver' : '🔙 Back', callback_data: 'menu_post' }]
            ]
          }
        });
        return;
      }

      // Show Twitter account selection
      const accountMessage = lang === 'es' ?
        `🐦 <b>Selecciona Cuenta de Twitter</b>\n\n👇 Elige la cuenta de Twitter para publicar:` :
        `🐦 <b>Select Twitter Account</b>\n\n👇 Choose the Twitter account to post to:`;

      const keyboard = [];
      accounts.forEach(account => {
        keyboard.push([{
          text: `@${account.username} (${account.displayName})`,
          callback_data: `post_twitter_account_${account.accountName}`
        }]);
      });
      keyboard.push([{
        text: lang === 'es' ? '🔙 Volver' : '🔙 Back',
        callback_data: 'menu_post'
      }]);
      
      await this.bot.editMessageText(accountMessage, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: keyboard }
      });
    } else {
      // Single platform posting (non-Twitter)
      this.menuManager.setUserState(chatId, 'awaiting_content', { 
        action: `post_${action}`,
        platform: action
      });
      
      const platformNames = {
        telegram: 'Telegram',
        instagram: 'Instagram',
        tiktok: 'TikTok'
      };
      
      const message = lang === 'es' ? 
        `📝 Envía el contenido que quieres publicar en ${platformNames[action]}:` :
        `📝 Send the content you want to post to ${platformNames[action]}:`;
      
      await this.bot.editMessageText(message, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '❌ Cancel', callback_data: 'menu_main' }]
          ]
        }
      });
    }
  }  async handlePostTwitterAccountSelection(chatId, messageId, data) {
    const lang = LanguageManager.getUserLanguage(chatId);
    const accountName = data.replace('post_twitter_account_', '');
    
    console.log(`[DEBUG] handlePostTwitterAccountSelection: selected account ${accountName} for immediate posting`);
    
    // Set user state to await content for immediate posting with Twitter account info
    this.menuManager.setUserState(chatId, 'awaiting_content', {
      action: 'post_twitter',
      platform: 'twitter',
      accountName // Add the selected Twitter account
    });
    
    const message = lang === 'es' ?
      `📝 <b>Publicar en Twitter</b>\n\nCuenta: <b>@${accountName}</b>\n\n💬 Envía el contenido que quieres publicar:` :
      `📝 <b>Post to Twitter</b>\n\nAccount: <b>@${accountName}</b>\n\n💬 Send the content you want to post:`;
    
    await this.bot.editMessageText(message, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: lang === 'es' ? '❌ Cancelar' : '❌ Cancel', callback_data: 'menu_post' }]
        ]
      }
    });
  }

  async handleScheduleAction(chatId, messageId, data) {
    const action = data.replace('schedule_', '');
    
    switch (action) {
      case 'later':
        const timeMenu = this.menuManager.getTimeMenu(chatId);
        await this.bot.editMessageText(timeMenu.text, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'HTML',
          ...this.menuManager.generateKeyboard(timeMenu.keyboard)
        });
        break;
        
      case 'view':
        await this.showScheduledContent(chatId, messageId);
        break;
        
      case 'cancel':
        await this.showCancelScheduledContent(chatId, messageId);
        break;
        
      case 'templates':
        const lang = LanguageManager.getUserLanguage(chatId);
        const templatesMessage = lang === 'es' ? 
          `🔄 <b>Plantillas de Programación</b>\n\nAún no hay plantillas disponibles.` :
          `🔄 <b>Schedule Templates</b>\n\nNo templates available yet.`;
        
        await this.bot.editMessageText(templatesMessage, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: lang === 'es' ? '🔙 Volver' : '🔙 Back', callback_data: 'menu_schedule' }]
            ]
          }
        });
        break;
        
      default:
        await this.showMainMenu(chatId);
    }
  }

  async handleLiveAction(chatId, messageId, data) {
    const action = data.replace('live_', '');
    
    switch (action) {
      case 'start':
        await this.startLiveStream(chatId, messageId);
        break;
        
      case 'end':
        await this.endLiveStream(chatId, messageId);
        break;
        
      case 'update':
        await this.sendLiveUpdate(chatId, messageId);
        break;
        
      case 'view':
        await this.viewActiveStreams(chatId, messageId);
        break;
        
      case 'invite':
        await this.createInviteLink(chatId, messageId);
        break;
        
      default:
        await this.showMainMenu(chatId);
    }
  }

  async handleQuickAction(chatId, messageId, data) {
    const action = data.replace('quick_', '');

    switch (action) {
      case 'post':
        // Quick post to Twitter
        this.menuManager.setUserState(chatId, 'awaiting_content', {
          action: 'quick_post',
          platform: 'twitter'
        });

        const lang = LanguageManager.getUserLanguage(chatId);
        const message = lang === 'es' ?
          '⚡ Envía tu mensaje para publicación rápida en Twitter:' :
          '⚡ Send your message for quick Twitter post:';

        await this.bot.editMessageText(message, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '❌ Cancel', callback_data: 'menu_main' }]
            ]
          }
        });
        break;

      case 'status':
        await this.showQuickStatus(chatId, messageId);
        break;

      default:
        await this.showMainMenu(chatId);
    }
  }

  async handlePlatformSelection(chatId, messageId, data) {
    // Extract platform and action from callback data
    // Format: platform_<platform>_<action>
    const parts = data.replace('platform_', '').split('_');
    const platform = parts[0];
    const action = parts[1] || 'post';

    const lang = LanguageManager.getUserLanguage(chatId);

    if (action === 'post') {
      // Set state for posting to selected platform
      this.menuManager.setUserState(chatId, 'awaiting_content', {
        action: `post_${platform}`,
        platform: platform
      });

      const platformNames = {
        twitter: 'Twitter/X',
        telegram: 'Telegram',
        instagram: 'Instagram',
        tiktok: 'TikTok',
        all: lang === 'es' ? 'todas las plataformas' : 'all platforms'
      };

      const message = lang === 'es' ?
        `📝 Envía el contenido que quieres publicar en ${platformNames[platform]}:` :
        `📝 Send the content you want to post to ${platformNames[platform]}:`;

      await this.bot.editMessageText(message, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: lang === 'es' ? '❌ Cancelar' : '❌ Cancel', callback_data: 'menu_main' }]
          ]
        }
      });
    } else {
      // Handle other actions (schedule, view, etc.)
      await this.showMainMenu(chatId);
    }
  }

  async handleTimeSelection(chatId, messageId, data) {
    const lang = LanguageManager.getUserLanguage(chatId);
    const timeOption = data.replace('time_', '');

    console.log(`[DEBUG] handleTimeSelection called with timeOption: ${timeOption}`);

    let scheduledTime;
    let timeDescription;

    // Calculate scheduled time based on selection (using Colombian time)
    switch (timeOption) {
      case 'now':
        // Immediate posting - show platform selection for immediate posting
        const nowMessage = lang === 'es' ?
          `⚡ <b>Publicar Inmediatamente</b>\n\n¿En qué plataforma quieres publicar ahora?` :
          `⚡ <b>Post Immediately</b>\n\nWhich platform do you want to post to now?`;

        try {
          await this.bot.editMessageText(nowMessage, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '🐦 Twitter/X', callback_data: `post_now_twitter` },
                  { text: '📱 Telegram', callback_data: `post_now_telegram` }
                ],
                [
                  { text: '📸 Instagram', callback_data: `post_now_instagram` },
                  { text: '🎵 TikTok', callback_data: `post_now_tiktok` }
                ],
                [
                  { text: '🌐 ' + (lang === 'es' ? 'Todas las Plataformas' : 'All Platforms'), callback_data: `post_now_all` }
                ],
                [
                  { text: lang === 'es' ? '🔙 Volver' : '🔙 Back', callback_data: 'menu_schedule' }
                ]
              ]
            }
          });
          console.log(`[DEBUG] Immediate posting platform selection shown`);
        } catch (error) {
          console.log(`[DEBUG] Error showing immediate posting options:`, error.message);
          await this.showMainMenu(chatId);
        }
        return;
      case '5min':
        scheduledTime = new Date(Date.now() + 5 * 60 * 1000);
        timeDescription = lang === 'es' ? 'en 5 minutos' : 'in 5 minutes';
        break;
      case '1hour':
        scheduledTime = addHoursToColombianTime(1);
        timeDescription = lang === 'es' ? 'en 1 hora' : 'in 1 hour';
        break;
      case '2hours':
        scheduledTime = addHoursToColombianTime(2);
        timeDescription = lang === 'es' ? 'en 2 horas' : 'in 2 hours';
        break;
      case '3hours':
        scheduledTime = addHoursToColombianTime(3);
        timeDescription = lang === 'es' ? 'en 3 horas' : 'in 3 hours';
        break;
      case '4hours':
        scheduledTime = addHoursToColombianTime(4);
        timeDescription = lang === 'es' ? 'en 4 horas' : 'in 4 hours';
        break;
      case '5hours':
        scheduledTime = addHoursToColombianTime(5);
        timeDescription = lang === 'es' ? 'en 5 horas' : 'in 5 hours';
        break;
      case '6hours':
        scheduledTime = addHoursToColombianTime(6);
        timeDescription = lang === 'es' ? 'en 6 horas' : 'in 6 hours';
        break;
      case '7hours':
        scheduledTime = addHoursToColombianTime(7);
        timeDescription = lang === 'es' ? 'en 7 horas' : 'in 7 hours';
        break;
      case '8hours':
        scheduledTime = addHoursToColombianTime(8);
        timeDescription = lang === 'es' ? 'en 8 horas' : 'in 8 hours';
        break;
      case '9hours':
        scheduledTime = addHoursToColombianTime(9);
        timeDescription = lang === 'es' ? 'en 9 horas' : 'in 9 hours';
        break;
      case '10hours':
        scheduledTime = addHoursToColombianTime(10);
        timeDescription = lang === 'es' ? 'en 10 horas' : 'in 10 hours';
        break;
      case '11hours':
        scheduledTime = addHoursToColombianTime(11);
        timeDescription = lang === 'es' ? 'en 11 horas' : 'in 11 hours';
        break;
      case '12hours':
        scheduledTime = addHoursToColombianTime(12);
        timeDescription = lang === 'es' ? 'en 12 horas' : 'in 12 hours';
        break;
      case '15hours':
        scheduledTime = addHoursToColombianTime(15);
        timeDescription = lang === 'es' ? 'en 15 horas' : 'in 15 hours';
        break;
      case '16hours':
        scheduledTime = addHoursToColombianTime(16);
        timeDescription = lang === 'es' ? 'en 16 horas' : 'in 16 hours';
        break;
      case '18hours':
        scheduledTime = addHoursToColombianTime(18);
        timeDescription = lang === 'es' ? 'en 18 horas' : 'in 18 hours';
        break;
      case '20hours':
        scheduledTime = addHoursToColombianTime(20);
        timeDescription = lang === 'es' ? 'en 20 horas' : 'in 20 hours';
        break;
      case '24hours':
        scheduledTime = addHoursToColombianTime(24);
        timeDescription = lang === 'es' ? 'en 24 horas' : 'in 24 hours';
        break;
      case '48hours':
        scheduledTime = addHoursToColombianTime(48);
        timeDescription = lang === 'es' ? 'en 2 días' : 'in 2 days';
        break;
      case '72hours':
        scheduledTime = addHoursToColombianTime(72);
        timeDescription = lang === 'es' ? 'en 3 días' : 'in 3 days';
        break;
      case 'more':
        // Show extended time menu
        const extendedMenu = this.menuManager.getExtendedTimeMenu(chatId);
        await this.bot.editMessageText(extendedMenu.text, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: extendedMenu.keyboard
          }
        });
        return;
      case 'main':
        // Show main time menu
        const timeMenu = this.menuManager.getTimeMenu(chatId);
        await this.bot.editMessageText(timeMenu.text, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: timeMenu.keyboard
          }
        });
        return;
      case 'tomorrow':
        scheduledTime = new Date();
        scheduledTime.setDate(scheduledTime.getDate() + 1);
        scheduledTime.setHours(9, 0, 0, 0); // Tomorrow at 9 AM
        timeDescription = lang === 'es' ? 'mañana a las 9:00 AM' : 'tomorrow at 9:00 AM';
        break;
      case 'custom':
        // For custom time, show instructions for user to input
        const customMessage = lang === 'es' ?
          '📅 <b>Hora Personalizada</b>\n\nEnvía la fecha y hora en formato:\n<code>DD/MM/YYYY HH:MM</code>\n\nEjemplo: <code>25/12/2025 15:30</code>' :
          '📅 <b>Custom Time</b>\n\nSend the date and time in format:\n<code>DD/MM/YYYY HH:MM</code>\n\nExample: <code>25/12/2025 15:30</code>';
        
        await this.bot.editMessageText(customMessage, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: lang === 'es' ? '🔙 Volver' : '🔙 Back', callback_data: 'menu_schedule' }]
            ]
          }
        });
        
        // Set user state to await custom time input
        this.menuManager.setUserState(chatId, 'awaiting_custom_time', {});
        return;
      default:
        console.log(`[DEBUG] Unknown timeOption: ${timeOption}, falling back to main menu`);
        await this.showMainMenu(chatId);
        return;
    }

    // Show platform selection for scheduling
    console.log(`[DEBUG] Showing platform selection for timeOption: ${timeOption}, scheduledTime: ${scheduledTime}`);
    
    const platformMessage = lang === 'es' ?
      `⏰ <b>Programar Post</b>\n\nHora programada: <b>${timeDescription}</b>\n(${scheduledTime.toLocaleString()})\n\n¿En qué plataforma quieres programar?` :
      `⏰ <b>Schedule Post</b>\n\nScheduled time: <b>${timeDescription}</b>\n(${scheduledTime.toLocaleString()})\n\nWhich platform do you want to schedule for?`;

    try {
      await this.bot.editMessageText(platformMessage, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🐦 Twitter/X', callback_data: `schedule_platform_twitter_${scheduledTime.getTime()}` },
              { text: '📱 Telegram', callback_data: `schedule_platform_telegram_${scheduledTime.getTime()}` }
            ],
            [
              { text: '📸 Instagram', callback_data: `schedule_platform_instagram_${scheduledTime.getTime()}` },
              { text: '🎵 TikTok', callback_data: `schedule_platform_tiktok_${scheduledTime.getTime()}` }
            ],
            [
              { text: '🌐 ' + (lang === 'es' ? 'Todas las Plataformas' : 'All Platforms'), callback_data: `schedule_platform_all_${scheduledTime.getTime()}` }
            ],
            [
              { text: lang === 'es' ? '🔙 Volver' : '🔙 Back', callback_data: 'menu_schedule' }
            ]
          ]
        }
      });
      console.log(`[DEBUG] Platform selection message sent successfully`);
    } catch (error) {
      console.log(`[DEBUG] Error sending platform selection message:`, error.message);
      await this.showMainMenu(chatId);
    }
  }

  async handleSchedulePlatformSelection(chatId, messageId, data) {
    const lang = LanguageManager.getUserLanguage(chatId);
    console.log(`[DEBUG] handleSchedulePlatformSelection called with data: ${data}`);
    
    // Parse the callback data: schedule_platform_<platform>_<timestamp>
    const parts = data.replace('schedule_platform_', '').split('_');
    const platform = parts[0];
    const timestamp = parts[1];
    const scheduledTime = new Date(parseInt(timestamp));

    console.log(`[DEBUG] Parsed platform: ${platform}, scheduledTime: ${scheduledTime}`);

    // Special handling for Twitter - show account selection
    if (platform === 'twitter') {
      const accounts = this.twitterAccountSelector.getAvailableAccounts();
      
      if (accounts.length === 0) {
        const noAccountsMessage = lang === 'es' ?
          `❌ <b>No hay cuentas de Twitter configuradas</b>\n\nPara usar Twitter, primero debes configurar al menos una cuenta.\n\n📧 Contacta al administrador para configurar cuentas de Twitter.` :
          `❌ <b>No Twitter accounts configured</b>\n\nTo use Twitter, you need to configure at least one account first.\n\n📧 Contact the administrator to set up Twitter accounts.`;

        await this.bot.editMessageText(noAccountsMessage, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: lang === 'es' ? '🔙 Volver' : '🔙 Back', callback_data: 'menu_schedule' }]
            ]
          }
        });
        return;
      }

      // Show Twitter account selection
      const accountMessage = lang === 'es' ?
        `🐦 <b>Selecciona Cuenta de Twitter</b>\n\nHora programada: <b>${scheduledTime.toLocaleString()}</b>\n\n👇 Elige la cuenta de Twitter para publicar:` :
        `🐦 <b>Select Twitter Account</b>\n\nScheduled time: <b>${scheduledTime.toLocaleString()}</b>\n\n👇 Choose the Twitter account to post to:`;

      const keyboard = this.twitterAccountSelector.generateAccountSelectionKeyboard(platform, timestamp, lang);
      
      await this.bot.editMessageText(accountMessage, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'HTML',
        reply_markup: keyboard
      });
      return;
    }

    // For other platforms, proceed as usual
    const contentMessage = lang === 'es' ?
      `📝 <b>Contenido para Programar</b>\n\nPlataforma: <b>${platform === 'all' ? 'Todas' : platform}</b>\nHora: <b>${scheduledTime.toLocaleString()}</b>\n\n💬 Envía el contenido que quieres programar (texto o multimedia):` :
      `📝 <b>Content to Schedule</b>\n\nPlatform: <b>${platform === 'all' ? 'All' : platform}</b>\nTime: <b>${scheduledTime.toLocaleString()}</b>\n\n💬 Send the content you want to schedule (text or media):`;

    await this.bot.editMessageText(contentMessage, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: lang === 'es' ? '❌ Cancelar' : '❌ Cancel', callback_data: 'menu_schedule' }]
        ]
      }
    });

    // Set user state to await content for scheduling
    this.menuManager.setUserState(chatId, 'awaiting_schedule_content', {
      platform,
      scheduledTime: scheduledTime.toISOString(),
      timestamp
    });
  }

  async handleTwitterAccountSelection(chatId, messageId, data) {
    const lang = LanguageManager.getUserLanguage(chatId);
    console.log(`[DEBUG] handleTwitterAccountSelection called with data: ${data}`);
    
    // Parse: schedule_twitter_account_<accountName>_<platform>_<timestamp>
    const parts = data.replace('schedule_twitter_account_', '').split('_');
    const accountName = parts[0];
    const platform = parts[1];
    const timestamp = parts[2];
    const scheduledTime = new Date(parseInt(timestamp));

    console.log(`[DEBUG] Selected Twitter account: ${accountName}, platform: ${platform}, scheduledTime: ${scheduledTime}`);

    // Ask user for content to schedule
    const contentMessage = lang === 'es' ?
      `📝 <b>Contenido para Twitter</b>\n\nCuenta: <b>@${accountName}</b>\nHora: <b>${scheduledTime.toLocaleString()}</b>\n\n💬 Envía el contenido que quieres programar (texto o multimedia):` :
      `📝 <b>Content for Twitter</b>\n\nAccount: <b>@${accountName}</b>\nTime: <b>${scheduledTime.toLocaleString()}</b>\n\n💬 Send the content you want to schedule (text or media):`;

    await this.bot.editMessageText(contentMessage, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: lang === 'es' ? '❌ Cancelar' : '❌ Cancel', callback_data: 'menu_schedule' }]
        ]
      }
    });

    // Set user state to await content for scheduling with Twitter account info
    this.menuManager.setUserState(chatId, 'awaiting_schedule_content', {
      platform,
      scheduledTime: scheduledTime.toISOString(),
      timestamp,
      accountName // Add the selected Twitter account
    });
  }

  async handleConfirmation(chatId, messageId, data) {
    const lang = LanguageManager.getUserLanguage(chatId);
    const parts = data.replace('confirm_', '').split('_');
    const confirmation = parts[0]; // 'yes' or 'no'

    if (confirmation === 'yes') {
      // Process the confirmed action
      const message = lang === 'es' ?
        '✅ Acción confirmada y procesada.' :
        '✅ Action confirmed and processed.';

      await this.bot.editMessageText(message, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: lang === 'es' ? '🏠 Menú Principal' : '🏠 Main Menu', callback_data: 'menu_main' }]
          ]
        }
      });
    } else {
      // Action cancelled
      const message = lang === 'es' ?
        '❌ Acción cancelada.' :
        '❌ Action cancelled.';

      await this.bot.editMessageText(message, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: lang === 'es' ? '🏠 Menú Principal' : '🏠 Main Menu', callback_data: 'menu_main' }]
          ]
        }
      });
    }
  }

  async handleUserInput(msg, userState) {
    const chatId = msg.chat.id;
    const text = msg.text;
    const photo = msg.photo;
    const video = msg.video;
    const document = msg.document;
    const caption = msg.caption;

    if (userState.state === 'awaiting_content') {
      // Check if message contains media (photo, video, or document)
      if (photo && photo.length > 0) {
        await this.processContentWithMedia(chatId, caption || '', { type: 'photo', data: photo }, userState.data);
      } else if (video) {
        await this.processContentWithMedia(chatId, caption || '', { type: 'video', data: video }, userState.data);
      } else if (document && (document.mime_type && (document.mime_type.startsWith('video/') || document.mime_type.startsWith('image/')))) {
        await this.processContentWithMedia(chatId, caption || '', { type: 'document', data: document }, userState.data);
      } else if (text && text.trim()) {
        await this.processContentInput(chatId, text, userState.data);
      } else {
        // Handle case where user sends empty text or no text
        const lang = LanguageManager.getUserLanguage(chatId);
        const message = lang === 'es' ? 
          '❌ Por favor envía un mensaje con contenido para publicar.' :
          '❌ Please send a message with content to post.';
        
        await this.bot.sendMessage(chatId, message, {
          reply_markup: {
            inline_keyboard: [
              [{ text: lang === 'es' ? '🔙 Volver' : '🔙 Back', callback_data: 'menu_main' }]
            ]
          }
        });
        return; // Don't clear user state, let them try again
      }
      this.menuManager.clearUserState(chatId);
    } else if (userState.state === 'awaiting_schedule_content') {
      // Handle scheduling content
      let content = '';
      let hasMedia = false;
      let mediaObject = null;

      // Check if message contains media
      if (photo && photo.length > 0) {
        content = caption || '';
        hasMedia = true;
        mediaObject = { type: 'photo', data: photo };
      } else if (video) {
        content = caption || '';
        hasMedia = true;
        mediaObject = { type: 'video', data: video };
      } else if (document && (document.mime_type && (document.mime_type.startsWith('video/') || document.mime_type.startsWith('image/')))) {
        content = caption || '';
        hasMedia = true;
        mediaObject = { type: 'document', data: document };
      } else if (text && text.trim()) {
        content = text.trim();
      }

      if (content) {
        await this.processScheduleContent(chatId, content, userState.data, hasMedia, mediaObject);
      } else {
        const lang = LanguageManager.getUserLanguage(chatId);
        const message = lang === 'es' ? 
          '❌ Por favor envía un mensaje con contenido para programar.' :
          '❌ Please send a message with content to schedule.';
        
        await this.bot.sendMessage(chatId, message, {
          reply_markup: {
            inline_keyboard: [
              [{ text: lang === 'es' ? '🔙 Volver' : '🔙 Back', callback_data: 'menu_schedule' }]
            ]
          }
        });
        return; // Don't clear user state, let them try again
      }
      this.menuManager.clearUserState(chatId);
    } else if (userState.state === 'awaiting_custom_time') {
      // Handle custom time input
      if (text && text.trim()) {
        await this.processCustomTimeInput(chatId, text.trim());
      } else {
        const lang = LanguageManager.getUserLanguage(chatId);
        const message = lang === 'es' ? 
          '❌ Por favor envía una fecha y hora válida.' :
          '❌ Please send a valid date and time.';
        
        await this.bot.sendMessage(chatId, message, {
          reply_markup: {
            inline_keyboard: [
              [{ text: lang === 'es' ? '🔙 Volver' : '🔙 Back', callback_data: 'menu_schedule' }]
            ]
          }
        });
        return; // Don't clear user state, let them try again
      }
      this.menuManager.clearUserState(chatId);
    }
  }

  async processCustomTimeInput(chatId, timeInput) {
    const lang = LanguageManager.getUserLanguage(chatId);
    
    console.log(`[DEBUG] processCustomTimeInput called with: ${timeInput}`);
    
    try {
      // Parse different time formats
      let scheduledTime;
      
      // Format: DD/MM/YYYY HH:MM
      const dateTimeRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})$/;
      const match = timeInput.match(dateTimeRegex);
      
      if (match) {
        const [, day, month, year, hours, minutes] = match;
        // Create date treating input as Colombian time
        const colombianScheduledTime = new Date(year, month - 1, day, hours, minutes);
        
        // Convert Colombian time to UTC for storage and scheduling
        scheduledTime = convertColombianTimeToUTC(colombianScheduledTime);
        
        // Validate the date against current UTC time
        if (scheduledTime.getTime() <= Date.now()) {
          const message = lang === 'es' ?
            '❌ La fecha debe ser en el futuro. Por favor intenta de nuevo.' :
            '❌ Date must be in the future. Please try again.';
          
          await this.bot.sendMessage(chatId, message, {
            reply_markup: {
              inline_keyboard: [
                [{ text: lang === 'es' ? '🔙 Volver' : '🔙 Back', callback_data: 'menu_schedule' }]
              ]
            }
          });
          return;
        }
        
      } else {
        // Try parsing other common formats
        const inputDate = new Date(timeInput);
        
        if (isNaN(inputDate.getTime())) {
          const message = lang === 'es' ?
            '❌ Formato de fecha inválido. Usa: DD/MM/YYYY HH:MM\n\nEjemplo: 25/12/2025 15:30' :
            '❌ Invalid date format. Use: DD/MM/YYYY HH:MM\n\nExample: 25/12/2025 15:30';
          
          await this.bot.sendMessage(chatId, message, {
            reply_markup: {
              inline_keyboard: [
                [{ text: lang === 'es' ? '🔄 Intentar de Nuevo' : '🔄 Try Again', callback_data: 'time_custom' }],
                [{ text: lang === 'es' ? '🔙 Volver' : '🔙 Back', callback_data: 'menu_schedule' }]
              ]
            }
          });
          return;
        }
        
        scheduledTime = inputDate;
      }
      
      console.log(`[DEBUG] Parsed custom time: ${scheduledTime}`);
      
      // Show platform selection for the custom time
      const timeDescription = lang === 'es' ? 
        `el ${scheduledTime.toLocaleDateString('es-ES')} a las ${scheduledTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}` :
        `on ${scheduledTime.toLocaleDateString('en-US')} at ${scheduledTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
      
      const platformMessage = lang === 'es' ?
        `⏰ <b>Programar Post</b>\n\nHora programada: <b>${timeDescription}</b>\n\n¿En qué plataforma quieres programar?` :
        `⏰ <b>Schedule Post</b>\n\nScheduled time: <b>${timeDescription}</b>\n\nWhich platform do you want to schedule for?`;

      await this.bot.sendMessage(chatId, platformMessage, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🐦 Twitter/X', callback_data: `schedule_platform_twitter_${scheduledTime.getTime()}` },
              { text: '📱 Telegram', callback_data: `schedule_platform_telegram_${scheduledTime.getTime()}` }
            ],
            [
              { text: '📸 Instagram', callback_data: `schedule_platform_instagram_${scheduledTime.getTime()}` },
              { text: '🎵 TikTok', callback_data: `schedule_platform_tiktok_${scheduledTime.getTime()}` }
            ],
            [
              { text: '🌐 ' + (lang === 'es' ? 'Todas las Plataformas' : 'All Platforms'), callback_data: `schedule_platform_all_${scheduledTime.getTime()}` }
            ],
            [
              { text: lang === 'es' ? '🔙 Volver' : '🔙 Back', callback_data: 'menu_schedule' }
            ]
          ]
        }
      });
      
    } catch (error) {
      console.log(`[DEBUG] Error processing custom time:`, error.message);
      const message = lang === 'es' ?
        `❌ Error al procesar la fecha: ${error.message}` :
        `❌ Error processing date: ${error.message}`;
      
      await this.bot.sendMessage(chatId, message, {
        reply_markup: {
          inline_keyboard: [
            [{ text: lang === 'es' ? '🔙 Volver' : '🔙 Back', callback_data: 'menu_schedule' }]
          ]
        }
      });
    }
  }

  async processScheduleContent(chatId, content, scheduleData, hasMedia = false, mediaObject = null) {
    const lang = LanguageManager.getUserLanguage(chatId);
    const { platform, scheduledTime, accountName } = scheduleData;
    const scheduledDate = new Date(scheduledTime);

    console.log(`[DEBUG] processScheduleContent called:`, {
      chatId,
      content: content.substring(0, 100) + '...',
      platform,
      scheduledTime,
      hasMedia
    });

    try {
      let scheduleResult;
      
      if (hasMedia) {
        // Handle media scheduling
        console.log(`[DEBUG] Processing media scheduling:`, mediaObject.type);
        
        try {
          // Download and save media file for scheduling
          const mediaPath = await this.downloadAndSaveMediaForScheduling(mediaObject, chatId);
          console.log(`[DEBUG] Media saved for scheduling:`, mediaPath);
          
          // Create media schedule options
          const mediaOptions = {
            hasMedia: true,
            mediaPath: mediaPath,
            mediaType: mediaObject.type,
            caption: content,
            ...(accountName && { accountName }) // Add Twitter account if specified
          };
          
          // Schedule the media content
          if (platform === 'all') {
            const platforms = ['twitter', 'telegram'];
            const results = [];
            
            for (const targetPlatform of platforms) {
              try {
                const result = await this.scheduler.scheduleContent(
                  targetPlatform,
                  content,
                  scheduledDate,
                  mediaOptions
                );
                results.push(`✅ ${targetPlatform}: ${lang === 'es' ? 'Multimedia programada' : 'Media scheduled'}`);
                console.log(`[DEBUG] Media scheduled for ${targetPlatform}:`, result.id);
              } catch (error) {
                results.push(`❌ ${targetPlatform}: ${error.message}`);
                console.log(`[DEBUG] Failed to schedule media for ${targetPlatform}:`, error.message);
              }
            }
            
            scheduleResult = results.join('\n');
          } else {
            try {
              const result = await this.scheduler.scheduleContent(
                platform,
                content,
                scheduledDate,
                mediaOptions
              );
              
              scheduleResult = lang === 'es' ?
                `✅ Contenido multimedia programado exitosamente para ${platform}` :
                `✅ Media content successfully scheduled for ${platform}`;
              
              console.log(`[DEBUG] Media scheduled for ${platform}:`, result.id);
            } catch (error) {
              scheduleResult = lang === 'es' ?
                `❌ Error al programar multimedia para ${platform}: ${error.message}` :
                `❌ Failed to schedule media for ${platform}: ${error.message}`;
              
              console.log(`[DEBUG] Failed to schedule media for ${platform}:`, error.message);
            }
          }
          
          console.log(`[DEBUG] Media scheduling block completed, continuing to confirmation...`);
          
          // Show confirmation message for media content
          const timeUntil = Math.round((scheduledDate.getTime() - Date.now()) / (1000 * 60));
          const contentType = lang === 'es' ? 'Video/Imagen' : 'Video/Image';
          
          // Display the scheduled UTC time in Colombian timezone 
          const colombianTimeString = scheduledDate.toLocaleString('es-CO', { 
            timeZone: 'America/Bogota',
            year: 'numeric',
            month: '2-digit', 
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          });
          
          console.log(`[DEBUG] Sending media confirmation message to chat ${chatId}. timeUntil: ${timeUntil}, contentType: ${contentType}, colombianTime: ${colombianTimeString}`);
          
          const mediaMessage = lang === 'es' ?
            `✅ <b>¡Contenido Multimedia Programado Exitosamente!</b>\n\n📅 <b>Fecha y Hora (Colombia):</b> ${colombianTimeString}\n⏰ <b>Tiempo restante:</b> ${timeUntil} minutos\n🌐 <b>Plataforma:</b> ${platformDisplay}\n📁 <b>Tipo:</b> ${contentType}\n\n📝 <b>Vista previa:</b>\n"${content.substring(0, 80)}${content.length > 80 ? '...' : ''}"\n\n💡 <i>Tu contenido multimedia se publicará automáticamente a la hora programada.</i>` :
            `✅ <b>Media Content Successfully Scheduled!</b>\n\n📅 <b>Date & Time (Colombia):</b> ${colombianTimeString}\n⏰ <b>Time remaining:</b> ${timeUntil} minutes\n🌐 <b>Platform:</b> ${platformDisplay}\n📁 <b>Type:</b> ${contentType}\n\n📝 <b>Preview:</b>\n"${content.substring(0, 80)}${content.length > 80 ? '...' : ''}"\n\n💡 <i>Your media content will be published automatically at the scheduled time.</i>`;

          await this.bot.sendMessage(chatId, mediaMessage, {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [
                  { text: lang === 'es' ? '📋 Ver Programados' : '📋 View Scheduled', callback_data: 'schedule_view' },
                  { text: lang === 'es' ? '🗑️ Cancelar' : '🗑️ Cancel', callback_data: 'schedule_cancel' }
                ],
                [
                  { text: lang === 'es' ? '⏰ Programar Más' : '⏰ Schedule More', callback_data: 'menu_schedule' },
                  { text: lang === 'es' ? '📊 Estado' : '📊 Status', callback_data: 'menu_status' }
                ],
                [
                  { text: lang === 'es' ? '🏠 Menú Principal' : '🏠 Main Menu', callback_data: 'menu_main' }
                ]
              ]
            }
          });
          
          console.log(`[DEBUG] Media confirmation message sent successfully to chat ${chatId}`);
          return; // Exit here for media content
          
        } catch (error) {
          console.log(`[DEBUG] Error processing media for scheduling:`, error.message);
          const message = lang === 'es' ?
            `❌ Error al procesar el archivo multimedia: ${error.message}` :
            `❌ Error processing media file: ${error.message}`;
          
          await this.bot.sendMessage(chatId, message, {
            reply_markup: {
              inline_keyboard: [
                [{ text: lang === 'es' ? '🏠 Menú Principal' : '🏠 Main Menu', callback_data: 'menu_main' }]
              ]
            }
          });
          return;
        }
      } else {
        // Handle text-only content scheduling
        console.log(`[DEBUG] Processing text-only scheduling`);
      
        // Schedule the content
      if (platform === 'all') {
        // Schedule for all platforms
        const platforms = ['twitter', 'telegram'];
        const results = [];
        
        for (const targetPlatform of platforms) {
          try {
            const result = await this.scheduler.scheduleContent(
              targetPlatform,
              content,
              scheduledDate,
              accountName && targetPlatform === 'twitter' ? { accountName } : {}
            );
            results.push(`✅ ${targetPlatform}: Programado exitosamente`);
            console.log(`[DEBUG] Scheduled for ${targetPlatform}:`, result.id);
          } catch (error) {
            results.push(`❌ ${targetPlatform}: ${error.message}`);
            console.log(`[DEBUG] Failed to schedule for ${targetPlatform}:`, error.message);
          }
        }
        
        scheduleResult = results.join('\n');
      } else {
        // Schedule for single platform
        try {
          const result = await this.scheduler.scheduleContent(
            platform,
            content,
            scheduledDate,
            accountName ? { accountName } : {}
          );
          
          scheduleResult = lang === 'es' ?
            `✅ Contenido programado exitosamente para ${platform}` :
            `✅ Content successfully scheduled for ${platform}`;
          
          console.log(`[DEBUG] Scheduled for ${platform}:`, result.id);
        } catch (error) {
          scheduleResult = lang === 'es' ?
            `❌ Error al programar para ${platform}: ${error.message}` :
            `❌ Failed to schedule for ${platform}: ${error.message}`;
          
          console.log(`[DEBUG] Failed to schedule for ${platform}:`, error.message);
        }
      }

      // Show enhanced confirmation message with Colombian time
      const timeUntil = Math.round((scheduledDate.getTime() - Date.now()) / (1000 * 60));
      const contentType = hasMedia ? (lang === 'es' ? 'Video/Imagen' : 'Video/Image') : (lang === 'es' ? 'Texto' : 'Text');
      
      // Display the scheduled UTC time in Colombian timezone 
      const colombianTimeString = scheduledDate.toLocaleString('es-CO', { 
        timeZone: 'America/Bogota',
        year: 'numeric',
        month: '2-digit', 
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      
      console.log(`[DEBUG] Sending confirmation message to chat ${chatId}. timeUntil: ${timeUntil}, contentType: ${contentType}, colombianTime: ${colombianTimeString}`);
      
      // Build the platform display text
      let platformDisplay = platform === 'all' ? (lang === 'es' ? 'Todas las plataformas' : 'All platforms') : platform.charAt(0).toUpperCase() + platform.slice(1);
      if (accountName && platform === 'twitter') {
        platformDisplay += ` (@${accountName})`;
      }
      
      const message = lang === 'es' ?
        `✅ <b>¡Contenido Programado Exitosamente!</b>\n\n📅 <b>Fecha y Hora (Colombia):</b> ${colombianTimeString}\n⏰ <b>Tiempo restante:</b> ${timeUntil} minutos\n🌐 <b>Plataforma:</b> ${platform === 'all' ? 'Todas las plataformas' : platform.charAt(0).toUpperCase() + platform.slice(1)}\n� <b>Tipo:</b> ${contentType}\n\n📝 <b>Vista previa:</b>\n"${content.substring(0, 80)}${content.length > 80 ? '...' : ''}"\n\n📊 <b>Estado:</b>\n${scheduleResult}\n\n💡 <i>Tu contenido se publicará automáticamente a la hora programada.</i>` :
        `✅ <b>Content Successfully Scheduled!</b>\n\n📅 <b>Date & Time (Colombia):</b> ${colombianTimeString}\n⏰ <b>Time remaining:</b> ${timeUntil} minutes\n🌐 <b>Platform:</b> ${platform === 'all' ? 'All platforms' : platform.charAt(0).toUpperCase() + platform.slice(1)}\n� <b>Type:</b> ${contentType}\n\n📝 <b>Preview:</b>\n"${content.substring(0, 80)}${content.length > 80 ? '...' : ''}"\n\n📊 <b>Status:</b>\n${scheduleResult}\n\n💡 <i>Your content will be published automatically at the scheduled time.</i>`;

      await this.bot.sendMessage(chatId, message, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: lang === 'es' ? '📋 Ver Programados' : '📋 View Scheduled', callback_data: 'schedule_view' },
              { text: lang === 'es' ? '🗑️ Cancelar' : '🗑️ Cancel', callback_data: 'schedule_cancel' }
            ],
            [
              { text: lang === 'es' ? '⏰ Programar Más' : '⏰ Schedule More', callback_data: 'menu_schedule' },
              { text: lang === 'es' ? '📊 Estado' : '📊 Status', callback_data: 'menu_status' }
            ],
            [
              { text: lang === 'es' ? '🏠 Menú Principal' : '🏠 Main Menu', callback_data: 'menu_main' }
            ]
          ]
        }
      });
      
      console.log(`[DEBUG] Confirmation message sent successfully to chat ${chatId}`);
      }

    } catch (error) {
      console.log(`[DEBUG] Error in processScheduleContent:`, error.message);
      const message = lang === 'es' ?
        `❌ Error al programar el contenido: ${error.message}` :
        `❌ Failed to schedule content: ${error.message}`;

      await this.bot.sendMessage(chatId, message, {
        reply_markup: {
          inline_keyboard: [
            [{ text: lang === 'es' ? '🏠 Menú Principal' : '🏠 Main Menu', callback_data: 'menu_main' }]
          ]
        }
      });
    }
  }

  async downloadAndSaveMediaForScheduling(mediaObject, chatId) {
    const fs = require('fs');
    const path = require('path');
    const https = require('https');

    // Get media file info based on type
    let fileId, fileExtension;
    
    if (mediaObject.type === 'photo') {
      const photo = mediaObject.data[mediaObject.data.length - 1];
      fileId = photo.file_id;
      fileExtension = 'jpg';
    } else if (mediaObject.type === 'video') {
      fileId = mediaObject.data.file_id;
      fileExtension = 'mp4';
    } else if (mediaObject.type === 'document') {
      fileId = mediaObject.data.file_id;
      if (mediaObject.data.file_name) {
        const ext = mediaObject.data.file_name.split('.').pop();
        fileExtension = ext || 'unknown';
      } else if (mediaObject.data.mime_type) {
        fileExtension = mediaObject.data.mime_type.includes('video') ? 'mp4' : 'jpg';
      } else {
        fileExtension = 'unknown';
      }
    }

    // Create scheduled media directory
    const scheduledDir = path.join(__dirname, '../../scheduled_media');
    if (!fs.existsSync(scheduledDir)) {
      fs.mkdirSync(scheduledDir, { recursive: true });
    }

    // Generate unique filename for scheduled media
    const timestamp = Date.now();
    const scheduledFileName = `scheduled_${chatId}_${timestamp}.${fileExtension}`;
    const scheduledFilePath = path.join(scheduledDir, scheduledFileName);

    // Download the media file
    const fileLink = await this.bot.getFileLink(fileId);
    
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(scheduledFilePath);
      https.get(fileLink, (response) => {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log(`[DEBUG] Media saved for scheduling: ${scheduledFilePath}`);
          resolve(scheduledFilePath);
        });
      }).on('error', (err) => {
        fs.unlink(scheduledFilePath, () => {});
        reject(err);
      });
    });
  }

  async processContentWithMedia(chatId, caption, mediaObject, actionData) {
    const lang = LanguageManager.getUserLanguage(chatId);
    const fs = require('fs');
    const path = require('path');

    console.log(`[DEBUG] processContentWithMedia called with:`, {
      chatId,
      caption: JSON.stringify(caption),
      captionLength: caption ? caption.length : 0,
      mediaType: mediaObject.type,
      actionData
    });

    // Validate caption for Twitter
    if (actionData.platform === 'twitter' && (!caption || !caption.trim())) {
      console.log(`[DEBUG] Twitter media validation failed - empty caption`);
      const message = lang === 'es' ? 
        '❌ Las publicaciones en Twitter requieren texto. Por favor envía el contenido multimedia con una descripción.' :
        '❌ Twitter posts require text. Please send the media with a caption.';
      
      await this.bot.sendMessage(chatId, message, {
        reply_markup: {
          inline_keyboard: [
            [{ text: lang === 'es' ? '🔙 Volver' : '🔙 Back', callback_data: 'menu_main' }]
          ]
        }
      });
      return;
    }

    try {
      // Get media file info based on type
      let fileId, fileExtension;
      
      if (mediaObject.type === 'photo') {
        // Get the largest photo (best quality)
        const photo = mediaObject.data[mediaObject.data.length - 1];
        fileId = photo.file_id;
        fileExtension = 'jpg';
      } else if (mediaObject.type === 'video') {
        fileId = mediaObject.data.file_id;
        fileExtension = 'mp4';
      } else if (mediaObject.type === 'document') {
        fileId = mediaObject.data.file_id;
        // Try to get extension from mime type or file name
        if (mediaObject.data.file_name) {
          const ext = mediaObject.data.file_name.split('.').pop();
          fileExtension = ext || 'unknown';
        } else if (mediaObject.data.mime_type) {
          fileExtension = mediaObject.data.mime_type.includes('video') ? 'mp4' : 'jpg';
        } else {
          fileExtension = 'unknown';
        }
      }

      console.log(`[DEBUG] Processing ${mediaObject.type} with fileId: ${fileId}, extension: ${fileExtension}`);

      // Download the media file
      const fileLink = await this.bot.getFileLink(fileId);
      const https = require('https');

      // Create temp directory if it doesn't exist
      const tempDir = path.join(__dirname, '../../temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const tempFilePath = path.join(tempDir, `${fileId}.${fileExtension}`);

      // Download file
      await new Promise((resolve, reject) => {
        const file = fs.createWriteStream(tempFilePath);
        https.get(fileLink, (response) => {
          response.pipe(file);
          file.on('finish', () => {
            file.close(resolve);
          });
        }).on('error', (err) => {
          fs.unlink(tempFilePath, () => {});
          reject(err);
        });
      });

      // Post with media
      const platform = actionData.platform;
      let result = '';

      if (platform === 'twitter' && this.twitterClient) {
        try {
          console.log(`[DEBUG] About to call sendMessageWithMedia:`, {
            caption: JSON.stringify(caption),
            captionLength: caption ? caption.length : 0,
            tempFilePath,
            accountName: actionData.accountName || 'default'
          });
          
          // Check if a specific account was selected
          if (actionData.accountName) {
            // Use MultiAccountTwitterClient for specific account
            const MultiAccountTwitterClient = require('./auth/multiAccountTwitterClient');
            const multiClient = new MultiAccountTwitterClient();
            await multiClient.sendMessageWithMedia(actionData.accountName, caption, tempFilePath);
          } else {
            // Use default Twitter client
            await this.twitterClient.sendMessageWithMedia(caption, tempFilePath);
          }
          
          result = lang === 'es' ?
            '✅ Publicado exitosamente en Twitter con contenido multimedia!' :
            '✅ Successfully posted to Twitter with media!';
        } catch (error) {
          console.log(`[DEBUG] Twitter media post error:`, error.message);
          result = lang === 'es' ?
            `❌ Error al publicar en Twitter: ${error.message}` :
            `❌ Failed to post to Twitter: ${error.message}`;
        } finally {
          // Clean up temp file
          if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
          }
        }
      } else {
        result = lang === 'es' ?
          `⚠️ ${platform} no soporta imágenes aún o no está configurado.` :
          `⚠️ ${platform} doesn't support images yet or is not configured.`;

        // Clean up temp file
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      }

      await this.bot.sendMessage(chatId, result, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: lang === 'es' ? '🏠 Menú Principal' : '🏠 Main Menu', callback_data: 'menu_main' }]
          ]
        }
      });

    } catch (error) {
      logger.error(`Failed to process media content for ${chatId}`, error);
      const errorMessage = lang === 'es' ?
        '❌ Error al procesar la imagen. Intenta de nuevo.' :
        '❌ Failed to process the image. Please try again.';

      await this.bot.sendMessage(chatId, errorMessage, {
        reply_markup: {
          inline_keyboard: [
            [{ text: lang === 'es' ? '🏠 Menú Principal' : '🏠 Main Menu', callback_data: 'menu_main' }]
          ]
        }
      });
    }
  }

  async processContentInput(chatId, content, actionData) {
    const lang = LanguageManager.getUserLanguage(chatId);
    
    // Debug logging
    console.log(`[DEBUG] processContentInput called with:`, {
      chatId,
      content: content ? `"${content.substring(0, 50)}..."` : 'null/undefined',
      contentLength: content ? content.length : 0,
      actionData
    });
    
    // Validate content
    if (!content || !content.trim()) {
      console.log(`[DEBUG] Content validation failed:`, {
        contentIsNull: content === null,
        contentIsUndefined: content === undefined,
        contentIsEmpty: content === '',
        contentTrimmed: content ? content.trim() : 'N/A'
      });
      
      const message = lang === 'es' ? 
        '❌ El contenido no puede estar vacío.' :
        '❌ Content cannot be empty.';
      
      await this.bot.sendMessage(chatId, message, {
        reply_markup: {
          inline_keyboard: [
            [{ text: lang === 'es' ? '🔙 Volver' : '🔙 Back', callback_data: 'menu_main' }]
          ]
        }
      });
      return;
    }
    
    try {
      if (actionData.action === 'post_all') {
        // Post to all platforms
        const results = [];
        
        if (this.twitterClient) {
          try {
            const result = await this.twitterClient.sendMessage(content);
            results.push(`✅ Twitter: Posted successfully`);
          } catch (error) {
            results.push(`❌ Twitter: ${error.message}`);
          }
        }
        
        if (this.telegramClient && process.env.TELEGRAM_DEFAULT_CHAT_ID) {
          try {
            await this.telegramMessageManager.sendTextMessage(
              process.env.TELEGRAM_DEFAULT_CHAT_ID, 
              content
            );
            results.push(`✅ Telegram: Posted successfully`);
          } catch (error) {
            results.push(`❌ Telegram: ${error.message}`);
          }
        }
        
        const summary = results.join('\n');
        const message = lang === 'es' ? 
          `📊 <b>Resultados de publicación:</b>\n\n${summary}` :
          `📊 <b>Publishing Results:</b>\n\n${summary}`;
        
        await this.bot.sendMessage(chatId, message, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🏠 Main Menu', callback_data: 'menu_main' }]
            ]
          }
        });
        
      } else if (actionData.action.startsWith('post_')) {
        // Single platform posting
        const platform = actionData.platform;
        let result = '';
        
        if (platform === 'twitter' && this.twitterClient) {
          try {
            console.log(`[DEBUG] Attempting to send to Twitter:`, {
              platform,
              contentLength: content.length,
              contentPreview: `"${content.substring(0, 100)}..."`,
              accountName: actionData.accountName || 'default'
            });

            // Check if a specific account was selected
            if (actionData.accountName) {
              // Use MultiAccountTwitterClient for specific account
              const MultiAccountTwitterClient = require('./auth/multiAccountTwitterClient');
              const multiClient = new MultiAccountTwitterClient();
              const tweetResult = await multiClient.sendMessage(actionData.accountName, content);
              result = lang === 'es' ?
                `✅ Publicado exitosamente en Twitter (@${actionData.accountName})!` :
                `✅ Successfully posted to Twitter (@${actionData.accountName})!`;
            } else {
              // Use default Twitter client
              const tweetResult = await this.twitterClient.sendMessage(content);
              result = lang === 'es' ?
                '✅ Publicado exitosamente en Twitter!' :
                '✅ Successfully posted to Twitter!';
            }
          } catch (error) {
            result = lang === 'es' ?
              `❌ Error al publicar en Twitter: ${error.message}` :
              `❌ Failed to post to Twitter: ${error.message}`;
          }
        } else if (platform === 'telegram' && this.telegramClient) {
          try {
            await this.telegramMessageManager.sendTextMessage(
              process.env.TELEGRAM_DEFAULT_CHAT_ID || chatId, 
              content
            );
            result = lang === 'es' ? 
              '✅ Publicado exitosamente en Telegram!' :
              '✅ Successfully posted to Telegram!';
          } catch (error) {
            result = lang === 'es' ? 
              `❌ Error al publicar en Telegram: ${error.message}` :
              `❌ Failed to post to Telegram: ${error.message}`;
          }
        } else {
          result = lang === 'es' ? 
            `⚠️ ${platform} no está configurado aún.` :
            `⚠️ ${platform} is not configured yet.`;
        }
        
        await this.bot.sendMessage(chatId, result, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🏠 Main Menu', callback_data: 'menu_main' }]
            ]
          }
        });
      }
      
    } catch (error) {
      logger.error(`Failed to process content input for ${chatId}`, error);
      const errorMessage = lang === 'es' ? 
        '❌ Error al procesar tu contenido. Intenta de nuevo.' :
        '❌ Failed to process your content. Please try again.';
      
      await this.bot.sendMessage(chatId, errorMessage, {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🏠 Main Menu', callback_data: 'menu_main' }]
          ]
        }
      });
    }
  }

  async showScheduledContent(chatId, messageId) {
    try {
      // Use direct database query to avoid Sequelize mapping issues
      console.log(`[DEBUG] showScheduledContent called for chat ${chatId}, messageId: ${messageId}`);
      console.log(`[DEBUG] Using direct database query to get scheduled content`);
      
      // Direct database query with raw SQL to bypass Sequelize issues
      const { ScheduledContent } = require('./database/models');
      const sequelize = ScheduledContent.sequelize;
      
      const scheduledPosts = await sequelize.query(`
        SELECT id, platform, message, scheduled_time as "scheduledTime", status, created_at as "createdAt"
        FROM scheduled_contents 
        WHERE status = 'pending' AND scheduled_time > NOW()
        ORDER BY scheduled_time ASC
        LIMIT 15
      `, {
        type: sequelize.QueryTypes.SELECT
      });
      
      console.log(`[DEBUG] Direct query returned ${scheduledPosts.length} posts`);
      console.log(`[DEBUG] Posts found:`, scheduledPosts.map(p => ({ id: p.id, status: p.status, platform: p.platform, scheduledTime: p.scheduledTime })));
      
      // Posts are already filtered by the SQL query (pending and future)
      const pendingPosts = scheduledPosts.slice(0, 10);
      
      console.log(`[DEBUG] Using ${pendingPosts.length} posts for display`);
      
      const lang = LanguageManager.getUserLanguage(chatId);
      
      if (pendingPosts.length === 0) {
        const message = lang === 'es' ? 
          '📅 No tienes contenido programado pendiente.' :
          '📅 You have no pending scheduled content.';
        
        await this.bot.editMessageText(message, {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: {
            inline_keyboard: [
              [
                { text: lang === 'es' ? '⏰ Programar Nuevo' : '⏰ Schedule New', callback_data: 'menu_schedule' },
                { text: lang === 'es' ? '🔙 Volver' : '🔙 Back', callback_data: 'menu_main' }
              ]
            ]
          }
        });
        return;
      }
      
      let message = lang === 'es' ? 
        '📅 <b>Contenido Programado:</b>\n\n' :
        '📅 <b>Scheduled Content:</b>\n\n';
      
      pendingPosts.forEach((post, index) => {
        const date = new Date(post.scheduledTime).toLocaleString();
        const platform = post.platform.charAt(0).toUpperCase() + post.platform.slice(1);
        const preview = post.message.substring(0, 60);
        message += `${index + 1}. 🌐 <b>${platform}</b>\n`;
        message += `   📅 ${date}\n`;
        message += `   📝 "${preview}${post.message.length > 60 ? '...' : ''}"\n   ⏱️ <i>${post.status}</i>\n\n`;
      });
      
      await this.bot.editMessageText(message, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔙 Back', callback_data: 'menu_schedule' }]
          ]
        }
      });
      
    } catch (error) {
      console.log(`[ERROR] Failed to show scheduled content for ${chatId}:`, error);
      // Show error message to user and return to main menu
      const lang = LanguageManager.getUserLanguage(chatId);
      const errorMessage = lang === 'es' ? 
        `❌ Error al cargar contenido programado: ${error.message}` :
        `❌ Error loading scheduled content: ${error.message}`;
      
      try {
        await this.bot.editMessageText(errorMessage, {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: {
            inline_keyboard: [
              [{ text: lang === 'es' ? '🔙 Volver al Menú' : '🔙 Back to Menu', callback_data: 'menu_main' }]
            ]
          }
        });
      } catch (editError) {
        console.log(`[ERROR] Could not edit message:`, editError);
        // Send new message if edit fails
        await this.bot.sendMessage(chatId, errorMessage, {
          reply_markup: {
            inline_keyboard: [
              [{ text: lang === 'es' ? '🔙 Volver al Menú' : '🔙 Back to Menu', callback_data: 'menu_main' }]
            ]
          }
        });
      }
    }
  }

  async showCancelScheduledContent(chatId, messageId) {
    try {
      // Use direct database query to get scheduled content that can be cancelled
      console.log(`[DEBUG] showCancelScheduledContent called for chat ${chatId}`);
      
      const { ScheduledContent } = require('./database/models');
      const sequelize = ScheduledContent.sequelize;
      
      const pendingPosts = await sequelize.query(`
        SELECT id, platform, message, scheduled_time as "scheduledTime", status, created_at as "createdAt"
        FROM scheduled_contents 
        WHERE status = 'pending' AND scheduled_time > NOW()
        ORDER BY scheduled_time ASC
        LIMIT 10
      `, {
        type: sequelize.QueryTypes.SELECT
      });
      
      console.log(`[DEBUG] Found ${pendingPosts.length} posts available for cancellation`);
      
      const lang = LanguageManager.getUserLanguage(chatId);
      
      if (pendingPosts.length === 0) {
        const message = lang === 'es' ? 
          '📅 No tienes contenido programado para cancelar.' :
          '📅 You have no scheduled content to cancel.';
        
        await this.bot.editMessageText(message, {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: {
            inline_keyboard: [
              [{ text: lang === 'es' ? '🔙 Volver' : '🔙 Back', callback_data: 'menu_schedule' }]
            ]
          }
        });
        return;
      }
      
      let message = lang === 'es' ? 
        '🗑️ <b>Cancelar Contenido Programado:</b>\n\n' :
        '🗑️ <b>Cancel Scheduled Content:</b>\n\n';
      
      const keyboard = [];
      pendingPosts.forEach((post, index) => {
        const date = new Date(post.scheduledTime).toLocaleString();
        const platform = post.platform.charAt(0).toUpperCase() + post.platform.slice(1);
        const preview = post.message.substring(0, 40);
        message += `${index + 1}. 🌐 <b>${platform}</b> - ${date}\n`;
        message += `   📝 "${preview}${post.message.length > 40 ? "..." : ""}"\n\n`;
        
        keyboard.push([{
          text: `❌ ${lang === 'es' ? 'Cancelar' : 'Cancel'} #${index + 1}`,
          callback_data: `cancel_post_${post.id}`
        }]);
      });
      
      keyboard.push([{ text: lang === 'es' ? '🔙 Volver' : '🔙 Back', callback_data: 'menu_schedule' }]);
      
      await this.bot.editMessageText(message, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: keyboard
        }
      });
      
    } catch (error) {
      console.log(`[ERROR] Failed to show cancel scheduled content for ${chatId}:`, error);
      const lang = LanguageManager.getUserLanguage(chatId);
      const errorMessage = lang === 'es' ? 
        `❌ Error al cargar posts para cancelar: ${error.message}` :
        `❌ Error loading posts to cancel: ${error.message}`;
      
      try {
        await this.bot.editMessageText(errorMessage, {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: {
            inline_keyboard: [
              [{ text: lang === 'es' ? '🔙 Volver al Menú' : '🔙 Back to Menu', callback_data: 'menu_main' }]
            ]
          }
        });
      } catch (editError) {
        console.log(`[ERROR] Could not edit message:`, editError);
        await this.bot.sendMessage(chatId, errorMessage, {
          reply_markup: {
            inline_keyboard: [
              [{ text: lang === 'es' ? '🔙 Volver al Menú' : '🔙 Back to Menu', callback_data: 'menu_main' }]
            ]
          }
        });
      }
    }
  }

  async handleCancelPost(chatId, messageId, data) {
    try {
      const postId = data.replace('cancel_post_', '');
      const lang = LanguageManager.getUserLanguage(chatId);
      
      console.log(`[DEBUG] Attempting to cancel post ID: ${postId}`);
      
      // Get the post details first
      const post = await this.scheduler.repository.getContentById(postId);
      
      if (!post) {
        const errorMessage = lang === 'es' ? 
          '❌ Post no encontrado o ya fue cancelado.' :
          '❌ Post not found or already cancelled.';
        
        await this.bot.editMessageText(errorMessage, {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: {
            inline_keyboard: [
              [{ text: lang === 'es' ? '🔙 Volver' : '🔙 Back', callback_data: 'schedule_cancel' }]
            ]
          }
        });
        return;
      }
      
      // Cancel the scheduled job
      await this.scheduler.cancelScheduledContent(postId);
      
      // Update the database status
      await this.scheduler.repository.updateContentStatus(postId, 'cancelled');
      
      const successMessage = lang === 'es' ? 
        `✅ <b>Post Cancelado Exitosamente</b>\n\n📝 "${post.message.substring(0, 60)}${post.message.length > 60 ? '...' : ''}"\n🌐 <b>Plataforma:</b> ${post.platform}\n📅 <b>Estaba programado para:</b> ${new Date(post.scheduledTime).toLocaleString('es-CO', { timeZone: 'America/Bogota' })}` :
        `✅ <b>Post Successfully Cancelled</b>\n\n📝 "${post.message.substring(0, 60)}${post.message.length > 60 ? '...' : ''}"\n🌐 <b>Platform:</b> ${post.platform}\n📅 <b>Was scheduled for:</b> ${new Date(post.scheduledTime).toLocaleString('en-US', { timeZone: 'America/Bogota' })}`;
      
      await this.bot.editMessageText(successMessage, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: lang === 'es' ? '🗑️ Cancelar Más' : '🗑️ Cancel More', callback_data: 'schedule_cancel' },
              { text: lang === 'es' ? '📋 Ver Programados' : '📋 View Scheduled', callback_data: 'schedule_view' }
            ],
            [
              { text: lang === 'es' ? '🏠 Menú Principal' : '🏠 Main Menu', callback_data: 'menu_main' }
            ]
          ]
        }
      });
      
      console.log(`[DEBUG] Successfully cancelled post ID: ${postId}`);
      
    } catch (error) {
      console.log(`[ERROR] Failed to cancel post:`, error);
      const lang = LanguageManager.getUserLanguage(chatId);
      const errorMessage = lang === 'es' ? 
        `❌ Error al cancelar el post: ${error.message}` :
        `❌ Error cancelling post: ${error.message}`;
      
      try {
        await this.bot.editMessageText(errorMessage, {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: {
            inline_keyboard: [
              [{ text: lang === 'es' ? '🔙 Volver' : '🔙 Back', callback_data: 'schedule_cancel' }]
            ]
          }
        });
      } catch (editError) {
        console.log(`[ERROR] Could not edit message:`, editError);
      }
    }
  }

  async handleSettingsAction(chatId, messageId, data) {
    const action = data.replace('settings_', '');
    const lang = LanguageManager.getUserLanguage(chatId);
    
    switch (action) {
      case 'templates':
        const templatesMessage = lang === 'es' ? 
          `🎨 <b>Plantillas de Contenido</b>\n\nAún no hay plantillas disponibles.` :
          `🎨 <b>Content Templates</b>\n\nNo templates available yet.`;
        
        await this.bot.editMessageText(templatesMessage, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: lang === 'es' ? '🔙 Volver' : '🔙 Back', callback_data: 'menu_settings' }]
            ]
          }
        });
        break;
        
      default:
        const settingsMenu = this.menuManager.getSettingsMenu(chatId);
        await this.bot.editMessageText(settingsMenu.text, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'HTML',
          ...this.menuManager.generateKeyboard(settingsMenu.keyboard)
        });
    }
  }

  async handleManageAction(chatId, messageId, data) {
    const action = data.replace('manage_', '');
    const lang = LanguageManager.getUserLanguage(chatId);
    
    switch (action) {
      default:
        const manageMenu = this.menuManager.getManageMenu(chatId);
        await this.bot.editMessageText(manageMenu.text, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'HTML',
          ...this.menuManager.generateKeyboard(manageMenu.keyboard)
        });
    }
  }

  async handleStatusAction(chatId, messageId, data) {
    const action = data.replace('status_', '');
    const lang = LanguageManager.getUserLanguage(chatId);
    
    switch (action) {
      case 'online':
        const statusMessage = lang === 'es' ? 
          `✅ <b>Estado del Bot</b>\n\n🤖 Estado: En línea\n⚡ Funcionando correctamente` :
          `✅ <b>Bot Status</b>\n\n🤖 Status: Online\n⚡ Running smoothly`;
        
        await this.bot.editMessageText(statusMessage, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: lang === 'es' ? '🔙 Volver' : '🔙 Back', callback_data: 'menu_status' }]
            ]
          }
        });
        break;
        
      default:
        await this.showMainMenu(chatId);
    }
  }

  async showQuickStatus(chatId, messageId) {
    const lang = LanguageManager.getUserLanguage(chatId);
    
    try {
      const pendingCount = await ScheduledContent.count({
        where: { status: 'pending' }
      });
      
      const completedCount = await ScheduledContent.count({
        where: { status: 'completed' }
      });
      
      const statusMessage = lang === 'es' ? 
        `📊 <b>Estado Rápido</b>\n\n⏰ Publicaciones pendientes: ${pendingCount}\n✅ Publicaciones completadas: ${completedCount}\n🤖 Bot: Funcionando correctamente` :
        `📊 <b>Quick Status</b>\n\n⏰ Pending posts: ${pendingCount}\n✅ Completed posts: ${completedCount}\n🤖 Bot: Running smoothly`;
      
      await this.bot.editMessageText(statusMessage, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🏠 Main Menu', callback_data: 'menu_main' }]
          ]
        }
      });
      
    } catch (error) {
      logger.error(`Failed to show quick status for ${chatId}`, error);
    }
  }

  async startLiveStream(chatId, messageId) {
    const lang = LanguageManager.getUserLanguage(chatId);
    
    try {
      if (!this.telegramLiveManager) {
        throw new Error('Live streaming not available');
      }
      
      const result = await this.telegramLiveManager.startLiveStream(chatId, {
        title: lang === 'es' ? 'Transmisión en Vivo' : 'Live Stream',
        description: lang === 'es' ? 'Iniciado desde el bot' : 'Started from bot',
        autoPin: true
      });
      
      const message = lang === 'es' ? 
        '🔴 ¡Transmisión en vivo iniciada!' :
        '🔴 Live stream started!';
      
      await this.bot.editMessageText(message, {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: {
          inline_keyboard: [
            [
              { text: '📡 End Stream', callback_data: 'live_end' },
              { text: '📢 Send Update', callback_data: 'live_update' }
            ],
            [{ text: '🏠 Main Menu', callback_data: 'menu_main' }]
          ]
        }
      });
      
    } catch (error) {
      logger.error(`Failed to start live stream for ${chatId}`, error);
      const errorMessage = lang === 'es' ? 
        '❌ Error al iniciar transmisión en vivo' :
        '❌ Failed to start live stream';
      
      await this.bot.editMessageText(errorMessage, {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔙 Back', callback_data: 'menu_live' }]
          ]
        }
      });
    }
  }

  async shutdown() {
    try {
      if (this.bot) {
        this.bot.stopPolling();
      }
      await dbConnection.close();
      logger.info('Enhanced Bot shutdown complete');
      process.exit(0);
    } catch (error) {
      logger.error('Error during enhanced bot shutdown', error);
      process.exit(1);
    }
  }
}

async function main() {
  try {
    const botManager = new EnhancedBotManager();
    await botManager.initialize();

    // Check command line arguments for mode
    const args = process.argv.slice(2);
    const mode = args[0] || 'enhanced';

    switch (mode) {
      case 'enhanced':
      case 'interactive':
        await botManager.startEnhancedInteractiveMode();
        break;
        
      case 'test':
        logger.info('Running enhanced bot test...');
        if (botManager.telegramClient) {
          const botInfo = await botManager.telegramClient.getBotInfo();
          logger.info(`✅ Enhanced Telegram Bot: @${botInfo.username}`);
        }
        logger.info('✅ Enhanced bot ready for deployment');
        await botManager.shutdown();
        break;
        
      default:
        logger.info('Enhanced Bot Modes:');
        logger.info('• npm run enhanced (default) - Enhanced interactive bot with menus');
        logger.info('• npm run enhanced test - Test enhanced bot functionality');
        await botManager.shutdown();
    }

  } catch (error) {
    handleError(error, logger);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down enhanced bot gracefully...');
  try {
    await dbConnection.close();
    process.exit(0);
  } catch (error) {
    logger.error('Error during enhanced bot shutdown', error);
    process.exit(1);
  }
});

main().catch(error => {
  handleError(error, logger);
  process.exit(1);
});