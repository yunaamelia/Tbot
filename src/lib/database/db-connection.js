/**
 * Database connection pool implementation
 * Supports both PostgreSQL and MySQL via Knex.js
 * Includes connection pooling configuration and retry logic (FR-039, Article XI, T156)
 */

const knex = require('knex');
const config = require('../shared/config');
const logger = require('../shared/logger').child('db-connection');

let dbInstance = null;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000; // Start with 1 second

/**
 * Retry connection with exponential backoff (T156)
 * @param {Function} fn Function to retry
 * @param {number} retries Number of retries remaining
 * @param {number} delay Delay in milliseconds
 * @returns {Promise<any>} Result of function
 */
async function retryConnection(fn, retries = MAX_RETRIES, delay = RETRY_DELAY_MS) {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0) {
      logger.warn(
        `Database connection failed, retrying in ${delay}ms (${MAX_RETRIES - retries + 1}/${MAX_RETRIES})`,
        {
          error: error.message,
        }
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      return retryConnection(fn, retries - 1, delay * 2); // Exponential backoff
    }
    throw error;
  }
}

/**
 * Get or create database connection instance with connection pooling and retry logic (T156)
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
        createTimeoutMillis: 30000,
        destroyTimeoutMillis: 5000,
        reapIntervalMillis: 1000,
        createRetryIntervalMillis: 200,
      },
      acquireConnectionTimeout: 30000,
    };

    dbInstance = knex(dbConfig);

    // Handle connection errors with retry logic (T156)
    dbInstance.on('error', async (err) => {
      logger.error('Database connection error:', err);
      // Attempt to reconnect
      try {
        await retryConnection(async () => {
          await dbInstance.raw('SELECT 1');
        });
        logger.info('Database reconnected successfully');
      } catch (retryError) {
        logger.error('Database reconnection failed after retries', retryError);
      }
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
 * Test database connection with retry logic (T156)
 * @returns {Promise<boolean>}
 */
async function testConnection() {
  try {
    const db = getDb();
    await retryConnection(async () => {
      await db.raw('SELECT 1');
    });
    return true;
  } catch (error) {
    logger.error('Database connection test failed after retries:', error);
    return false;
  }
}

module.exports = {
  getDb,
  closeDb,
  testConnection,
};
