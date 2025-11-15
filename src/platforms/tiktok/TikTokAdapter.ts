import {
  PlatformAdapter,
  PlatformRequirements,
  PublishResult,
} from '../base/PlatformAdapter';
import { PostContent, Platform, PlatformMetrics } from '../../core/content/types';
import { logger } from '../../utils/logger';

export class TikTokAdapter extends PlatformAdapter {
  private credentials?: {
    clientKey: string;
    clientSecret: string;
    accessToken: string;
  };

  constructor() {
    super(Platform.TIKTOK);
  }

  async initialize(credentials: Record<string, string>): Promise<void> {
    this.credentials = {
      clientKey: credentials.clientKey,
      clientSecret: credentials.clientSecret,
      accessToken: credentials.accessToken,
    };

    logger.info('TikTok adapter initialized');
  }

  getRequirements(): PlatformRequirements {
    return {
      maxTextLength: 2200,
      maxMediaCount: 1,
      supportedMediaTypes: ['video/mp4'],
      maxImageSize: 0,
      maxVideoSize: 287 * 1024 * 1024, // 287MB
      maxVideoDuration: 60,
      supportsHashtags: true,
      supportsMentions: true,
      supportsScheduling: false,
    };
  }

  async publish(content: PostContent): Promise<PublishResult> {
    try {
      const validation = await this.validateContent(content);
      if (!validation.valid) {
        throw new Error(`Content validation failed: ${validation.errors.join(', ')}`);
      }

      // Implementation would use TikTok API
      logger.warn('TikTok publishing not fully implemented - requires API setup');

      return {
        success: true,
        platformPostId: `tt_${Date.now()}`,
        publishedAt: new Date(),
      };
    } catch (error: any) {
      logger.error('Failed to publish TikTok video:', error);
      return {
        success: false,
        error: error.message,
        publishedAt: new Date(),
      };
    }
  }

  async getMetrics(platformPostId: string): Promise<PlatformMetrics> {
    return {
      platform: Platform.TIKTOK,
      postId: platformPostId,
      likes: 0,
      shares: 0,
      comments: 0,
      views: 0,
      engagement: 0,
      timestamp: new Date(),
    };
  }

  async validateCredentials(): Promise<boolean> {
    return !!this.credentials;
  }
}
