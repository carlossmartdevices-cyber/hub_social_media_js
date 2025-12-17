require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runAllMigrations() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'content_hub',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
  });

  try {
    console.log('🔄 Connecting to database...');
    await pool.query('SELECT NOW()');
    console.log('✅ Connected to database\n');

    // List of all migrations in order
    const migrations = [
      '001_initial_schema.sql',
      '002_multi_account_support.sql',
      '003_video_support.sql',
      '004_telegram_channels.sql',
      '005_automated_actions.sql',
    ];

    const migrationsDir = path.join(__dirname, 'src', 'database', 'migrations');

    for (const migrationFile of migrations) {
      const migrationPath = path.join(migrationsDir, migrationFile);
      
      if (!fs.existsSync(migrationPath)) {
        console.log(`⚠️  Skipping ${migrationFile} (file not found)`);
        continue;
      }

      console.log(`🔄 Running migration: ${migrationFile}`);
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

      try {
        await pool.query(migrationSQL);
        console.log(`✅ Migration completed: ${migrationFile}\n`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`⚠️  Migration already applied: ${migrationFile}\n`);
        } else {
          throw error;
        }
      }
    }

    console.log('📊 Checking database tables...');
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log('\n📋 Created tables:');
    result.rows.forEach(row => {
      console.log(`  ✓ ${row.table_name}`);
    });

    console.log('\n✅ All migrations completed successfully!');
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    await pool.end();
    process.exit(1);
  }
}

runAllMigrations();

