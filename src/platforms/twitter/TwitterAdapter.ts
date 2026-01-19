import { TwitterApi, TweetV2PostTweetResult, SendTweetV2Params } from 'twitter-api-v2';
import {
  PlatformAdapter,
  PlatformRequirements,
  PublishResult,
} from '../base/PlatformAdapter';
import { PostContent, Platform, PlatformMetrics } from '../../core/content/types';
import { logger } from '../../utils/logger';

export class TwitterAdapter extends PlatformAdapter {
  private client?: TwitterApi;
  private credentials?: {
    apiKey: string;
    apiSecret: string;
    accessToken: string;
    accessSecret: string;
  };

  constructor() {
    super(Platform.TWITTER);
  }

  async initialize(credentials: Record<string, string>): Promise<void> {
    const apiKey = credentials.apiKey || '';
    const apiSecret = credentials.apiSecret || '';
    const accessToken = credentials.accessToken || '';
    const accessSecret = credentials.accessSecret || '';

    // Check if any credentials are missing
    if (!apiKey.trim() || !apiSecret.trim() || !accessToken.trim() || !accessSecret.trim()) {
      logger.warn('Twitter API credentials are not fully configured - adapter will not be functional');
      this.credentials = undefined;
      this.client = undefined;
      return;
    }

    this.credentials = {
      apiKey,
      apiSecret,
      accessToken,
      accessSecret,
    };

    this.client = new TwitterApi({
      appKey: this.credentials.apiKey,
      appSecret: this.credentials.apiSecret,
      accessToken: this.credentials.accessToken,
      accessSecret: this.credentials.accessSecret,
    });

    logger.info('Twitter adapter initialized');
  }

  getRequirements(): PlatformRequirements {
    return {
      maxTextLength: 280,
      maxMediaCount: 4,
      supportedMediaTypes: ['image/jpeg', 'image/png', 'image/gif', 'video/mp4'],
      maxImageSize: 5 * 1024 * 1024, // 5MB
      maxVideoSize: 512 * 1024 * 1024, // 512MB
      maxImageDimensions: { width: 4096, height: 4096 },
      maxVideoDuration: 140,
      supportsHashtags: true,
      supportsMentions: true,
      supportsScheduling: false,
    };
  }

  async publish(content: PostContent): Promise<PublishResult> {
    if (!this.client) {
      throw new Error('Twitter client not initialized');
    }

    try {
      const validation = await this.validateContent(content);
      if (!validation.valid) {
        throw new Error(`Content validation failed: ${validation.errors.join(', ')}`);
      }

      let mediaIds: string[] = [];

      if (content.media && content.media.length > 0) {
        for (const media of content.media) {
          if (!media.buffer) {
            throw new Error('Media buffer is required for upload');
          }

          const mediaId = await this.client.v1.uploadMedia(media.buffer, {
            mimeType: media.mimeType,
          });
          mediaIds.push(mediaId);
        }
      }

      // Use the proper Twitter API type for tweet options
      let result: TweetV2PostTweetResult;

      if (mediaIds.length > 0) {
        // Convert to SendTweetV2Params when media is present
        const tweetOptions: SendTweetV2Params = {
          text: content.text,
          media: {
            media_ids: mediaIds.slice(0, 4) as [string] | [string, string] | [string, string, string] | [string, string, string, string]
          }
        };
        result = await this.client.v2.tweet(tweetOptions);
      } else {
        // Simple text tweet
        result = await this.client.v2.tweet(content.text);
      }

      logger.info(`Tweet published successfully: ${result.data.id}`);

      return {
        success: true,
        platformPostId: result.data.id,
        publishedAt: new Date(),
      };
    } catch (error: unknown) {
      logger.error('Failed to publish tweet:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to publish tweet';
      return {
        success: false,
        error: errorMessage,
        publishedAt: new Date(),
      };
    }
  }

  async getMetrics(platformPostId: string): Promise<PlatformMetrics> {
    if (!this.client) {
      throw new Error('Twitter client not initialized');
    }

    try {
      const tweet = await this.client.v2.singleTweet(platformPostId, {
        'tweet.fields': ['public_metrics'],
      });

      const metrics = tweet.data.public_metrics || {
        like_count: 0,
        retweet_count: 0,
        reply_count: 0,
        impression_count: 0,
      };

      return {
        platform: Platform.TWITTER,
        postId: platformPostId,
        likes: metrics.like_count,
        shares: metrics.retweet_count,
        comments: metrics.reply_count,
        views: metrics.impression_count || 0,
        engagement:
          metrics.like_count + metrics.retweet_count + metrics.reply_count,
        timestamp: new Date(),
      };
    } catch (error: unknown) {
      logger.error('Failed to fetch Twitter metrics:', error);
      throw error;
    }
  }

  async validateCredentials(): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      await this.client.v2.me();
      return true;
    } catch (error) {
      logger.error('Twitter credentials validation failed:', error);
      return false;
    }
  }
}
