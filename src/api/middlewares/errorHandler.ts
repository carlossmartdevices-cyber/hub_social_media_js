import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger';
import multer from 'multer';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  logger.error('Error occurred:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Handle multer file size errors
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({
        error: 'File too large',
        message: `File size exceeds the maximum limit. Maximum size is 5GB. For files larger than 500MB, use the chunked upload endpoint.`,
      });
      return;
    }
    if (err.code === 'LIMIT_PART_COUNT') {
      res.status(400).json({
        error: 'Too many parts',
        message: 'The request has too many parts',
      });
      return;
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      res.status(400).json({
        error: 'Too many files',
        message: 'Too many files were uploaded',
      });
      return;
    }
  }

  // Handle payload too large from express
  if (err instanceof SyntaxError && 'status' in err && err.status === 413) {
    res.status(413).json({
      error: 'Payload too large',
      message: 'The request payload is too large. For large files, use the chunked upload endpoint.',
    });
    return;
  }

  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
};
