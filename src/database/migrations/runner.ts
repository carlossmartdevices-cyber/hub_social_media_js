import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import database from '../connection';
import { logger } from '../../utils/logger';

async function runMigrations() {
  try {
    logger.info('Starting database migrations...');

    // Create migrations tracking table if it doesn't exist
    await database.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        migration_name VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Get list of already applied migrations
    const result = await database.query('SELECT migration_name FROM schema_migrations');
    const appliedMigrations = new Set(result.rows.map((row: { migration_name: string }) => row.migration_name));

    // Dynamically read all migration files and sort them
    const migrationsDir = __dirname;
    const allFiles = readdirSync(migrationsDir);

    // Filter for .sql files and sort them numerically by prefix
    const migrations = allFiles
      .filter(file => file.endsWith('.sql'))
      .sort((a, b) => {
        // Extract numeric prefix (e.g., "001" from "001_initial_schema.sql")
        const numA = parseInt(a.split('_')[0]);
        const numB = parseInt(b.split('_')[0]);
        return numA - numB;
      });

    logger.info(`Found ${migrations.length} migration files`);
    logger.info(`${appliedMigrations.size} migrations already applied`);

    let newMigrationsCount = 0;

    for (const migrationFile of migrations) {
      // Skip if already applied
      if (appliedMigrations.has(migrationFile)) {
        logger.debug(`Skipping already applied migration: ${migrationFile}`);
        continue;
      }

      const migrationPath = join(__dirname, migrationFile);
      const sql = readFileSync(migrationPath, 'utf8');

      logger.info(`Running migration: ${migrationFile}`);

      // Run migration in a transaction
      await database.query('BEGIN');
      try {
        await database.query(sql);
        await database.query(
          'INSERT INTO schema_migrations (migration_name) VALUES ($1)',
          [migrationFile]
        );
        await database.query('COMMIT');
        logger.info(`✓ Migration completed: ${migrationFile}`);
        newMigrationsCount++;
      } catch (migrationError) {
        await database.query('ROLLBACK');
        throw migrationError;
      }
    }

    if (newMigrationsCount === 0) {
      logger.info('No new migrations to apply. Database is up to date.');
    } else {
      logger.info(`Applied ${newMigrationsCount} new migration(s) successfully!`);
    }

    process.exit(0);
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();
