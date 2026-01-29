import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from '../config';
import routes from './routes';
import { errorHandler } from './middlewares/errorHandler';
import { logger } from '../utils/logger';
import metricsService from '../services/MetricsService';

export function createApp(): Application {
  const app = express();

  // Trust only the direct proxy (nginx) for IP-based rate limiting
  app.set('trust proxy', 1);

  // Security middleware
  app.use(helmet());

  // 🟡 HIGH: Restrictive CORS configuration
  const baseOrigins = [
    config.clientUrl,
    config.apiUrl,
    'https://pnptv.app',
    'https://clickera.app',
  ];

  const allowedOrigins = config.env === 'production'
    ? baseOrigins
    : [
        ...baseOrigins,
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3010',
      ];

  const allowedOriginSet = new Set(
    allowedOrigins.filter((origin): origin is string => Boolean(origin))
  );

  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman)
      if (!origin) return callback(null, true);

      if (allowedOriginSet.has(origin)) {
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

  // AI routes - moderate payload for AI requests
  app.use('/api/ai', express.json({ limit: '500kb' }));
  app.use('/api/ai', express.urlencoded({ extended: true, limit: '500kb' }));

  // Media/upload routes - larger payload for image/video uploads
  app.use('/api/media', express.json({ limit: '10mb' }));
  app.use('/api/media', express.urlencoded({ extended: true, limit: '10mb' }));

  // Chunked upload routes - very large payload for large file uploads
  app.use('/api/upload', express.json({ limit: '100mb' }));
  app.use('/api/upload', express.urlencoded({ extended: true, limit: '100mb' }));

  // Video routes - large payload for video uploads and metadata
  app.use('/api/video', express.json({ limit: '100mb' }));
  app.use('/api/video', express.urlencoded({ extended: true, limit: '100mb' }));

  // Default for other routes
  app.use(express.json({ limit: '500kb' }));
  app.use(express.urlencoded({ extended: true, limit: '500kb' }));

  // 🟢 MEDIUM: Metrics middleware for Prometheus
  app.use((req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
      const duration = (Date.now() - start) / 1000;
      const route = req.route?.path || req.path;
      const statusCode = res.statusCode.toString();

      metricsService.httpRequestDuration.observe(
        { method: req.method, route, status_code: statusCode },
        duration
      );

      metricsService.httpRequestTotal.inc({
        method: req.method,
        route,
        status_code: statusCode,
      });

      // Track errors (5xx responses)
      if (res.statusCode >= 500) {
        metricsService.httpRequestErrors.inc({
          method: req.method,
          route,
          error_type: 'server_error',
        });
      }
    });

    next();
  });

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Metrics endpoint for Prometheus
  app.get('/metrics', async (_req, res) => {
    try {
      res.set('Content-Type', metricsService.getContentType());
      const metrics = await metricsService.getMetrics();
      res.send(metrics);
    } catch (error) {
      logger.error('Error collecting metrics:', error);
      res.status(500).send('Error collecting metrics');
    }
  });

  // API routes
  app.use('/api', routes);

  // Error handling
  app.use(errorHandler);

  return app;
}

export default createApp;
