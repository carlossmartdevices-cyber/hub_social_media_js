import { config } from '../config';
import { Platform } from '../core/content/types';
import { logger } from './logger';

/**
 * OAuth 2.0 Platform Configuration Interface
 */
export interface OAuth2PlatformConfig {
  id: string;
  name: string;
  oauth2Available: boolean;
  oauth2Scopes?: string[];
  authorizationEndpoint?: string;
}

/**
 * OAuth 2.0 Credentials Interface
 */
export interface OAuth2Credentials {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

/**
 * Platform credentials configuration type
 */
interface PlatformCredentials {
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  [key: string]: any;
}

/**
 * Check if a platform has valid OAuth 2.0 credentials configured
 * Validates that clientId, clientSecret, and redirectUri are non-empty strings
 */
export function isOAuth2Configured(platform: Platform): boolean {
  const platformKey = platform.toLowerCase();
  const platformConfig = (config.platforms as Record<string, PlatformCredentials>)[platformKey];

  if (!platformConfig) {
    return false;
  }

  // Check for OAuth 2.0 specific fields
  const { clientId, clientSecret, redirectUri } = platformConfig;

  return !!(
    clientId &&
    typeof clientId === 'string' &&
    clientId.trim() !== '' &&
    clientSecret &&
    typeof clientSecret === 'string' &&
    clientSecret.trim() !== '' &&
    redirectUri &&
    typeof redirectUri === 'string' &&
    redirectUri.trim() !== ''
  );
}

/**
 * Get OAuth 2.0 credentials for a platform (if configured)
 */
export function getOAuth2Credentials(platform: Platform): OAuth2Credentials | null {
  if (!isOAuth2Configured(platform)) {
    return null;
  }

  const platformKey = platform.toLowerCase();
  const platformConfig = (config.platforms as Record<string, PlatformCredentials>)[platformKey];

  if (!platformConfig) {
    throw new Error(`Platform config not found for ${platform}`);
  }

  return {
    clientId: platformConfig.clientId || '',
    clientSecret: platformConfig.clientSecret || '',
    redirectUri: platformConfig.redirectUri || '',
  };
}

/**
 * OAuth 2.0 configuration metadata for all platforms
 * Includes scopes, authorization endpoints, and display names
 */
const OAUTH2_PLATFORM_METADATA: Record<string, Omit<OAuth2PlatformConfig, 'oauth2Available'>> = {
  [Platform.TWITTER]: {
    id: Platform.TWITTER,
    name: 'X (Twitter)',
    oauth2Scopes: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
    authorizationEndpoint: 'https://twitter.com/i/oauth2/authorize',
  },
  [Platform.FACEBOOK]: {
    id: Platform.FACEBOOK,
    name: 'Facebook',
    oauth2Scopes: ['pages_manage_posts', 'pages_read_engagement'],
    authorizationEndpoint: 'https://www.facebook.com/v18.0/dialog/oauth',
  },
  [Platform.INSTAGRAM]: {
    id: Platform.INSTAGRAM,
    name: 'Instagram',
    oauth2Scopes: ['instagram_basic', 'instagram_content_publish'],
    authorizationEndpoint: 'https://api.instagram.com/oauth/authorize',
  },
  [Platform.LINKEDIN]: {
    id: Platform.LINKEDIN,
    name: 'LinkedIn',
    oauth2Scopes: ['w_member_social', 'r_liteprofile'],
    authorizationEndpoint: 'https://www.linkedin.com/oauth/v2/authorization',
  },
  [Platform.YOUTUBE]: {
    id: Platform.YOUTUBE,
    name: 'YouTube',
    oauth2Scopes: ['https://www.googleapis.com/auth/youtube.upload'],
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  },
  [Platform.TIKTOK]: {
    id: Platform.TIKTOK,
    name: 'TikTok',
    oauth2Scopes: ['video.upload', 'user.info.basic'],
    authorizationEndpoint: 'https://www.tiktok.com/auth/authorize/',
  },
};

/**
 * Get all OAuth 2.0 platform configurations (with availability status)
 * Excludes Telegram (uses bot tokens, not OAuth 2.0)
 */
export function getAllOAuth2Platforms(): OAuth2PlatformConfig[] {
  return Object.values(Platform)
    .filter((platform) => platform !== Platform.TELEGRAM) // Telegram uses bot tokens, not OAuth 2.0
    .map((platform) => {
      const metadata = OAUTH2_PLATFORM_METADATA[platform];

      if (!metadata) {
        // Fallback for platforms without metadata
        return {
          id: platform,
          name: platform.charAt(0).toUpperCase() + platform.slice(1),
          oauth2Available: false,
        };
      }

      return {
        ...metadata,
        oauth2Available: isOAuth2Configured(platform),
      };
    });
}

/**
 * Get OAuth 2.0 configuration for a specific platform
 */
export function getOAuth2PlatformConfig(platform: Platform): OAuth2PlatformConfig | null {
  const metadata = OAUTH2_PLATFORM_METADATA[platform];

  if (!metadata) {
    return null;
  }

  return {
    ...metadata,
    oauth2Available: isOAuth2Configured(platform),
  };
}

/**
 * Get list of all OAuth 2.0 platforms that are configured
 */
export function getConfiguredOAuth2Platforms(): OAuth2PlatformConfig[] {
  return getAllOAuth2Platforms().filter((p) => p.oauth2Available);
}

/**
 * Log OAuth 2.0 platform configuration status at startup
 * Useful for debugging and monitoring
 */
export function logOAuth2Status(): void {
  try {
    const allPlatforms = getAllOAuth2Platforms();
    const configured = allPlatforms.filter((p) => p.oauth2Available);
    const notConfigured = allPlatforms.filter((p) => !p.oauth2Available);

    logger.info('========================================');
    logger.info('   OAuth 2.0 Configuration Status');
    logger.info('========================================');

    if (configured.length > 0) {
      logger.info(
        `✅ OAuth 2.0 Configured (${configured.length}/${allPlatforms.length}):`
      );
      configured.forEach((platform) => {
        logger.info(`   ✓ ${platform.name.toUpperCase()}`);
      });
    } else {
      logger.info('ℹ️  No OAuth 2.0 platforms configured');
    }

    if (notConfigured.length > 0 && notConfigured.length < allPlatforms.length) {
      logger.info(
        `⚪ OAuth 2.0 Not Configured (${notConfigured.length}/${allPlatforms.length}):`
      );
      notConfigured.forEach((platform) => {
        logger.info(`   ○ ${platform.name}`);
      });
    }

    logger.info('========================================');

    if (configured.length === 0) {
      logger.info('ℹ️  Users can still add accounts via manual credentials');
    } else if (configured.length < allPlatforms.length) {
      logger.info(
        'ℹ️  Partial OAuth 2.0 configuration - only configured platforms available'
      );
    } else {
      logger.info('✅ All platforms support OAuth 2.0!');
    }

    logger.info('========================================');
  } catch (error) {
    logger.error('Error logging OAuth 2.0 status:', error);
  }
}
