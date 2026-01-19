import {
  PlatformAdapter,
  PlatformRequirements,
  PublishResult,
} from '../base/PlatformAdapter';
import { PostContent, Platform, PlatformMetrics } from '../../core/content/types';
import { logger } from '../../utils/logger';

export class YouTubeAdapter extends PlatformAdapter {
  private credentials?: {
    clientId: string;
    clientSecret: string;
    apiKey: string;
    refreshToken: string;
  };

  constructor() {
    super(Platform.YOUTUBE);
  }

  async initialize(credentials: Record<string, string>): Promise<void> {
    const clientId = credentials.clientId || '';
    const clientSecret = credentials.clientSecret || '';
    const apiKey = credentials.apiKey || '';
    const refreshToken = credentials.refreshToken || '';

    // Check if any credentials are missing
    if (!clientId.trim() || !clientSecret.trim() || !apiKey.trim() || !refreshToken.trim()) {
      logger.warn('YouTube API credentials are not fully configured - adapter will not be functional');
      this.credentials = undefined;
      return;
    }

    this.credentials = {
      clientId,
      clientSecret,
      apiKey,
      refreshToken,
    };

    logger.info('YouTube adapter initialized');
  }

  getRequirements(): PlatformRequirements {
    return {
      maxTextLength: 5000,
      maxMediaCount: 1,
      supportedMediaTypes: ['video/mp4', 'video/avi', 'video/mov'],
      maxImageSize: 2 * 1024 * 1024, // 2MB for thumbnails
      maxVideoSize: 128 * 1024 * 1024 * 1024, // 128GB
      supportsHashtags: true,
      supportsMentions: false,
      supportsScheduling: true,
    };
  }

  async publish(content: PostContent): Promise<PublishResult> {
    try {
      const validation = await this.validateContent(content);
      if (!validation.valid) {
        throw new Error(`Content validation failed: ${validation.errors.join(', ')}`);
      }

      // Implementation would use YouTube Data API v3
      logger.warn('YouTube publishing not fully implemented - requires API setup');

      return {
        success: true,
        platformPostId: `yt_${Date.now()}`,
        publishedAt: new Date(),
      };
    } catch (error: unknown) {
      logger.error('Failed to publish YouTube video:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to publish YouTube video';
      return {
        success: false,
        error: errorMessage,
        publishedAt: new Date(),
      };
    }
  }

  async getMetrics(platformPostId: string): Promise<PlatformMetrics> {
    return {
      platform: Platform.YOUTUBE,
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
