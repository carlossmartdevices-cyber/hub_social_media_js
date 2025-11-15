import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import config from '../config';
import routes from './routes';
import { errorHandler } from './middlewares/errorHandler';
import { logger } from '../utils/logger';

export function createApp(): Application {
  const app = express();

  // Security middleware
  app.use(helmet());

  // 🟡 HIGH: Restrictive CORS configuration
  const allowedOrigins = config.env === 'production'
    ? [config.apiUrl]
    : ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3001'];

  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logger.warn(`CORS blocked request from origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    maxAge: 86400, // 24 hours
  }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxRequests,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api', limiter);

  // 🟡 HIGH: Reduced payload size by route
  // Auth routes - minimal payload
  app.use('/api/auth', express.json({ limit: '100kb' }));
  app.use('/api/auth', express.urlencoded({ extended: true, limit: '100kb' }));

  // Post routes - moderate payload for content + metadata
  app.use('/api/posts', express.json({ limit: '1mb' }));
  app.use('/api/posts', express.urlencoded({ extended: true, limit: '1mb' }));

  // Media/upload routes - larger payload
  app.use('/api/media', express.json({ limit: '10mb' }));
  app.use('/api/media', express.urlencoded({ extended: true, limit: '10mb' }));

  // Default for other routes
  app.use(express.json({ limit: '500kb' }));
  app.use(express.urlencoded({ extended: true, limit: '500kb' }));

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API routes
  app.use('/api', routes);

  // Error handling
  app.use(errorHandler);

  return app;
}

export default createApp;
