import { Platform } from '../core/content/types';
import { PlatformAdapter } from './base/PlatformAdapter';
import { TwitterAdapter } from './twitter/TwitterAdapter';
import { TelegramAdapter } from './telegram/TelegramAdapter';
import { InstagramAdapter } from './instagram/InstagramAdapter';
import { FacebookAdapter } from './facebook/FacebookAdapter';
import { LinkedInAdapter } from './linkedin/LinkedInAdapter';
import { YouTubeAdapter } from './youtube/YouTubeAdapter';
import { TikTokAdapter } from './tiktok/TikTokAdapter';

export class PlatformFactory {
  static createAdapter(platform: Platform): PlatformAdapter {
    switch (platform) {
      case Platform.TWITTER:
        return new TwitterAdapter();
      case Platform.TELEGRAM:
        return new TelegramAdapter();
      case Platform.INSTAGRAM:
        return new InstagramAdapter();
      case Platform.FACEBOOK:
        return new FacebookAdapter();
      case Platform.LINKEDIN:
        return new LinkedInAdapter();
      case Platform.YOUTUBE:
        return new YouTubeAdapter();
      case Platform.TIKTOK:
        return new TikTokAdapter();
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  static getSupportedPlatforms(): Platform[] {
    return Object.values(Platform);
  }
}

export {
  PlatformAdapter,
  TwitterAdapter,
  TelegramAdapter,
  InstagramAdapter,
  FacebookAdapter,
  LinkedInAdapter,
  YouTubeAdapter,
  TikTokAdapter,
};
