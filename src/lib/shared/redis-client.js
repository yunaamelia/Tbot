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

        // Maximum retry attempts: 10 (after 10 attempts, stop retrying)
        const MAX_RETRY_ATTEMPTS = 10;
        if (times > MAX_RETRY_ATTEMPTS) {
          logger.error(
            `Redis connection failed after ${MAX_RETRY_ATTEMPTS} attempts. Stopping retries. Please check Redis server status.`
          );
          return null; // Stop retrying after max attempts
        }

        const delay = Math.min(times * 50, 2000);
        logger.warn(`Redis retry attempt ${times}/${MAX_RETRY_ATTEMPTS}, waiting ${delay}ms`);
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

      // In test environment, skip graceful shutdown to prevent open handles
      if (process.env.NODE_ENV === 'test') {
        try {
          // Try quick disconnect without timeout
          redisClient.disconnect(false); // false = don't wait for commands
        } catch (error) {
          // Ignore errors
        }
        redisClient = null;
        return;
      }

      // Try to quit gracefully, fallback to disconnect
      let timeoutId;
      let raceTimeoutId;
      try {
        const quitPromise = redisClient.quit();

        // Create timeout for race condition
        const racePromise = new Promise((resolve) => {
          raceTimeoutId = setTimeout(() => resolve(), 500);
        });

        // Timeout for force disconnect if quit takes too long
        timeoutId = setTimeout(() => {
          try {
            redisClient.disconnect(false);
          } catch (error) {
            // Ignore
          }
        }, 500);

        await Promise.race([quitPromise, racePromise]);
      } catch (error) {
        // Ignore errors
      } finally {
        // Clear all timeouts
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        if (raceTimeoutId) {
          clearTimeout(raceTimeoutId);
        }
        // Ensure cleanup
        try {
          if (redisClient && redisClient.status !== 'end') {
            redisClient.disconnect(false);
          }
        } catch (error) {
          // Ignore
        }
      }

      redisClient = null;
      logger.info('Redis connection closed');
    } catch (error) {
      // Force cleanup on any error
      try {
        if (redisClient) {
          redisClient.disconnect(false);
        }
      } catch (disconnectError) {
        // Ignore
      }
      redisClient = null;
      logger.warn('Redis connection closed with error', error);
    }
  }
}

/**
 * Test Redis connection
 * @returns {Promise<boolean>}
 */
async function testConnection() {
  try {
    // Reset existing client if it's in a bad state
    if (redisClient && redisClient.status !== 'ready' && redisClient.status !== 'connecting') {
      try {
        redisClient.disconnect(false);
      } catch (disconnectError) {
        // Ignore disconnect errors
      }
      redisClient = null;
    }

    const redis = getRedis();
    // If client is not connected, connect first
    if (redis.status !== 'ready' && redis.status !== 'connecting') {
      await redis.connect();
    }
    // Wait for connection to be ready
    if (redis.status === 'connecting') {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          redis.removeListener('ready', onReady);
          redis.removeListener('error', onError);
          reject(new Error('Connection timeout'));
        }, 5000);
        const onReady = () => {
          clearTimeout(timeout);
          redis.removeListener('error', onError);
          resolve();
        };
        const onError = (err) => {
          clearTimeout(timeout);
          redis.removeListener('ready', onReady);
          reject(err);
        };
        redis.once('ready', onReady);
        redis.once('error', onError);
      });
    }
    await redis.ping();
    return true;
  } catch (error) {
    logger.error('Redis connection test failed', error);
    // Reset client on error to allow retry
    if (redisClient && redisClient.status !== 'end') {
      try {
        redisClient.disconnect(false);
      } catch (disconnectError) {
        // Ignore disconnect errors
      }
      redisClient = null;
    }
    return false;
  }
}

module.exports = {
  getRedis,
  closeRedis,
  testConnection,
};
