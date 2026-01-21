/**
 * Validation Service
 * Centralized input validation for the application
 */

import { AppError } from '../types/api.types';

/**
 * Validation Error Type
 */
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

/**
 * Validation Result Type
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Common Validation Rules
 */
export const ValidationRules = {
  // Minimum length validation
  minLength(min: number, message?: string): (value: string) => ValidationError | null {
    return (value: string) => {
      if (!value || value.length < min) {
        return {
          field: 'length',
          message: message || `Must be at least ${min} characters`,
          code: 'MIN_LENGTH'
        };
      }
      return null;
    };
  },

  // Maximum length validation
  maxLength(max: number, message?: string): (value: string) => ValidationError | null {
    return (value: string) => {
      if (value && value.length > max) {
        return {
          field: 'length',
          message: message || `Must be no more than ${max} characters`,
          code: 'MAX_LENGTH'
        };
      }
      return null;
    };
  },

  // Required field validation
  required(message?: string): (value: any) => ValidationError | null {
    return (value: any) => {
      if (value === undefined || value === null || value === '') {
        return {
          field: 'required',
          message: message || 'This field is required',
          code: 'REQUIRED'
        };
      }
      return null;
    };
  },

  // Email validation
  email(message?: string): (value: string) => ValidationError | null {
    return (value: string) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (value && !emailRegex.test(value)) {
        return {
          field: 'email',
          message: message || 'Please enter a valid email address',
          code: 'INVALID_EMAIL'
        };
      }
      return null;
    };
  },

  // URL validation
  url(message?: string): (value: string) => ValidationError | null {
    return (value: string) => {
      try {
        if (value && !new URL(value).protocol.startsWith('http')) {
          return {
            field: 'url',
            message: message || 'Please enter a valid URL (must start with http:// or https://)',
            code: 'INVALID_URL'
          };
        }
      } catch (e) {
        return {
          field: 'url',
          message: message || 'Please enter a valid URL',
          code: 'INVALID_URL'
        };
      }
      return null;
    };
  },

  // Platform-specific validation (e.g., Twitter handle)
  twitterHandle(message?: string): (value: string) => ValidationError | null {
    return (value: string) => {
      const twitterRegex = /^[A-Za-z0-9_]{1,15}$/;
      if (value && !twitterRegex.test(value)) {
        return {
          field: 'twitterHandle',
          message: message || 'Twitter handle must be 1-15 characters (letters, numbers, underscores)',
          code: 'INVALID_TWITTER_HANDLE'
        };
      }
      return null;
    };
  },

  // Instagram username validation
  instagramUsername(message?: string): (value: string) => ValidationError | null {
    return (value: string) => {
      const instagramRegex = /^[A-Za-z0-9._]{1,30}$/;
      if (value && !instagramRegex.test(value)) {
        return {
          field: 'instagramUsername',
          message: message || 'Instagram username must be 1-30 characters (letters, numbers, periods, underscores)',
          code: 'INVALID_INSTAGRAM_USERNAME'
        };
      }
      return null;
    };
  },

  // File size validation
  maxFileSize(maxSizeMB: number, message?: string): (file: File) => ValidationError | null {
    return (file: File) => {
      const maxSizeBytes = maxSizeMB * 1024 * 1024;
      if (file && file.size > maxSizeBytes) {
        return {
          field: 'fileSize',
          message: message || `File size must be less than ${maxSizeMB}MB`,
          code: 'FILE_TOO_LARGE'
        };
      }
      return null;
    };
  },

  // File type validation
  allowedFileTypes(types: string[], message?: string): (file: File) => ValidationError | null {
    return (file: File) => {
      if (file && !types.includes(file.type)) {
        return {
          field: 'fileType',
          message: message || `File type must be one of: ${types.join(', ')}`,
          code: 'INVALID_FILE_TYPE'
        };
      }
      return null;
    };
  }
};

/**
 * Validation Service Class
 */
export class ValidationService {
  /**
   * Validate a single value against multiple rules
   */
  static validateValue(
    value: any,
    rules: ((value: any) => ValidationError | null)[]
  ): ValidationError | null {
    for (const rule of rules) {
      const error = rule(value);
      if (error) {
        return error;
      }
    }
    return null;
  }

  /**
   * Validate an object against validation rules
   */
  static validateObject(
    obj: Record<string, any>,
    validationRules: Record<string, ((value: any) => ValidationError | null)[]>
  ): ValidationResult {
    const errors: ValidationError[] = [];

    for (const [field, rules] of Object.entries(validationRules)) {
      const value = obj[field];
      const fieldErrors = rules
        .map(rule => rule(value))
        .filter((error): error is ValidationError => error !== null);

      errors.push(...fieldErrors);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Create a validation error
   */
  static createValidationError(
    field: string,
    message: string,
    code: string
  ): ValidationError {
    return { field, message, code };
  }

  /**
   * Throw a validation error as an AppError
   */
  static throwValidationError(
    errors: ValidationError[],
    context: { component?: string; action?: string } = {}
  ): never {
    const errorMessages = errors.map(err => `${err.field}: ${err.message}`).join('; ');
    throw new AppError(
      `Validation failed: ${errorMessages}`,
      'VALIDATION_ERROR',
      {
        ...context,
        severity: 'medium',
        timestamp: new Date().toISOString()
      }
    );
  }

  /**
   * Validate platform account credentials
   */
  static validatePlatformAccount(platform: string, credentials: Record<string, any>): ValidationResult {
    const errors: ValidationError[] = [];

    // Common validations for all platforms
    if (!credentials.accessToken) {
      errors.push(ValidationService.createValidationError(
        'accessToken',
        'Access token is required',
        'REQUIRED'
      ));
    }

    // Platform-specific validations
    switch (platform) {
      case 'twitter':
        if (credentials.username) {
          const twitterError = ValidationRules.twitterHandle()(credentials.username);
          if (twitterError) errors.push(twitterError);
        }
        break;

      case 'instagram':
        if (credentials.username) {
          const instagramError = ValidationRules.instagramUsername()(credentials.username);
          if (instagramError) errors.push(instagramError);
        }
        break;

      case 'telegram':
        if (credentials.botToken && !credentials.botToken.startsWith('bot')) {
          errors.push(ValidationService.createValidationError(
            'botToken',
            'Telegram bot token must start with "bot"',
            'INVALID_TELEGRAM_TOKEN'
          ));
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate post content for a specific platform
   */
  static validatePostContent(platform: string, content: string): ValidationResult {
    const errors: ValidationError[] = [];

    // Common validation
    if (!content || content.trim() === '') {
      errors.push(ValidationService.createValidationError(
        'content',
        'Post content cannot be empty',
        'REQUIRED'
      ));
      return { isValid: false, errors };
    }

    // Platform-specific validations
    switch (platform) {
      case 'twitter':
        if (content.length > 280) {
          errors.push(ValidationService.createValidationError(
            'content',
            'Twitter posts cannot exceed 280 characters',
            'MAX_LENGTH'
          ));
        }
        break;

      case 'instagram':
        if (content.length > 2200) {
          errors.push(ValidationService.createValidationError(
            'content',
            'Instagram captions cannot exceed 2200 characters',
            'MAX_LENGTH'
          ));
        }
        break;

      case 'linkedin':
        if (content.length > 3000) {
          errors.push(ValidationService.createValidationError(
            'content',
            'LinkedIn posts cannot exceed 3000 characters',
            'MAX_LENGTH'
          ));
        }
        break;

      case 'facebook':
        if (content.length > 5000) {
          errors.push(ValidationService.createValidationError(
            'content',
            'Facebook posts cannot exceed 5000 characters',
            'MAX_LENGTH'
          ));
        }
        break;

      case 'telegram':
        if (content.length > 4096) {
          errors.push(ValidationService.createValidationError(
            'content',
            'Telegram messages cannot exceed 4096 characters',
            'MAX_LENGTH'
          ));
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate file upload
   */
  static validateFileUpload(
    file: File,
    maxSizeMB: number = 50,
    allowedTypes: string[] = ['image/jpeg', 'image/png', 'video/mp4']
  ): ValidationResult {
    const errors: ValidationError[] = [];

    // File size validation
    const sizeError = ValidationRules.maxFileSize(maxSizeMB)(file);
    if (sizeError) errors.push(sizeError);

    // File type validation
    const typeError = ValidationRules.allowedFileTypes(allowedTypes)(file);
    if (typeError) errors.push(typeError);

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Export validation rules for direct use
export const validate = ValidationRules;
export const validationService = ValidationService;

export default ValidationService;