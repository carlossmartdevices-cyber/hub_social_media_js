import { PostContent, MediaFile, Platform, PlatformMetrics } from '../../core/content/types';

export interface PlatformRequirements {
  maxTextLength: number;
  maxMediaCount: number;
  supportedMediaTypes: string[];
  maxImageSize: number;
  maxVideoSize: number;
  maxImageDimensions?: { width: number; height: number };
  maxVideoDuration?: number;
  supportsHashtags: boolean;
  supportsMentions: boolean;
  supportsScheduling: boolean;
}

export interface PublishResult {
  success: boolean;
  platformPostId?: string;
  error?: string;
  publishedAt: Date;
}

export abstract class PlatformAdapter {
  protected platform: Platform;

  constructor(platform: Platform) {
    this.platform = platform;
  }

  abstract initialize(credentials: Record<string, string>): Promise<void>;

  abstract getRequirements(): PlatformRequirements;

  abstract publish(content: PostContent): Promise<PublishResult>;

  abstract getMetrics(platformPostId: string): Promise<PlatformMetrics>;

  abstract validateCredentials(): Promise<boolean>;

  async validateContent(content: PostContent): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    const requirements = this.getRequirements();

    if (content.text.length > requirements.maxTextLength) {
      errors.push(
        `Text exceeds maximum length of ${requirements.maxTextLength} characters`
      );
    }

    if (content.media && content.media.length > requirements.maxMediaCount) {
      errors.push(`Media count exceeds maximum of ${requirements.maxMediaCount}`);
    }

    if (content.media) {
      for (const media of content.media) {
        if (!requirements.supportedMediaTypes.includes(media.mimeType)) {
          errors.push(`Media type ${media.mimeType} is not supported`);
        }

        if (media.type === 'image' && media.size > requirements.maxImageSize) {
          errors.push(`Image size exceeds maximum of ${requirements.maxImageSize} bytes`);
        }

        if (media.type === 'video' && media.size > requirements.maxVideoSize) {
          errors.push(`Video size exceeds maximum of ${requirements.maxVideoSize} bytes`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  getPlatform(): Platform {
    return this.platform;
  }
}
