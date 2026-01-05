import { Pool } from 'pg';
import { config } from '../config';
import { logger } from '../utils/logger';

export class Database {
  private static instance: Database;
  private pool: Pool;

  private constructor() {
    // Optimized pool configuration to prevent connection exhaustion
    this.pool = new Pool({
      host: config.database.host,
      port: config.database.port,
      database: config.database.name,
      user: config.database.user,
      password: config.database.password,
      max: 15, // Reduced from 20 to prevent pool exhaustion
      min: 2, // Maintain minimum connections
      idleTimeoutMillis: 30000, // 30 seconds
      connectionTimeoutMillis: 15000, // 15 seconds connection timeout
      query_timeout: 45000, // 45 seconds for query execution
      statement_timeout: 45000, // 45 seconds for statement execution
      allowExitOnIdle: false, // Keep pool alive even if idle
      maxUses: 7500, // Recycle connections after 7500 uses to prevent stale connections
    });

    this.pool.on('error', (err: any) => {
      logger.error('Unexpected database pool error:', err);
    });

    this.pool.on('connect', () => {
      logger.debug('New database connection established');
    });

    this.pool.on('remove', () => {
      logger.debug('Database connection removed from pool');
    });

    // Connection health check
    this.pool.on('error', (err: any, _client: any) => {
      if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        logger.error('Database connection was closed unexpectedly');
      } else if (err.code === 'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR') {
        logger.error('Database connection could not be re-established after fatal error');
      } else if (err.code === 'PROTOCOL_ENQUEUE_HANDSHAKE_ERROR') {
        logger.error('Database connection handshake failed');
      }
    });
  }

  static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  getPool(): Pool {
    return this.pool;
  }

  async query(text: string, params?: any[]) {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      logger.debug('Executed query', { text, duration, rows: result.rowCount });
      return result;
    } catch (error) {
      logger.error('Database query error:', { text, error });
      throw error;
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
    logger.info('Database connection pool closed');
  }
}

export default Database.getInstance();
