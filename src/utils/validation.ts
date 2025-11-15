import { Platform, PostContent, RecurrenceType } from '../core/content/types';

export class ValidationService {
  static isValidPlatform(platform: string): boolean {
    return Object.values(Platform).includes(platform as Platform);
  }

  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static sanitizeText(text: string): string {
    return text
      .replace(/[<>]/g, '')
      .trim();
  }

  static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  static validatePostContent(content: PostContent): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!content.text || content.text.trim().length === 0) {
      errors.push('Post text is required');
    }

    if (content.link && !this.isValidUrl(content.link)) {
      errors.push('Invalid URL format');
    }

    if (content.hashtags) {
      for (const tag of content.hashtags) {
        if (!/^#?[a-zA-Z0-9_]+$/.test(tag)) {
          errors.push(`Invalid hashtag format: ${tag}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  static isValidRecurrenceType(type: string): boolean {
    return Object.values(RecurrenceType).includes(type as RecurrenceType);
  }
}

export default ValidationService;
