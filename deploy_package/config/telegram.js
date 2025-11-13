require('dotenv').config();

module.exports = {
  // Bot Token from BotFather
  token: process.env.TELEGRAM_BOT_TOKEN,
  
  // Optional: Default chat ID for testing
  defaultChatId: process.env.TELEGRAM_DEFAULT_CHAT_ID,
  
  // Optional: Webhook configuration
  webhook: {
    url: process.env.TELEGRAM_WEBHOOK_URL,
    port: process.env.TELEGRAM_WEBHOOK_PORT || 8443,
    host: process.env.TELEGRAM_WEBHOOK_HOST || 'localhost'
  },
  
  // API Configuration
  api: {
    baseUrl: 'https://api.telegram.org',
    fileBaseUrl: 'https://api.telegram.org/file',
    timeout: 30000, // 30 seconds
    retryLimit: 3
  },
  
  // Default message options
  defaults: {
    parseMode: 'HTML',
    disableWebPagePreview: false,
    disableNotification: false
  },
  
  // Limits based on Telegram API
  limits: {
    messageLength: 4096,
    captionLength: 1024,
    mediaGroupSize: 10,
    fileSize: 50 * 1024 * 1024, // 50MB
    photoSize: 10 * 1024 * 1024  // 10MB
  }
};