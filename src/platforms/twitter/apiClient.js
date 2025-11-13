const { TwitterApi } = require('twitter-api-v2');
const config = require('../../../config/twitter');
const Validator = require('../../utils/validator');
const fs = require('fs');
const path = require('path');

const TW_LOG_PATH = path.resolve(__dirname, '../../../logs/twitter_errors.log');

function logTwitterError(context, error) {
  try {
    const entry = {
      timestamp: new Date().toISOString(),
      context,
      message: error && error.message ? error.message : String(error),
      code: error && error.code ? error.code : null,
      stack: error && error.stack ? error.stack : null,
      response: error && error.response ? (error.response.data || error.response) : null,
    };
    const line = JSON.stringify(entry) + '\n';
    fs.mkdirSync(path.dirname(TW_LOG_PATH), { recursive: true });
    fs.appendFileSync(TW_LOG_PATH, line);
  } catch (e) {
    // Best effort logging - don't throw if logging fails
    // eslint-disable-next-line no-console
    console.error('Failed to write twitter error log:', e && e.message ? e.message : e);
  }
}

class TwitterAPIClient {
  constructor() {
    // Check which authentication method is available - prioritize OAuth 1.0a for posting
    if (config.consumerKey && config.consumerSecret && config.accessToken && config.accessTokenSecret) {
      // OAuth 1.0a (full read-write access) - BEST FOR POSTING
      this.client = new TwitterApi({
        appKey: config.consumerKey,
        appSecret: config.consumerSecret,
        accessToken: config.accessToken,
        accessSecret: config.accessTokenSecret,
      });
      this.authMethod = 'oauth1';
    } else if (config.clientId && config.clientSecret) {
      // OAuth 2.0 Client credentials
      this.client = new TwitterApi({
        clientId: config.clientId,
        clientSecret: config.clientSecret,
      });
      this.authMethod = 'oauth2';
    } else if (config.bearerToken) {
      // OAuth 2.0 Bearer Token authentication (read-only by default)
      this.client = new TwitterApi(config.bearerToken);
      this.authMethod = 'bearer';
    } else {
      throw new Error('Twitter API credentials not properly configured. Check your .env file.');
    }

    // Use read-write client for OAuth 1.0a
    if (this.authMethod === 'oauth1') {
      this.rwClient = this.client.readWrite;
    } else {
      this.rwClient = this.client;
    }
  }

  async sendMessage(message, options = {}) {
    try {
      if (this.authMethod === 'bearer' || this.authMethod === 'oauth2') {
        throw new Error('Tweet posting requires OAuth 1.0a credentials (Access Token & Secret). Please add TWITTER_ACCESS_TOKEN and TWITTER_ACCESS_TOKEN_SECRET to your .env file.');
      }

      // Validate tweet length
      const validatedMessage = Validator.validateTwitterMessage(message);

      // Create a tweet using API v2
      const tweet = await this.rwClient.v2.tweet(validatedMessage);
      return tweet;
    } catch (error) {
      logTwitterError('sendMessage', error);
      // Enhanced error messages for common Twitter errors
      if (error.code === 403) {
        throw new Error('Permission denied. Your Twitter app needs "Read and Write" permissions.');
      } else if (error.code === 429) {
        throw new Error('Rate limit exceeded. Please wait a few minutes before trying again.');
      } else if (error.code === 187) {
        throw new Error('Duplicate tweet. You cannot post the same content twice.');
      } else if (error.message && error.message.includes('too long')) {
        throw error; // Re-throw validation error as-is
      } else {
        throw new Error(`Twitter API error: ${error.message}`);
      }
    }
  }

  async sendMessageWithMedia(message, mediaPath, options = {}) {
    try {
      if (this.authMethod !== 'oauth1') {
        throw new Error('Media upload requires OAuth 1.0a credentials. Please add Access Token & Secret to your .env file.');
      }

      // Validate tweet length (280 chars with media)
      const validatedMessage = Validator.validateTwitterMessage(message);

      // Upload media first
      const mediaId = await this.client.v1.uploadMedia(mediaPath);

      // Tweet with media
      const tweet = await this.rwClient.v2.tweet({
        text: validatedMessage,
        media: { media_ids: [mediaId] }
      });

      return tweet;
    } catch (error) {
      logTwitterError('sendMessageWithMedia', error);
      // Enhanced error messages for media upload
      if (error.code === 403) {
        throw new Error('Permission denied. Your Twitter app needs "Read and Write" permissions.');
      } else if (error.code === 429) {
        throw new Error('Rate limit exceeded. Please wait a few minutes before trying again.');
      } else if (error.message && error.message.includes('too long')) {
        throw error; // Re-throw validation error as-is
      } else if (error.message && error.message.includes('media')) {
        throw new Error(`Media upload failed: ${error.message}. Check file size (max 5MB for images, 512MB for videos).`);
      } else {
        throw new Error(`Twitter media upload error: ${error.message}`);
      }
    }
  }

  async startLive(options = {}) {
    // Twitter Spaces (live audio) requires separate API access
    // This is a placeholder for future implementation
    throw new Error('Twitter live streaming (Spaces) is not yet implemented. Requires Twitter Spaces API access.');
  }
}

module.exports = TwitterAPIClient;