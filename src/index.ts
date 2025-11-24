import dotenv from 'dotenv';
dotenv.config();
import { createApp } from './api/app';
import { config } from './config';
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

    // Referencia global para el bot de Telegram
    let telegramBot: TelegramBotCommands | null = null;

    // Endpoint para el webhook de Telegram
    app.post('/webhook/telegram', (req, res) => {
      if (telegramBot) {
        telegramBot.getBot().handleUpdate(req.body);
        res.status(200).send('OK');
      } else {
        res.status(503).send('Telegram bot not initialized');
      }
    });

    // Test database connection first
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

      // Initialize Telegram bot AFTER server is listening
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
              logger.info('Telegram bot webhook configured successfully');
            } catch (error) {
              logger.error('Failed to setup Telegram webhook:', error);
              logger.warn('Bot will not receive updates via webhook');
            }
          } else {
            // Start polling in background (don't await to avoid blocking)
            telegramBot.startPolling().catch(error => {
              logger.error('Failed to start Telegram bot polling:', error);
              logger.warn('Bot will not receive updates');
            });
            logger.info('Telegram bot starting in polling mode...');
          }
        } catch (error) {
          logger.error('Failed to initialize Telegram bot:', error);
          logger.warn('Application will continue without Telegram bot');
        }
      } else {
        logger.warn('Telegram bot token not configured - bot will not start');
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
