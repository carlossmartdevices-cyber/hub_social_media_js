// API Response Types
// This file contains TypeScript type definitions to replace 'any' types

/**
 * Base API Response Type
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
  code?: string;
}

/**
 * API Error Type
 */
export interface ApiError {
  message: string;
  code: string;
  details?: any;
  timestamp?: string;
  path?: string;
}

/**
 * Platform Account Types
 */
export interface PlatformAccount {
  id: string;
  userId: string;
  platform: string;
  account_name: string;
  account_identifier: string;
  access_token: string;
  refresh_token?: string;
  token_expires?: string;
  is_active: boolean;
  last_validated?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Social Media Platform Types
 */
export type SocialPlatform = 
  | 'twitter'
  | 'facebook'
  | 'instagram'
  | 'linkedin'
  | 'youtube'
  | 'tiktok'
  | 'telegram';

/**
 * Post Types
 */
export interface Post {
  id: string;
  userId: string;
  content: string;
  media_urls?: string[];
  platforms: SocialPlatform[];
  scheduled_for?: string;
  status: 'draft' | 'scheduled' | 'published' | 'failed';
  created_at: string;
  updated_at: string;
  published_at?: string;
}

/**
 * Analytics Types
 */
export interface AnalyticsData {
  platform: SocialPlatform;
  metrics: {
    impressions: number;
    engagements: number;
    clicks: number;
    shares: number;
    likes: number;
    comments: number;
  };
  date_range: {
    start: string;
    end: string;
  };
}

/**
 * Settings Types
 */
export interface UserSettings {
  id: string;
  userId: string;
  theme: 'light' | 'dark' | 'system';
  language: 'en' | 'es' | 'fr' | 'de';
  notifications_enabled: boolean;
  auto_publish_enabled: boolean;
  default_platforms: SocialPlatform[];
}

/**
 * Upload Types
 */
export interface UploadStatus {
  uploadId: string;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  progress: number; // 0-100
  fileName: string;
  fileSize: number;
  fileType: string;
  url?: string;
  error?: string;
}

/**
 * Chunked Upload Types
 */
export interface ChunkedUploadResponse {
  uploadId: string;
  chunkSize: number;
  totalChunks: number;
  uploadedChunks: number[];
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  url?: string;
  error?: string;
}

/**
 * Error Handling Types
 */
export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  timestamp?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Enhanced Error Type
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code: string = 'GENERIC_ERROR',
    public context: ErrorContext = { timestamp: new Date().toISOString(), severity: 'medium' },
    public originalError?: Error
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Utility Types
 */
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
};

/**
 * OAuth Types
 */
export interface OAuthConfig {
  clientId: string;
  redirectUri: string;
  scope: string;
  authUrl: string;
  tokenUrl: string;
  platforms: SocialPlatform[];
}

/**
 * Telegram Types
 */
export interface TelegramChannel {
  id: string;
  userId: string;
  channel_id: string;
  channel_name: string;
  channel_type: 'public' | 'private' | 'group';
  access_token: string;
  is_active: boolean;
}

/**
 * Video Types
 */
export interface VideoMetadata {
  id: string;
  userId: string;
  title: string;
  description: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  duration: number; // in seconds
  thumbnailUrl?: string;
  status: 'uploading' | 'processing' | 'ready' | 'failed';
  platforms: SocialPlatform[];
  created_at: string;
  updated_at: string;
}

/**
 * Automation Types
 */
export interface AutomationRule {
  id: string;
  userId: string;
  name: string;
  trigger: string;
  action: string;
  conditions: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Helper Functions
 */
export function isApiError(response: any): response is ApiResponse<any> {
  return response && typeof response === 'object' && 
         ('success' in response || 'error' in response);
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (isApiError(error) && error.error) {
    return error.error.message;
  }
  return 'An unknown error occurred';
}

export function createErrorContext(component: string, action: string): ErrorContext {
  return {
    component,
    action,
    timestamp: new Date().toISOString(),
    severity: 'medium'
  };
}