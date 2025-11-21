/**
 * Redis connection and client using ioredis
 * Used for session management, caching, and pub/sub notifications
 */

const Redis = require('ioredis');
const config = require('./config');
const logger = require('./logger').child('redis');

let redisClient = null;

/**
 * Get or create Redis client instance
 * @returns {Redis} Redis client instance
 */
function getRedis() {
  if (!redisClient) {
    const redisConfig = {
      host: config.get('REDIS_HOST', 'localhost'),
      port: config.getInt('REDIS_PORT', 6379),
      password: config.get('REDIS_PASSWORD') || undefined,
      db: config.getInt('REDIS_DB', 0),
      retryStrategy: (times) => {
        // In test environment, disable retries to prevent hanging
        if (process.env.NODE_ENV === 'test') {
          return null; // Stop retrying
        }
        const delay = Math.min(times * 50, 2000);
        logger.warn(`Redis retry attempt ${times}, waiting ${delay}ms`);
        return delay;
      },
      maxRetriesPerRequest: process.env.NODE_ENV === 'test' ? 1 : 3,
      enableOfflineQueue: false, // Don't queue commands when offline
      lazyConnect: process.env.NODE_ENV === 'test', // Don't connect immediately in tests
      connectTimeout: process.env.NODE_ENV === 'test' ? 500 : 10000, // 500ms timeout in tests
      commandTimeout: process.env.NODE_ENV === 'test' ? 500 : 5000, // 500ms command timeout in tests
    };

    redisClient = new Redis(redisConfig);

    redisClient.on('connect', () => {
      if (process.env.NODE_ENV !== 'test') {
        logger.info('Redis connected successfully');
      }
    });

    redisClient.on('error', (err) => {
      // In test environment, suppress error logs to avoid noise
      if (process.env.NODE_ENV !== 'test') {
        logger.error('Redis connection error', err);
      }
    });

    redisClient.on('close', () => {
      if (process.env.NODE_ENV !== 'test') {
        logger.warn('Redis connection closed');
      }
    });

    redisClient.on('reconnecting', () => {
      // In test environment, don't reconnect to prevent hanging
      if (process.env.NODE_ENV !== 'test') {
        logger.info('Redis reconnecting...');
      }
    });
  }

  return redisClient;
}

/**
 * Close Redis connection
 * @returns {Promise<void>}
 */
async function closeRedis() {
  if (redisClient) {
    try {
      // Remove all event listeners first
      redisClient.removeAllListeners();

      // Try to quit gracefully, fallback to disconnect
      let timeoutId;
      try {
        await Promise.race([
          redisClient.quit(),
          new Promise((resolve) => {
            timeoutId = setTimeout(() => resolve(), 1000);
          }),
        ]);
        if (timeoutId) clearTimeout(timeoutId);
      } catch (error) {
        if (timeoutId) clearTimeout(timeoutId);
        let disconnectTimeoutId;
        try {
          await Promise.race([
            redisClient.disconnect(),
            new Promise((resolve) => {
              disconnectTimeoutId = setTimeout(() => resolve(), 500);
            }),
          ]);
          if (disconnectTimeoutId) clearTimeout(disconnectTimeoutId);
        } catch (disconnectError) {
          if (disconnectTimeoutId) clearTimeout(disconnectTimeoutId);
          // Force cleanup if both fail
          redisClient = null;
        }
      }

      redisClient = null;
      if (process.env.NODE_ENV !== 'test') {
        logger.info('Redis connection closed');
      }
    } catch (error) {
      // Force cleanup on any error
      redisClient = null;
      if (process.env.NODE_ENV !== 'test') {
        logger.warn('Redis connection closed with error', error);
      }
    }
  }
}

/**
 * Test Redis connection
 * @returns {Promise<boolean>}
 */
async function testConnection() {
  try {
    const redis = getRedis();
    await redis.ping();
    return true;
  } catch (error) {
    logger.error('Redis connection test failed', error);
    return false;
  }
}

module.exports = {
  getRedis,
  closeRedis,
  testConnection,
};
