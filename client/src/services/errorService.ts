/**
 * Error Handling Service
 * Centralized error management for the application
 */

import { ApiError, ErrorContext, AppError, getErrorMessage, ApiResponse } from '../types/api.types';

/**
 * Error Service Configuration
 */
export interface ErrorServiceConfig {
  // Error reporting endpoint (for production)
  reportingEndpoint?: string;
  
  // Enable/disable error reporting
  enabled: boolean;
  
  // Environment
  environment: 'development' | 'production' | 'staging';
  
  // Error logging function
  logFunction?: (message: string, context: any) => void;
}

/**
 * Default Configuration
 */
const defaultConfig: ErrorServiceConfig = {
  enabled: true,
  environment: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  logFunction: console.error
};

/**
 * Error Service Class
 */
export class ErrorService {
  private static config: ErrorServiceConfig = defaultConfig;
  
  /**
   * Initialize the error service
   */
  static initialize(config: Partial<ErrorServiceConfig> = {}): void {
    this.config = { ...defaultConfig, ...config };
  }
  
  /**
   * Report an error
   */
  static report(error: unknown, context: ErrorContext = {}): void {
    if (!this.config.enabled) return;
    
    try {
      const errorContext = this.createFullContext(context);
      const errorMessage = this.formatError(error, errorContext);
      
      // Log to console
      this.logToConsole(error, errorContext);
      
      // Report to external service if in production
      if (this.config.environment === 'production' && this.config.reportingEndpoint) {
        this.reportToExternalService(error, errorContext);
      }
      
      // Additional logging
      if (this.config.logFunction) {
        this.config.logFunction(errorMessage, errorContext);
      }
      
    } catch (reportingError) {
      // Don't let error reporting cause more errors
      console.error('Error reporting failed:', reportingError);
    }
  }
  
  /**
   * Handle API errors specifically
   */
  static handleApiError(
    error: unknown,
    context: ErrorContext = {},
    fallbackMessage: string = 'An error occurred'
  ): string {
    const userMessage = getErrorMessage(error);
    
    // Report the full error
    this.report(error, { ...context, severity: 'high' });
    
    // Return user-friendly message
    return userMessage || fallbackMessage;
  }
  
  /**
   * Create full error context
   */
  private static createFullContext(context: ErrorContext): ErrorContext {
    return {
      timestamp: new Date().toISOString(),
      severity: context.severity || 'medium',
      ...context
    };
  }
  
  /**
   * Format error for logging
   */
  private static formatError(error: unknown, context: ErrorContext): string {
    const errorMessage = getErrorMessage(error);
    const componentInfo = context.component ? `[${context.component}] ` : '';
    const actionInfo = context.action ? `[${context.action}] ` : '';
    
    return `${componentInfo}${actionInfo}${errorMessage}`;
  }
  
  /**
   * Log error to console
   */
  private static logToConsole(error: unknown, context: ErrorContext): void {
    const errorMessage = this.formatError(error, context);
    
    // Log full error details in development
    if (this.config.environment !== 'production') {
      console.error(errorMessage, {
        error,
        context,
        stack: error instanceof Error ? error.stack : undefined
      });
    } else {
      // In production, log minimal info to avoid exposing sensitive data
      console.error(errorMessage);
    }
  }
  
  /**
   * Report error to external service
   */
  private static async reportToExternalService(error: unknown, context: ErrorContext): Promise<void> {
    if (!this.config.reportingEndpoint) return;
    
    try {
      const errorData = {
        message: getErrorMessage(error),
        context,
        timestamp: new Date().toISOString(),
        environment: this.config.environment,
        ...(error instanceof Error ? { stack: error.stack } : {}),
        ...(this.isApiError(error) ? { apiError: error } : {})
      };
      
      // In a real implementation, this would be a fetch call
      // await fetch(this.config.reportingEndpoint, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(errorData)
      // });
      
      // For now, just log that we would report
      console.log('Would report error to:', this.config.reportingEndpoint, errorData);
      
    } catch (reportingError) {
      console.error('Failed to report error to external service:', reportingError);
    }
  }
  
  /**
   * Check if error is an API error
   */
  private static isApiError(error: unknown): error is ApiResponse<any> {
    return (
      typeof error === 'object' &&
      error !== null &&
      ('error' in error || 'message' in error)
    );
  }
  
  /**
   * Create an AppError from unknown error
   */
  static createAppError(
    error: unknown,
    context: ErrorContext = {},
    code: string = 'GENERIC_ERROR'
  ): AppError {
    const message = getErrorMessage(error);
    const fullContext = this.createFullContext(context);
    
    if (error instanceof AppError) {
      return error; // Already an AppError
    }
    
    if (error instanceof Error) {
      return new AppError(message, code, fullContext, error);
    }
    
    return new AppError(message, code, fullContext);
  }
  
  /**
   * Error Boundary Component Helper
   */
  static createErrorBoundaryProps(error: unknown, context: ErrorContext): {
    error: AppError;
    errorMessage: string;
    shouldShowTechnicalDetails: boolean;
  } {
    const appError = this.createAppError(error, context);
    const errorMessage = getErrorMessage(error);
    
    return {
      error: appError,
      errorMessage,
      shouldShowTechnicalDetails: this.config.environment !== 'production'
    };
  }
}

/**
 * Initialize the error service with default configuration
 */
ErrorService.initialize();

/**
 * Export helper functions for convenience
 */
export const reportError = ErrorService.report.bind(ErrorService);
export const handleApiError = ErrorService.handleApiError.bind(ErrorService);
export const createAppError = ErrorService.createAppError.bind(ErrorService);

export default ErrorService;