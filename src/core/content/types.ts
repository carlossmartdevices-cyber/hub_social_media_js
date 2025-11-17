export enum Platform {
  TWITTER = 'twitter',
  TELEGRAM = 'telegram',
  INSTAGRAM = 'instagram',
  TIKTOK = 'tiktok',
  FACEBOOK = 'facebook',
  LINKEDIN = 'linkedin',
  YOUTUBE = 'youtube',
}

export enum PostStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  PUBLISHING = 'publishing',
  PUBLISHED = 'published',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum MediaType {
  IMAGE = 'image',
  VIDEO = 'video',
  GIF = 'gif',
  DOCUMENT = 'document',
}

export enum RecurrenceType {
  NONE = 'none',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  CUSTOM = 'custom',
}

export interface MediaFile {
  id: string;
  type: MediaType;
  url: string;
  buffer?: Buffer;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  duration?: number;
}

export interface PostContent {
  text: string;
  media?: MediaFile[];
  hashtags?: string[];
  mentions?: string[];
  link?: string;
}

export interface Post {
  id: string;
  userId: string;
  platforms: Platform[];
  content: PostContent;
  scheduledAt?: Date;
  publishedAt?: Date;
  status: PostStatus;
  recurrence?: RecurrenceConfig;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface RecurrenceConfig {
  type: RecurrenceType;
  interval?: number;
  daysOfWeek?: number[];
  timeOfDay?: string;
  endDate?: Date;
}

export interface PlatformMetrics {
  platform: Platform;
  postId: string;
  likes: number;
  shares: number;
  comments: number;
  views: number;
  engagement: number;
  timestamp: Date;
}

export interface JobMetrics {
  jobId: string;
  platform: Platform;
  status: 'success' | 'failure';
  duration: number;
  error?: string;
  timestamp: Date;
}

export enum Language {
  ENGLISH = 'en',
  SPANISH = 'es',
}

export interface AIGeneratedPost {
  text: string;
  hashtags: string[];
  links: string[];
}

export interface EnglishLesson {
  title: string;
  explanation: string;
  examples: string[];
  slangTerms: {
    term: string;
    meaning: string;
    usage: string;
  }[];
}

export interface AIGeneratedContent {
  english: AIGeneratedPost[];
  spanish: AIGeneratedPost[];
  englishLesson?: EnglishLesson;
  metadata: {
    generatedAt: Date;
    model: string;
    totalOptions: number;
  };
}

export interface AIContentRequest {
  language?: Language;
  platform?: Platform;
  optionsCount?: number;
  customInstructions?: string;
}
