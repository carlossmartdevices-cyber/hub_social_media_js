require('dotenv').config();

module.exports = {
  apps: [{
    name: 'social-hub',
    script: './src/main_interactive_enhanced.js',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
      TELEGRAM_DEFAULT_CHAT_ID: process.env.TELEGRAM_DEFAULT_CHAT_ID,
      TWITTER_CLIENT_ID: process.env.TWITTER_CLIENT_ID,
      TWITTER_CLIENT_SECRET: process.env.TWITTER_CLIENT_SECRET,
      TWITTER_AUTH_BASE_URL: 'https://pnptv.app',
      TWITTER_AUTH_PORT: '3001'
    },
    env_production: {
      NODE_ENV: 'production',
      TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
      TELEGRAM_DEFAULT_CHAT_ID: process.env.TELEGRAM_DEFAULT_CHAT_ID,
      TWITTER_CLIENT_ID: process.env.TWITTER_CLIENT_ID,
      TWITTER_CLIENT_SECRET: process.env.TWITTER_CLIENT_SECRET,
      TWITTER_AUTH_BASE_URL: 'https://pnptv.app',
      TWITTER_AUTH_PORT: '3001'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }, {
    name: 'twitter-auth',
    script: './src/auth/authServer.js',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '200M',
    env: {
      NODE_ENV: 'production',
      TWITTER_CLIENT_ID: process.env.TWITTER_CLIENT_ID,
      TWITTER_CLIENT_SECRET: process.env.TWITTER_CLIENT_SECRET,
      TWITTER_AUTH_BASE_URL: 'https://pnptv.app',
      TWITTER_AUTH_PORT: '3001'
    },
    env_production: {
      NODE_ENV: 'production',
      TWITTER_CLIENT_ID: process.env.TWITTER_CLIENT_ID,
      TWITTER_CLIENT_SECRET: process.env.TWITTER_CLIENT_SECRET,
      TWITTER_AUTH_BASE_URL: 'https://pnptv.app',
      TWITTER_AUTH_PORT: '3001'
    },
    error_file: './logs/twitter-auth-err.log',
    out_file: './logs/twitter-auth-out.log',
    log_file: './logs/twitter-auth-combined.log',
    time: true
  }]
};
