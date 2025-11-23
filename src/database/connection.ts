import { Pool } from 'pg';
import { config } from '../config';
import { logger } from '../utils/logger';

export class Database {
  private static instance: Database;
  private pool: Pool;

  private constructor() {
    // 🟡 HIGH: Increased connection timeout from 2s to 10s
    this.pool = new Pool({
      host: config.database.host,
      port: config.database.port,
      database: config.database.name,
      user: config.database.user,
      password: config.database.password,
      max: 20, // Maximum pool size
      idleTimeoutMillis: 30000, // 30 seconds
      connectionTimeoutMillis: 10000, // 10 seconds (was 2s)
      query_timeout: 30000, // 30 seconds for query execution
      statement_timeout: 30000, // 30 seconds for statement execution
    });

    this.pool.on('error', (err) => {
      logger.error('Unexpected database error:', err);
    });

    this.pool.on('connect', () => {
      logger.debug('New database connection established');
    });

    this.pool.on('remove', () => {
      logger.debug('Database connection removed from pool');
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
