/**
 * Script to run database migrations and verify schema creation
 * Task: T024
 * Requirement: Phase 2 - Foundational
 */

require('dotenv').config();
const knex = require('knex');
const config = require('../knexfile');
const logger = require('../src/lib/shared/logger').child('migrations-runner');

async function runMigrations() {
  const environment = process.env.NODE_ENV || 'development';
  const db = knex(config[environment]);

  try {
    logger.info('Starting database migrations...', { environment });

    // Check database connection
    await db.raw('SELECT 1');
    logger.info('Database connection successful');

    // Run migrations
    const [batchNo, log] = await db.migrate.latest();

    if (log.length === 0) {
      logger.info('No new migrations to run. Database schema is up to date.');
    } else {
      logger.info(`Migrations completed. Batch: ${batchNo}`, {
        migrationsRun: log.length,
        migrations: log,
      });
    }

    // Verify schema by checking if key tables exist
    const tables = [
      'products',
      'customers',
      'orders',
      'payments',
      'admins',
      'notifications',
      'store_config',
    ];

    const existingTables = [];
    for (const table of tables) {
      const exists = await db.schema.hasTable(table);
      if (exists) {
        existingTables.push(table);
      } else {
        logger.warn(`Table ${table} not found after migrations`);
      }
    }

    if (existingTables.length === tables.length) {
      logger.info('Schema verification passed', {
        tablesVerified: existingTables.length,
        tables: existingTables,
      });
      console.log('✅ All database tables created successfully');
      return true;
    } else {
      logger.error('Schema verification failed', {
        expected: tables.length,
        found: existingTables.length,
        missing: tables.filter((t) => !existingTables.includes(t)),
      });
      console.error('❌ Some tables are missing after migrations');
      return false;
    }
  } catch (error) {
    logger.error('Error running migrations', error);
    console.error('❌ Migration failed:', error.message);
    console.error('\nPlease ensure:');
    console.error('1. Database server is running');
    console.error('2. Database credentials in .env are correct');
    console.error('3. Database exists (create it if needed)');
    return false;
  } finally {
    await db.destroy();
  }
}

// Run if called directly
if (require.main === module) {
  runMigrations()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { runMigrations };

