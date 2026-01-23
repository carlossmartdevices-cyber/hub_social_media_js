import dotenv from 'dotenv';
import winston from 'winston';
// Load .env file but don't override existing environment variables
// This allows PM2 environment variables to take precedence
dotenv.config({ override: false });

// Create a simple logger for config validation (before full logger is initialized)
const configLogger = winston.createLogger({
  level: 'error',
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.simple()
  ),
  transports: [new winston.transports.Console()]
});

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '8080', 10),
  apiUrl: process.env.API_URL || 'http://localhost:8080',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3001',

  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '55432', 10),
    name: process.env.DB_NAME || 'content_hub',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || '',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'change-this-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'change-this-refresh-secret',
    accessTokenExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshTokenExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d', // Mantener para compatibilidad
  },

  platforms: {
    twitter: {
      // OAuth 1.0a (legacy)
      apiKey: process.env.TWITTER_API_KEY || '',
      apiSecret: process.env.TWITTER_API_SECRET || '',
      accessToken: process.env.TWITTER_ACCESS_TOKEN || '',
      accessSecret: process.env.TWITTER_ACCESS_SECRET || '',
      bearerToken: process.env.TWITTER_BEARER_TOKEN || '',
      // OAuth 2.0 (new)
      clientId: process.env.TWITTER_CLIENT_ID || '',
      clientSecret: process.env.TWITTER_CLIENT_SECRET || '',
      redirectUri: process.env.TWITTER_REDIRECT_URI || 'http://localhost:33010/api/oauth/twitter/callback',
      // OAuth 2.0 (auth login)
      authRedirectUri: process.env.TWITTER_AUTH_REDIRECT_URI || '',
    },
    telegram: {
      botToken: process.env.TELEGRAM_BOT_TOKEN || '',
      chatId: process.env.TELEGRAM_CHAT_ID || '',
      webhookUrl: process.env.TELEGRAM_WEBHOOK_URL || '',
      webhookPath: process.env.TELEGRAM_WEBHOOK_PATH || '/webhook/telegram',
      webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET || '',
      useWebhook: process.env.TELEGRAM_USE_WEBHOOK === 'true',
    },
    instagram: {
      username: process.env.INSTAGRAM_USERNAME || '',
      password: process.env.INSTAGRAM_PASSWORD || '',
      appId: process.env.INSTAGRAM_APP_ID || '',
      appSecret: process.env.INSTAGRAM_APP_SECRET || '',
    },
    facebook: {
      appId: process.env.FACEBOOK_APP_ID || '',
      appSecret: process.env.FACEBOOK_APP_SECRET || '',
      accessToken: process.env.FACEBOOK_ACCESS_TOKEN || '',
      pageId: process.env.FACEBOOK_PAGE_ID || '',
    },
    linkedin: {
      clientId: process.env.LINKEDIN_CLIENT_ID || '',
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
      accessToken: process.env.LINKEDIN_ACCESS_TOKEN || '',
    },
    youtube: {
      clientId: process.env.YOUTUBE_CLIENT_ID || '',
      clientSecret: process.env.YOUTUBE_CLIENT_SECRET || '',
      apiKey: process.env.YOUTUBE_API_KEY || '',
      refreshToken: process.env.YOUTUBE_REFRESH_TOKEN || '',
    },
    tiktok: {
      clientKey: process.env.TIKTOK_CLIENT_KEY || '',
      clientSecret: process.env.TIKTOK_CLIENT_SECRET || '',
      accessToken: process.env.TIKTOK_ACCESS_TOKEN || '',
    },
  },

  media: {
    maxImageSize: parseInt(process.env.MAX_IMAGE_SIZE || '104857600', 10), // 100MB for images
    maxVideoSize: parseInt(process.env.MAX_VIDEO_SIZE || '5368709120', 10), // 5GB for videos
    storagePath: process.env.MEDIA_STORAGE_PATH || './uploads',
  },

  storage: {
    s3: {
      enabled: process.env.AWS_S3_ENABLED === 'true',
      region: process.env.AWS_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      bucket: process.env.AWS_S3_BUCKET || '',
    },
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },

  monitoring: {
    sentryDsn: process.env.SENTRY_DSN || '',
    logLevel: process.env.LOG_LEVEL || 'info',
  },

  encryption: {
    key: process.env.ENCRYPTION_KEY || 'change-this-encryption-key',
  },

  ai: {
    grok: {
      apiKey: process.env.XAI_API_KEY || '',
      baseURL: process.env.XAI_BASE_URL || 'https://api.x.ai/v1',
      model: process.env.XAI_MODEL || 'grok-beta',
      temperature: parseFloat(process.env.XAI_TEMPERATURE || '0.7'),
      maxTokens: parseInt(process.env.XAI_MAX_TOKENS || '4000', 10),
      enabled: process.env.XAI_ENABLED
        ? process.env.XAI_ENABLED === 'true'
        : !!process.env.XAI_API_KEY,
    },
  },

  aws: {
    region: process.env.AWS_REGION || 'us-east-2',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    s3: {
      bucket: process.env.AWS_S3_BUCKET || 'pnptv-previews',
      kmsKeyArn: process.env.AWS_KMS_KEY_ARN || '',
    },
    cloudfront: {
      domain: process.env.CLOUDFRONT_DOMAIN || '',
    },
  },

  video: {
    uploadDir: process.env.VIDEO_UPLOAD_DIR || './uploads/videos',
    thumbnailDir: process.env.THUMBNAIL_DIR || './uploads/thumbnails',
    maxSizeMB: parseInt(process.env.MAX_VIDEO_SIZE_MB || '500', 10),
    allowedFormats: (process.env.ALLOWED_VIDEO_FORMATS || 'mp4,mov,avi').split(','),
  },

  upload: {
    chunkSizeMb: parseInt(process.env.CHUNK_SIZE_MB || '5', 10),
    maxUploadSizeMb: parseInt(process.env.MAX_UPLOAD_SIZE_MB || '5120', 10),
    maxConcurrentChunks: parseInt(process.env.MAX_CONCURRENT_CHUNKS || '4', 10),
    sessionTtlHours: parseInt(process.env.UPLOAD_SESSION_TTL_HOURS || '24', 10),
    tempChunkDir: process.env.TEMP_CHUNK_DIR || './uploads/temp/chunks',
    maxConcurrentUploads: parseInt(process.env.MAX_CONCURRENT_UPLOADS || '2', 10),
    maxQueuedUploads: parseInt(process.env.MAX_QUEUED_UPLOADS || '10', 10),
  },

  processing: {
    videoConcurrency: parseInt(process.env.VIDEO_PROCESSING_CONCURRENCY || '2', 10),
    videoTimeoutMinutes: parseInt(process.env.VIDEO_PROCESSING_TIMEOUT_MINUTES || '30', 10),
  },

  bandwidth: {
    maxUploadSpeedMbps: parseInt(process.env.MAX_UPLOAD_SPEED_MBPS || '0', 10),
    minUploadSpeedMbps: parseInt(process.env.MIN_UPLOAD_SPEED_MBPS || '1', 10),
  },
};

// Expose frequently used config values at root level
export const CHUNK_SIZE_MB = config.upload.chunkSizeMb;
export const MAX_UPLOAD_SIZE_MB = config.upload.maxUploadSizeMb;
export const MAX_CONCURRENT_CHUNKS = config.upload.maxConcurrentChunks;
export const UPLOAD_SESSION_TTL_HOURS = config.upload.sessionTtlHours;
export const TEMP_CHUNK_DIR = config.upload.tempChunkDir;
export const VIDEO_PROCESSING_CONCURRENCY = config.processing.videoConcurrency;
export const AWS_S3_ENABLED = config.storage.s3.enabled;
export const AWS_REGION = config.storage.s3.region;
export const AWS_ACCESS_KEY_ID = config.storage.s3.accessKeyId;
export const AWS_SECRET_ACCESS_KEY = config.storage.s3.secretAccessKey;
export const AWS_S3_BUCKET = config.storage.s3.bucket;

// 🔴 CRITICAL: Validate secrets in production
if (config.env === 'production') {
  const errors: string[] = [];

  // Validate JWT secrets
  if (!process.env.JWT_SECRET || config.jwt.secret === 'change-this-secret') {
    errors.push('JWT_SECRET must be set to a strong secret in production');
  }
  if (!process.env.JWT_REFRESH_SECRET || config.jwt.refreshSecret === 'change-this-refresh-secret') {
    errors.push('JWT_REFRESH_SECRET must be set to a strong secret in production');
  }

  // Validate encryption key
  if (!process.env.ENCRYPTION_KEY || config.encryption.key === 'change-this-encryption-key') {
    errors.push('ENCRYPTION_KEY must be set in production');
  }
  if (config.encryption.key.length < 32) {
    errors.push('ENCRYPTION_KEY must be at least 32 characters long');
  }

  // Validate database password
  if (config.database.password === 'postgres') {
    errors.push('DB_PASSWORD should not use default value in production');
  }

  if (errors.length > 0) {
    configLogger.error('\n❌ PRODUCTION CONFIGURATION ERRORS:');
    errors.forEach(error => configLogger.error(`  - ${error}`));
    configLogger.error('\nPlease set the required environment variables before starting in production.\n');
    process.exit(1);
  }
}
