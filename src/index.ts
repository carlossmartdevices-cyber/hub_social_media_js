import { createApp } from './api/app';
import config from './config';
import { logger } from './utils/logger';
import database from './database/connection';
import { PostWorker } from './jobs/workers/PostWorker';
import { MetricsWorker } from './jobs/workers/MetricsWorker';
import { closeQueues } from './jobs/queue';
import { logPlatformStatus } from './utils/platformConfig';
import { Telegraf } from 'telegraf';
import { TelegramBotCommands } from './platforms/telegram/TelegramBotCommands';

async function startServer() {
  try {
    // Create Express app
    const app = createApp();

<<<<<<< HEAD
    // --- Telegram Webhook Setup ---
    const { Telegraf } = require('telegraf');
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (botToken) {
      const bot = new Telegraf(botToken);
      await bot.telegram.setWebhook('https://easybots.store/webhook/telegram');
      app.use(bot.webhookCallback('/webhook/telegram'));
      logger.info('Telegram webhook configured at /webhook/telegram');
    } else {
      logger.warn('TELEGRAM_BOT_TOKEN not set, Telegram webhook not configured');
    }
=======
>>>>>>> f036afd5b2d4361ce25fcf43a9ae6935cd8eaff3
    // Initialize Telegram bot BEFORE starting server (webhook needs to be registered before server starts)
    let telegramBot: TelegramBotCommands | null = null;
    if (config.platforms.telegram.botToken) {
      try {
        const bot = new Telegraf(config.platforms.telegram.botToken);
        telegramBot = new TelegramBotCommands(bot);

        // Usa webhook si está habilitado en la config
        if (config.platforms.telegram.useWebhook && config.platforms.telegram.webhookUrl) {
          try {
            const webhookUrl = `${config.platforms.telegram.webhookUrl}${config.platforms.telegram.webhookPath}`;
            await telegramBot.setupWebhook(
              webhookUrl,
              config.platforms.telegram.webhookSecret || undefined
            );
            logger.info('Telegram bot webhook configurado correctamente');
          } catch (error) {
            logger.error('Error al configurar el webhook de Telegram:', error);
            logger.warn('El bot no recibirá actualizaciones por webhook');
          }
        } else {
          await telegramBot.startPolling();
          logger.info('Telegram bot inicializado en modo polling');
        }
      } catch (error) {
        logger.error('Failed to start Telegram bot:', error);
        logger.warn('Application will continue without Telegram bot');
      }
    } else {
      logger.warn('Telegram bot token not configured - bot will not start');
    }

    // Test database connection
    await database.query('SELECT NOW()');
    logger.info('Database connection established');

    // Log platform configuration status
    logPlatformStatus();

    // Initialize workers
    const postWorker = new PostWorker();
    const metricsWorker = new MetricsWorker();
    logger.info('Workers initialized');

    // Start server
    const server = app.listen(config.port, async () => {
      logger.info(`Server running on port ${config.port} in ${config.env} mode`);
      logger.info(`API available at ${config.apiUrl}/api`);

      // Setup Telegram webhook AFTER server is listening
      if (telegramBot && config.platforms.telegram.useWebhook && config.platforms.telegram.webhookUrl) {
        try {
          const webhookUrl = `${config.platforms.telegram.webhookUrl}${config.platforms.telegram.webhookPath}`;
          await telegramBot.setupWebhook(
            webhookUrl,
            config.platforms.telegram.webhookSecret || undefined
          );
          logger.info('Telegram bot webhook configured successfully');
        } catch (error) {
          logger.error('Failed to setup Telegram webhook:', error);
          logger.warn('Bot will not receive updates via webhook');
        }
      }
    });

    // Graceful shutdown
    const shutdown = async () => {
      logger.info('Shutting down gracefully...');

      server.close(() => {
        logger.info('HTTP server closed');
      });

      // Stop Telegram bot if running
      if (telegramBot) {
        try {
          await telegramBot.stop();
          logger.info('Telegram bot stopped');
        } catch (error) {
          logger.error('Error stopping Telegram bot:', error);
        }
      }

      await postWorker.close();
      await metricsWorker.close();
      await closeQueues();
      await database.close();

      process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
