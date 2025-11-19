/**
 * Database connection pool implementation
 * Supports both PostgreSQL and MySQL via Knex.js
 * Includes connection pooling configuration (FR-039, Article XI)
 */

const knex = require('knex');
const config = require('../shared/config');
const logger = require('../shared/logger').child('db-connection');

let dbInstance = null;

/**
 * Get or create database connection instance with connection pooling
 * @returns {Knex} Knex database instance
 */
function getDb() {
  if (!dbInstance) {
    const dbConfig = {
      client: config.get('DB_TYPE', 'postgresql'),
      connection: {
        host: config.get('DB_HOST', 'localhost'),
        port: parseInt(config.get('DB_PORT', '5432')),
        database: config.get('DB_NAME', 'premium_store_bot'),
        user: config.get('DB_USER'),
        password: config.get('DB_PASSWORD'),
      },
      pool: {
        min: parseInt(config.get('DB_POOL_MIN', '2')),
        max: parseInt(config.get('DB_POOL_MAX', '10')),
        acquireTimeoutMillis: 30000,
        idleTimeoutMillis: 30000,
      },
      acquireConnectionTimeout: 30000,
    };

    dbInstance = knex(dbConfig);

    // Handle connection errors
    dbInstance.on('error', (err) => {
      logger.error('Database connection error:', err);
    });
  }

  return dbInstance;
}

/**
 * Close database connection pool
 * @returns {Promise<void>}
 */
async function closeDb() {
  if (dbInstance) {
    await dbInstance.destroy();
    dbInstance = null;
  }
}

/**
 * Test database connection
 * @returns {Promise<boolean>}
 */
async function testConnection() {
  try {
    const db = getDb();
    await db.raw('SELECT 1');
    return true;
  } catch (error) {
    logger.error('Database connection test failed:', error);
    return false;
  }
}

module.exports = {
  getDb,
  closeDb,
  testConnection,
};
