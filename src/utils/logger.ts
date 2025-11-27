import winston from 'winston';
import { config } from '../config';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(metadata).length > 0) {
      try {
        // Handle circular references with a replacer function
        const seen = new WeakSet();
        const jsonString = JSON.stringify(metadata, (key, value) => {
          // Skip axios internal objects that cause circular references
          if (key === 'request' || key === 'config' || key === 'response') {
            return '[Circular]';
          }
          if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) {
              return '[Circular]';
            }
            seen.add(value);
          }
          return value;
        });
        msg += ` ${jsonString}`;
      } catch (error) {
        msg += ' [Unable to stringify metadata]';
      }
    }
    return msg;
  })
);

export const logger = winston.createLogger({
  level: config.monitoring.logLevel,
  format: logFormat,
  transports: [
    new winston.transports.Console({
      format: consoleFormat,
    }),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
    }),
  ],
});

if (config.env === 'development') {
  logger.add(
    new winston.transports.Console({
      format: consoleFormat,
    })
  );
}

export default logger;
