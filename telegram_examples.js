/**
 * Telegram API Usage Examples
 * 
 * This file demonstrates how to use the Telegram functionality
 * in the Hub Social Media JS project.
 */

const HubManager = require('./src/core/hubManager');
const ContentScheduler = require('./src/core/contentScheduler');
const TelegramAPIClient = require('./src/platforms/telegram/apiClient');
const TelegramMessageManager = require('./src/platforms/telegram/messageManager');
const TelegramLiveManager = require('./src/platforms/telegram/liveManager');
const Logger = require('./src/utils/logger');

const logger = new Logger();

async function telegramExamples() {
  try {
    // Replace with your actual chat ID (can be obtained from @userinfobot)
    const CHAT_ID = process.env.TELEGRAM_DEFAULT_CHAT_ID || '@your_channel_or_chat_id';
    
    if (!process.env.TELEGRAM_BOT_TOKEN) {
      logger.error('Please set TELEGRAM_BOT_TOKEN in your .env file');
      return;
    }

    logger.info('=== Telegram API Usage Examples ===\n');

    // Example 1: Basic message sending via HubManager
    logger.info('1. Sending a basic message via HubManager...');
    const hub = new HubManager();
    
    try {
      const result1 = await hub.sendMessage('telegram', 'Hello from Hub Social Media JS! 🚀', {
        chatId: CHAT_ID
      });
      logger.info('✓ Basic message sent successfully');
    } catch (error) {
      logger.warn('⚠ Skipping message send (likely missing chat ID):', error.message);
    }

    // Example 2: Formatted message
    logger.info('\n2. Sending a formatted message...');
    const messageManager = new TelegramMessageManager();
    
    try {
      const formattedMessage = {
        text: 'This is a formatted message with bold and italic text',
        entities: [
          { type: 'bold', offset: 34, length: 4 },    // 'bold'
          { type: 'italic', offset: 43, length: 6 }   // 'italic'
        ]
      };
      
      const result2 = await messageManager.sendFormattedMessage(CHAT_ID, formattedMessage);
      logger.info('✓ Formatted message sent successfully');
    } catch (error) {
      logger.warn('⚠ Skipping formatted message:', error.message);
    }

    // Example 3: Scheduling content
    logger.info('\n3. Scheduling content for Telegram...');
    const scheduler = new ContentScheduler(hub);
    
    const scheduledTime = new Date(Date.now() + 60000); // 1 minute from now
    
    try {
      const scheduledContent = await scheduler.scheduleContent(
        'telegram',
        'This is a scheduled message! ⏰',
        scheduledTime,
        { chatId: CHAT_ID }
      );
      logger.info(`✓ Content scheduled for ${scheduledTime}`);
    } catch (error) {
      logger.warn('⚠ Skipping scheduled content:', error.message);
    }

    // Example 4: Starting a live stream
    logger.info('\n4. Starting a live stream...');
    const liveManager = new TelegramLiveManager();
    
    try {
      const liveResult = await liveManager.startLiveStream(CHAT_ID, {
        title: 'Test Live Stream',
        description: 'This is a test live stream from our bot',
        autoPin: true,
        createInviteLink: true
      });
      logger.info('✓ Live stream started successfully');
      
      // Wait a bit then end the stream
      setTimeout(async () => {
        try {
          await liveManager.endLiveStream(CHAT_ID, {
            sendEndMessage: true,
            unpinAnnouncement: true
          });
          logger.info('✓ Live stream ended successfully');
        } catch (error) {
          logger.warn('⚠ Error ending live stream:', error.message);
        }
      }, 10000); // End after 10 seconds
      
    } catch (error) {
      logger.warn('⚠ Skipping live stream:', error.message);
    }

    // Example 5: Direct API client usage
    logger.info('\n5. Using API client directly...');
    const apiClient = new TelegramAPIClient();
    
    try {
      const botInfo = await apiClient.getBotInfo();
      logger.info(`✓ Bot info retrieved: @${botInfo.username} - ${botInfo.first_name}`);
    } catch (error) {
      logger.warn('⚠ Error getting bot info:', error.message);
    }

    // Example 6: Error handling
    logger.info('\n6. Demonstrating error handling...');
    
    try {
      // This should fail because chatId is missing
      await hub.sendMessage('telegram', 'This will fail');
    } catch (error) {
      logger.info('✓ Error handling working correctly:', error.message);
    }

    logger.info('\n=== Examples completed ===');
    logger.info('\nAvailable Telegram Methods:');
    logger.info('• HubManager.sendMessage("telegram", message, {chatId})');
    logger.info('• HubManager.startLive("telegram", {chatId, title, description})');
    logger.info('• TelegramAPIClient: sendPhoto, sendVideo, sendDocument, etc.');
    logger.info('• TelegramMessageManager: sendTextMessage, sendMediaMessage, etc.');
    logger.info('• TelegramLiveManager: startLiveStream, endLiveStream, etc.');
    logger.info('\nSee the implementation files for complete method documentation.');

  } catch (error) {
    logger.error('Error in Telegram examples:', error);
  }
}

// Configuration check
function checkConfiguration() {
  logger.info('=== Configuration Check ===');
  
  if (process.env.TELEGRAM_BOT_TOKEN) {
    logger.info('✓ TELEGRAM_BOT_TOKEN is configured');
  } else {
    logger.warn('✗ TELEGRAM_BOT_TOKEN is missing');
    logger.info('  Add this to your .env file: TELEGRAM_BOT_TOKEN=your_bot_token_here');
  }
  
  if (process.env.TELEGRAM_DEFAULT_CHAT_ID) {
    logger.info('✓ TELEGRAM_DEFAULT_CHAT_ID is configured');
  } else {
    logger.info('ℹ TELEGRAM_DEFAULT_CHAT_ID is not configured (optional)');
    logger.info('  You can add: TELEGRAM_DEFAULT_CHAT_ID=@your_channel_or_chat_id');
  }
  
  logger.info('');
}

// Run examples if this file is executed directly
if (require.main === module) {
  checkConfiguration();
  telegramExamples();
}

module.exports = { telegramExamples, checkConfiguration };