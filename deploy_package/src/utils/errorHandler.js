class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message) {
    super(message, 400);
    this.name = 'ValidationError';
  }
}

class DatabaseError extends AppError {
  constructor(message) {
    super(message, 500);
    this.name = 'DatabaseError';
  }
}

class PlatformAPIError extends AppError {
  constructor(platform, message) {
    super(`${platform} API Error: ${message}`, 502);
    this.name = 'PlatformAPIError';
    this.platform = platform;
  }
}

function handleError(error, logger) {
  if (error.isOperational) {
    logger.error(error.message, error);
  } else {
    logger.error('Unexpected error occurred', error);
    // In production, you might want to restart the process
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
}

module.exports = {
  AppError,
  ValidationError,
  DatabaseError,
  PlatformAPIError,
  handleError
};