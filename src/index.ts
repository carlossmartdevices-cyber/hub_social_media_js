import { createApp } from './api/app';
import config from './config';
import { logger } from './utils/logger';
import database from './database/connection';
import { PostWorker } from './jobs/workers/PostWorker';
import { MetricsWorker } from './jobs/workers/MetricsWorker';
import { closeQueues } from './jobs/queue';
import { logPlatformStatus } from './utils/platformConfig';

async function startServer() {
  try {
    // Create Express app
    const app = createApp();

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
