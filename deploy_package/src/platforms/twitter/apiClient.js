const { TwitterApi } = require('twitter-api-v2');
const config = require('../../../config/twitter');

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

      // Create a tweet using API v2
      const tweet = await this.rwClient.v2.tweet(message);
      return tweet;
    } catch (error) {
      throw new Error(`Twitter API error: ${error.message}`);
    }
  }

  async sendMessageWithMedia(message, mediaPath, options = {}) {
    try {
      if (this.authMethod !== 'oauth1') {
        throw new Error('Media upload requires OAuth 1.0a credentials. Please add Access Token & Secret to your .env file.');
      }

      // Upload media first
      const mediaId = await this.client.v1.uploadMedia(mediaPath);

      // Tweet with media
      const tweet = await this.rwClient.v2.tweet({
        text: message,
        media: { media_ids: [mediaId] }
      });

      return tweet;
    } catch (error) {
      throw new Error(`Twitter media upload error: ${error.message}`);
    }
  }

  async startLive(options = {}) {
    // Twitter Spaces (live audio) requires separate API access
    // This is a placeholder for future implementation
    throw new Error('Twitter live streaming (Spaces) is not yet implemented. Requires Twitter Spaces API access.');
  }
}

module.exports = TwitterAPIClient;