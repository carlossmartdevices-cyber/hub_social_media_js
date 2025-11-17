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

    // Test database connection
    await database.query('SELECT NOW()');
    logger.info('Database connection established');

    // Log platform configuration status
    logPlatformStatus();

    // Initialize Telegram bot if token is configured
    let telegramBot: TelegramBotCommands | null = null;
    if (config.platforms.telegram.botToken) {
      try {
        const bot = new Telegraf(config.platforms.telegram.botToken);
        telegramBot = new TelegramBotCommands(bot);
        await telegramBot.startPolling();
        logger.info('Telegram bot initialized and started');
      } catch (error) {
        logger.error('Failed to start Telegram bot:', error);
        logger.warn('Application will continue without Telegram bot');
      }
    } else {
      logger.warn('Telegram bot token not configured - bot will not start');
    }

    // Initialize workers
    const postWorker = new PostWorker();
    const metricsWorker = new MetricsWorker();
    logger.info('Workers initialized');

    // Start server
    const server = app.listen(config.port, () => {
      logger.info(`Server running on port ${config.port} in ${config.env} mode`);
      logger.info(`API available at ${config.apiUrl}/api`);
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
