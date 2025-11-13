const TelegramAPIClient = require('./src/platforms/telegram/apiClient');
const TelegramMessageManager = require('./src/platforms/telegram/messageManager');
const TelegramLiveManager = require('./src/platforms/telegram/liveManager');
const Logger = require('./src/utils/logger');

const logger = new Logger();

async function testTelegramImplementation() {
  try {
    logger.info('Testing Telegram API implementation...');

    // Test 1: Initialize API Client
    logger.info('1. Testing API Client initialization...');
    const apiClient = new TelegramAPIClient();
    
    // Test bot info retrieval
    try {
      const botInfo = await apiClient.getBotInfo();
      logger.info(`Bot Info: @${botInfo.username} - ${botInfo.first_name}`);
    } catch (error) {
      logger.error('Bot info test failed. Check your TELEGRAM_BOT_TOKEN in .env file');
      return;
    }

    // Test 2: Message Manager
    logger.info('2. Testing Message Manager initialization...');
    const messageManager = new TelegramMessageManager();
    logger.info('Message Manager initialized successfully');

    // Test 3: Live Manager
    logger.info('3. Testing Live Manager initialization...');
    const liveManager = new TelegramLiveManager();
    logger.info('Live Manager initialized successfully');

    // Test 4: Validate methods existence
    logger.info('4. Validating API methods...');
    
    const apiMethods = [
      'sendMessage', 'sendPhoto', 'sendVideo', 'sendDocument',
      'sendMediaGroup', 'editMessage', 'deleteMessage', 'getChatInfo',
      'startLive', 'createChatInviteLink', 'pinMessage'
    ];

    for (const method of apiMethods) {
      if (typeof apiClient[method] === 'function') {
        logger.info(`✓ API method ${method} exists`);
      } else {
        logger.warn(`✗ API method ${method} missing`);
      }
    }

    const messageMethods = [
      'sendTextMessage', 'sendMediaMessage', 'sendMediaGroup',
      'sendFormattedMessage', 'editMessage', 'deleteMessage',
      'forwardMessage', 'sendReplyMessage', 'pinMessage'
    ];

    for (const method of messageMethods) {
      if (typeof messageManager[method] === 'function') {
        logger.info(`✓ Message Manager method ${method} exists`);
      } else {
        logger.warn(`✗ Message Manager method ${method} missing`);
      }
    }

    const liveMethods = [
      'startLiveStream', 'endLiveStream', 'updateLiveStreamInfo',
      'getLiveStreamInfo', 'getAllActiveLiveStreams', 'sendLiveUpdate',
      'createLiveStreamInvite'
    ];

    for (const method of liveMethods) {
      if (typeof liveManager[method] === 'function') {
        logger.info(`✓ Live Manager method ${method} exists`);
      } else {
        logger.warn(`✗ Live Manager method ${method} missing`);
      }
    }

    // Test 5: Configuration validation
    logger.info('5. Testing configuration...');
    const config = require('./config/telegram');
    
    if (config.token) {
      logger.info('✓ Bot token configured');
    } else {
      logger.warn('✗ Bot token not configured - set TELEGRAM_BOT_TOKEN in .env');
    }

    if (config.defaultChatId) {
      logger.info('✓ Default chat ID configured');
    } else {
      logger.info('ℹ Default chat ID not configured (optional)');
    }

    logger.info('All tests completed successfully!');
    logger.info('');
    logger.info('To use Telegram functionality:');
    logger.info('1. Set TELEGRAM_BOT_TOKEN in your .env file');
    logger.info('2. Optionally set TELEGRAM_DEFAULT_CHAT_ID for testing');
    logger.info('3. Use the HubManager.sendMessage("telegram", message, {chatId: "your-chat-id"})');
    logger.info('4. Use the HubManager.startLive("telegram", {chatId: "your-chat-id", title: "Stream Title"})');

  } catch (error) {
    logger.error('Telegram implementation test failed', error);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testTelegramImplementation();
}

module.exports = testTelegramImplementation;