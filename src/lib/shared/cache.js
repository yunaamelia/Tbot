/**
 * Caching layer for product catalog and store configuration (FR-040, Article XI)
 * Uses Redis for caching with TTL support
 */

const { getRedis } = require('./redis-client');
const logger = require('./logger').child('cache');

const DEFAULT_TTL = 3600; // 1 hour in seconds
const CACHE_PREFIX = 'storebot:';

/**
 * Get cache key with prefix
 * @param {string} key Cache key
 * @returns {string} Prefixed cache key
 */
function getCacheKey(key) {
  return `${CACHE_PREFIX}${key}`;
}

/**
 * Get value from cache
 * @param {string} key Cache key
 * @returns {Promise<any|null>} Cached value or null if not found
 */
async function get(key) {
  try {
    const redis = getRedis();
    const cacheKey = getCacheKey(key);
    const value = await redis.get(cacheKey);

    if (value === null) {
      return null;
    }

    return JSON.parse(value);
  } catch (error) {
    logger.error('Cache get error', error, { key });
    return null; // Return null on error to allow fallback to database
  }
}

/**
 * Set value in cache
 * @param {string} key Cache key
 * @param {any} value Value to cache
 * @param {number} ttl Time to live in seconds (default: 1 hour)
 * @returns {Promise<void>}
 */
async function set(key, value, ttl = DEFAULT_TTL) {
  try {
    const redis = getRedis();
    const cacheKey = getCacheKey(key);
    const serialized = JSON.stringify(value);

    await redis.setex(cacheKey, ttl, serialized);
  } catch (error) {
    logger.error('Cache set error', error, { key });
    // Don't throw - caching is best effort
  }
}

/**
 * Delete value from cache
 * @param {string} key Cache key
 * @returns {Promise<void>}
 */
async function del(key) {
  try {
    const redis = getRedis();
    const cacheKey = getCacheKey(key);
    await redis.del(cacheKey);
  } catch (error) {
    logger.error('Cache delete error', error, { key });
  }
}

/**
 * Clear all cache entries with prefix
 * @returns {Promise<void>}
 */
async function clear() {
  try {
    const redis = getRedis();
    const pattern = `${CACHE_PREFIX}*`;
    const keys = await redis.keys(pattern);

    if (keys.length > 0) {
      await redis.del(...keys);
      logger.info(`Cleared ${keys.length} cache entries`);
    }
  } catch (error) {
    logger.error('Cache clear error', error);
  }
}

/**
 * Cache wrapper for async functions
 * @param {string} key Cache key
 * @param {Function} fn Function to execute if cache miss
 * @param {number} ttl Time to live in seconds
 * @returns {Promise<any>} Cached or computed value
 */
async function remember(key, fn, ttl = DEFAULT_TTL) {
  // Try to get from cache
  const cached = await get(key);
  if (cached !== null) {
    return cached;
  }

  // Cache miss - execute function
  const value = await fn();

  // Store in cache
  await set(key, value, ttl);

  return value;
}

module.exports = {
  get,
  set,
  del,
  clear,
  remember,
};

