require('dotenv').config();

const HubManager = require('./core/hubManager');
const ContentScheduler = require('./core/contentScheduler');
const Logger = require('./utils/logger');
const dbConnection = require('./database/dbConnection');
const { ScheduledContent } = require('./database/models');
const { handleError } = require('./utils/errorHandler');

const logger = new Logger();

async function initializeDatabase() {
  try {
    // Test database connection
    await dbConnection.testConnection();

    // Sync database models (creates tables if they don't exist)
    await dbConnection.sync({ alter: process.env.NODE_ENV === 'development' });
    logger.info('Database synchronized successfully');
  } catch (error) {
    logger.error('Database initialization failed', error);
    throw error;
  }
}

async function main() {
  try {
    // Initialize database first
    await initializeDatabase();

    const hub = new HubManager();
    const scheduler = new ContentScheduler(hub);

    // Configuration for scheduling
    const config = {
      numberOfMessages: 20,
      intervalMinutes: 1,
      platform: 'twitter',
    };

    logger.info(`Starting to schedule ${config.numberOfMessages} messages for ${config.platform}`);

    // Schedule messages in parallel for better performance
    const now = new Date();
    const schedulePromises = [];

    for (let i = 1; i <= config.numberOfMessages; i++) {
      const scheduledTime = new Date(now.getTime() + i * config.intervalMinutes * 60000);

      const schedulePromise = scheduler.scheduleContent(
        config.platform,
        `Scheduled message ${i} for ${config.platform}`,
        scheduledTime,
        {}
      )
        .then((result) => {
          logger.info(`Scheduled message ${i} for ${config.platform} at ${scheduledTime}`);
          return result;
        })
        .catch((error) => {
          logger.error(`Failed to schedule message ${i}:`, error);
          return null;
        });

      schedulePromises.push(schedulePromise);
    }

    // Wait for all scheduling to complete
    const results = await Promise.all(schedulePromises);
    const successCount = results.filter(r => r !== null).length;
    logger.info(`Successfully scheduled ${successCount} out of ${config.numberOfMessages} messages`);

    // Retrieve and display scheduled contents
    try {
      const scheduledContents = await scheduler.getScheduledContents();
      logger.info(`Total scheduled contents in database: ${scheduledContents.length}`);
    } catch (error) {
      logger.error('Failed to retrieve scheduled contents:', error);
    }

    logger.info('Application started successfully. Scheduled jobs are running...');
    logger.info('Press Ctrl+C to exit');

  } catch (error) {
    handleError(error, logger);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully...');
  try {
    await dbConnection.close();
    logger.info('Database connection closed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', error);
    process.exit(1);
  }
});

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
