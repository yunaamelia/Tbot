/**
 * Script to seed initial admin user and store configuration
 * Task: T025
 * Requirement: Phase 2 - Foundational
 */

require('dotenv').config();
const knex = require('knex');
const config = require('../knexfile');
const logger = require('../src/lib/shared/logger').child('seeds-runner');

async function runSeeds() {
  const environment = process.env.NODE_ENV || 'development';
  const db = knex(config[environment]);

  try {
    logger.info('Starting database seeding...', { environment });

    // Check database connection
    await db.raw('SELECT 1');
    logger.info('Database connection successful');

    // Verify tables exist before seeding
    const requiredTables = ['admins', 'store_config'];
    for (const table of requiredTables) {
      const exists = await db.schema.hasTable(table);
      if (!exists) {
        throw new Error(
          `Table ${table} does not exist. Please run migrations first: npm run migrate`
        );
      }
    }

    // Run seeds
    const seedResults = await db.seed.run();

    if (seedResults.length === 0) {
      logger.info('No seeds to run or seeds already executed');
      console.log('ℹ️  Seeds already executed or no seeds configured');
    } else {
      logger.info('Seeds completed', {
        seedsRun: seedResults.length,
        seeds: seedResults,
      });
      console.log(`✅ Successfully ran ${seedResults.length} seed file(s)`);
    }

    // Verify seed data
    const adminCount = await db('admins').count('id as count').first();
    const storeConfigCount = await db('store_config').count('key as count').first();

    logger.info('Seed verification', {
      adminCount: adminCount?.count || 0,
      storeConfigCount: storeConfigCount?.count || 0,
    });

    if (adminCount && parseInt(adminCount.count) > 0) {
      console.log(`✅ Admin users: ${adminCount.count}`);
    } else {
      console.log('⚠️  No admin users found. Make sure ADMIN_TELEGRAM_IDS is set in .env');
    }

    if (storeConfigCount && parseInt(storeConfigCount.count) > 0) {
      console.log(`✅ Store configuration: ${storeConfigCount.count} entries`);
    } else {
      console.log('⚠️  No store configuration found');
    }

    return true;
  } catch (error) {
    logger.error('Error running seeds', error);
    console.error('❌ Seeding failed:', error.message);
    console.error('\nPlease ensure:');
    console.error('1. Migrations have been run: npm run migrate');
    console.error('2. ADMIN_TELEGRAM_IDS is set in .env (comma-separated Telegram user IDs)');
    console.error('3. Database connection is working');
    return false;
  } finally {
    await db.destroy();
  }
}

// Run if called directly
if (require.main === module) {
  runSeeds()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { runSeeds };

