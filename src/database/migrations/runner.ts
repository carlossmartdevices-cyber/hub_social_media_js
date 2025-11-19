import { readFileSync } from 'fs';
import { join } from 'path';
import database from '../connection';
import { logger } from '../../utils/logger';

async function runMigrations() {
  try {
    logger.info('Starting database migrations...');

    // Read migration files
    const migrations = [
      '001_initial_schema.sql',
      '002_multi_account_support.sql',
    ];

    for (const migrationFile of migrations) {
      const migrationPath = join(__dirname, migrationFile);
      const sql = readFileSync(migrationPath, 'utf8');

      logger.info(`Running migration: ${migrationFile}`);
      await database.query(sql);
      logger.info(`✓ Migration completed: ${migrationFile}`);
    }

    logger.info('All migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();
