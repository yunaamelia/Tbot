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
        const delay = Math.min(times * 50, 2000);
        logger.warn(`Redis retry attempt ${times}, waiting ${delay}ms`);
        return delay;
      },
      maxRetriesPerRequest: 3,
    };

    redisClient = new Redis(redisConfig);

    redisClient.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    redisClient.on('error', (err) => {
      logger.error('Redis connection error', err);
    });

    redisClient.on('close', () => {
      logger.warn('Redis connection closed');
    });

    redisClient.on('reconnecting', () => {
      logger.info('Redis reconnecting...');
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
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis connection closed');
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

