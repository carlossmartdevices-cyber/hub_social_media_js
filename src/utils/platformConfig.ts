import { config } from '../config';
import { logger } from './logger';
import { Platform } from '../core/content/types';
import { logOAuth2Status } from './oauth2Config';

/**
 * Checks if credentials for a platform are configured (not empty)
 */
export function isPlatformConfigured(platform: Platform): boolean {
  const platformConfig = config.platforms[platform.toLowerCase() as keyof typeof config.platforms];

  if (!platformConfig) {
    return false;
  }

  // Check if any required credential is non-empty
  const credentials = Object.values(platformConfig);
  return credentials.some(value => value !== '');
}

/**
 * Gets a list of all configured platforms
 */
export function getConfiguredPlatforms(): Platform[] {
  const configured: Platform[] = [];

  const platformKeys: Platform[] = [
    Platform.TWITTER,
    Platform.TELEGRAM,
    Platform.INSTAGRAM,
    Platform.FACEBOOK,
    Platform.LINKEDIN,
    Platform.YOUTUBE,
    Platform.TIKTOK,
  ];

  for (const platform of platformKeys) {
    if (isPlatformConfigured(platform)) {
      configured.push(platform);
    }
  }

  return configured;
}

/**
 * Checks if credentials object has valid (non-empty) values
 */
export function hasValidCredentials(credentials: Record<string, string>): boolean {
  if (!credentials || Object.keys(credentials).length === 0) {
    return false;
  }

  // Check if at least one credential value is non-empty
  return Object.values(credentials).some(value => value && value.trim() !== '');
}

/**
 * Logs platform configuration status at startup
 */
export function logPlatformStatus(): void {
  const configured = getConfiguredPlatforms();
  const allPlatforms = [
    Platform.TWITTER,
    Platform.TELEGRAM,
    Platform.INSTAGRAM,
    Platform.FACEBOOK,
    Platform.LINKEDIN,
    Platform.YOUTUBE,
    Platform.TIKTOK,
  ];
  const notConfigured = allPlatforms.filter(p => !configured.includes(p));

  logger.info('========================================');
  logger.info('   Platform Configuration Status');
  logger.info('========================================');

  if (configured.length > 0) {
    logger.info(`✅ Configured platforms (${configured.length}/${allPlatforms.length}):`);
    configured.forEach(platform => {
      logger.info(`   ✓ ${platform.toUpperCase()}`);
    });
  } else {
    logger.info('ℹ️  No global platform credentials configured');
  }

  if (notConfigured.length > 0 && notConfigured.length < allPlatforms.length) {
    logger.info(`⚪ Not configured (${notConfigured.length}/${allPlatforms.length}):`);
    notConfigured.forEach(platform => {
      logger.info(`   ○ ${platform.toUpperCase()}`);
    });
  }

  logger.info('========================================');

  if (configured.length === 0) {
    logger.info('ℹ️  Bot running in user-credentials mode');
    logger.info('ℹ️  Users can add their own platform credentials via API');
    logger.info('ℹ️  No need to configure all platforms - use only what you need!');
  } else if (notConfigured.length > 0) {
    logger.info('ℹ️  Partial configuration is OK - only configured platforms will be used');
  } else {
    logger.info('✅ All platforms are configured and ready!');
  }

  logger.info('========================================');
}

// Re-export OAuth 2.0 status logging function
export { logOAuth2Status };
