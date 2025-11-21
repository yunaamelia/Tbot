/**
 * Payment Configuration - Dynamic payment method loading from environment variables
 *
 * Tasks: T051, T052, T053, T055, T056
 * Requirements: FR-006, FR-007, FR-008
 * Feature: 002-friday-enhancement
 */

const { validateMethod } = require('./method-validator');
const redisClient = require('../../shared/redis-client');
const logger = require('../../shared/logger').child('payment-config');

const CACHE_KEY = 'payment:methods';
const CACHE_TTL = 3600; // 1 hour

// Payment method display names
const METHOD_DISPLAY_NAMES = {
  qris: 'QRIS Otomatis',
  ewallet: 'E-Wallet',
  bank: 'Transfer Bank Manual',
};

// Payment method icons
const METHOD_ICONS = {
  qris: '💳',
  ewallet: '📱',
  bank: '🏦',
};

/**
 * Get all available payment methods based on environment configuration
 * @param {boolean} forceRefresh If true, bypass cache and reload from environment
 * @returns {Promise<Array<PaymentMethod>>} Array of available payment methods
 */
async function getAvailableMethods(forceRefresh = false) {
  try {
    // In test environment, skip cache to prevent hanging
    if (process.env.NODE_ENV !== 'test') {
      // Try to get from cache first (unless forced refresh)
      if (!forceRefresh) {
        const cached = await getCachedMethods();
        if (cached) {
          logger.debug('Payment methods retrieved from cache');
          return cached;
        }
      }
    }

    // Load from environment variables
    const methods = await loadMethodsFromEnv();

    // Cache the methods (skip in test environment)
    if (process.env.NODE_ENV !== 'test') {
      await cacheMethods(methods);
    }

    logger.info('Payment methods loaded from environment', {
      enabledCount: methods.filter((m) => m.enabled).length,
      totalCount: methods.length,
      forceRefresh,
    });

    return methods;
  } catch (error) {
    logger.error('Error getting available payment methods', error);
    throw error;
  }
}

/**
 * Check if a specific payment method is enabled
 * @param {string} type Payment method type ('qris', 'ewallet', 'bank')
 * @returns {Promise<boolean>} True if method is enabled
 */
async function isMethodEnabled(type) {
  try {
    if (!type || typeof type !== 'string') {
      return false;
    }

    const methods = await getAvailableMethods();
    const method = methods.find((m) => m.type === type.toLowerCase());
    return method ? method.enabled : false;
  } catch (error) {
    logger.error('Error checking if method is enabled', error, { type });
    return false;
  }
}

/**
 * Load payment methods from environment variables
 * @returns {Promise<Array<PaymentMethod>>} Array of payment methods
 */
async function loadMethodsFromEnv() {
  const methods = [];

  // Check QRIS
  try {
    const qrisEnabled = await validateMethod('qris');
    methods.push({
      type: 'qris',
      name: 'QRIS',
      enabled: qrisEnabled,
      displayName: METHOD_DISPLAY_NAMES.qris,
      icon: METHOD_ICONS.qris,
    });
  } catch (error) {
    logger.warn('Error validating QRIS method', error);
    methods.push({
      type: 'qris',
      name: 'QRIS',
      enabled: false,
      displayName: METHOD_DISPLAY_NAMES.qris,
      icon: METHOD_ICONS.qris,
    });
  }

  // Check E-Wallet
  try {
    const ewalletEnabled = await validateMethod('ewallet');
    methods.push({
      type: 'ewallet',
      name: 'E-Wallet',
      enabled: ewalletEnabled,
      displayName: METHOD_DISPLAY_NAMES.ewallet,
      icon: METHOD_ICONS.ewallet,
    });
  } catch (error) {
    logger.warn('Error validating E-Wallet method', error);
    methods.push({
      type: 'ewallet',
      name: 'E-Wallet',
      enabled: false,
      displayName: METHOD_DISPLAY_NAMES.ewallet,
      icon: METHOD_ICONS.ewallet,
    });
  }

  // Check Bank Transfer
  try {
    const bankEnabled = await validateMethod('bank');
    methods.push({
      type: 'bank',
      name: 'Bank Transfer',
      enabled: bankEnabled,
      displayName: METHOD_DISPLAY_NAMES.bank,
      icon: METHOD_ICONS.bank,
    });
  } catch (error) {
    logger.warn('Error validating Bank method', error);
    methods.push({
      type: 'bank',
      name: 'Bank Transfer',
      enabled: false,
      displayName: METHOD_DISPLAY_NAMES.bank,
      icon: METHOD_ICONS.bank,
    });
  }

  // Check if at least one method is enabled
  const enabledMethods = methods.filter((m) => m.enabled);
  if (enabledMethods.length === 0) {
    logger.warn('No payment methods are configured. At least one payment method must be enabled.');
    // Don't throw error - return empty enabled methods array
    // Error will be handled at checkout handler level
  }

  return methods;
}

/**
 * Get cached payment methods from Redis
 * @returns {Promise<Array<PaymentMethod>|null>} Cached methods or null
 */
async function getCachedMethods() {
  try {
    // In test environment, skip cache to prevent hanging
    if (process.env.NODE_ENV === 'test') {
      return null;
    }

    const redis = redisClient.getRedis();
    if (!redis) {
      return null;
    }

    // Try to get from Redis with timeout
    const cached = await Promise.race([
      redis.get(CACHE_KEY),
      new Promise((resolve) => setTimeout(() => resolve(null), 100)), // 100ms timeout
    ]);

    if (cached) {
      return JSON.parse(cached);
    }
    return null;
  } catch (error) {
    logger.warn('Error getting cached payment methods', error);
    return null;
  }
}

/**
 * Cache payment methods in Redis
 * @param {Array<PaymentMethod>} methods Payment methods to cache
 * @returns {Promise<void>}
 */
async function cacheMethods(methods) {
  try {
    // In test environment, skip cache to prevent hanging
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    const redis = redisClient.getRedis();
    if (!redis) {
      return;
    }

    // Cache in Redis with TTL (with timeout to prevent hanging)
    await Promise.race([
      redis.setex(CACHE_KEY, CACHE_TTL, JSON.stringify(methods)),
      new Promise((resolve) => setTimeout(() => resolve(), 100)), // 100ms timeout
    ]).catch((error) => {
      logger.warn('Error caching payment methods in Redis', error);
    });
  } catch (error) {
    logger.warn('Error caching payment methods', error);
  }
}

/**
 * Force refresh of payment method cache from environment variables
 * @returns {Promise<void>}
 */
async function refreshCache() {
  try {
    // Clear cache first (with proper timeout)
    const redis = redisClient.getRedis();
    if (redis) {
      try {
        await Promise.race([
          redis.del(CACHE_KEY),
          new Promise((resolve) => setTimeout(() => resolve(), 200)), // Increased timeout
        ]);
        // Small delay to ensure cache is cleared
        await new Promise((resolve) => setTimeout(resolve, 50));
      } catch (error) {
        logger.warn('Error clearing cache during refresh', error);
        // Continue anyway - will reload from env
      }
    }

    // Reload methods from environment (bypass cache check)
    const methods = await loadMethodsFromEnv();

    // Cache the new methods
    await cacheMethods(methods);

    logger.info('Payment method cache refreshed', {
      enabledCount: methods.filter((m) => m.enabled).length,
      totalCount: methods.length,
    });
  } catch (error) {
    logger.error('Error refreshing payment method cache', error);
    // Don't throw - graceful degradation
  }
}

module.exports = {
  getAvailableMethods,
  isMethodEnabled,
  refreshCache,
  validateMethod,
};
