import { Platform, PostContent, RecurrenceType } from '../core/content/types';

export class ValidationService {
  static isValidPlatform(platform: string): boolean {
    return Object.values(Platform).includes(platform as Platform);
  }

  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * 🔴 CRITICAL FIX: Improved XSS protection
   * Sanitizes text by escaping HTML characters and removing dangerous patterns
   */
  static sanitizeText(text: string): string {
    if (!text) return '';

    return text
      // Escape HTML special characters
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
      // Remove null bytes
      .replace(/\0/g, '')
      // Trim whitespace
      .trim();
  }

  /**
   * Remove all HTML tags (for plain text only content)
   */
  static stripHtmlTags(text: string): string {
    if (!text) return '';
    return text.replace(/<[^>]*>/g, '').trim();
  }

  /**
   * Validate and sanitize URL
   */
  static isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      // Only allow http and https protocols
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }

  /**
   * Sanitize URL to prevent javascript: and data: URIs
   */
  static sanitizeUrl(url: string): string {
    if (!url) return '';

    const trimmed = url.trim();

    // Block dangerous protocols
    const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
    for (const protocol of dangerousProtocols) {
      if (trimmed.toLowerCase().startsWith(protocol)) {
        return '';
      }
    }

    return trimmed;
  }

  static validatePostContent(content: PostContent): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!content.text || content.text.trim().length === 0) {
      errors.push('Post text is required');
    }

    // Validate text length (max 10000 chars)
    if (content.text && content.text.length > 10000) {
      errors.push('Post text exceeds maximum length of 10000 characters');
    }

    if (content.link) {
      const sanitizedUrl = this.sanitizeUrl(content.link);
      if (!sanitizedUrl || !this.isValidUrl(sanitizedUrl)) {
        errors.push('Invalid URL format or dangerous protocol detected');
      }
    }

    if (content.hashtags) {
      for (const tag of content.hashtags) {
        if (!/^#?[a-zA-Z0-9_]+$/.test(tag)) {
          errors.push(`Invalid hashtag format: ${tag}`);
        }
        if (tag.length > 50) {
          errors.push(`Hashtag too long: ${tag}`);
        }
      }
      if (content.hashtags.length > 30) {
        errors.push('Too many hashtags (maximum 30)');
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
