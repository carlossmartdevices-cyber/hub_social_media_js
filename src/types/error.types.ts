// Error types for the application
export interface ApiError extends Error {
  message: string;
  status?: number;
  details?: Record<string, unknown>;
  stack?: string;
}

export interface ServiceError extends Error {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
  stack?: string;
}

export type UnknownError = Error | string | unknown;