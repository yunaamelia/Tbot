/**
 * Role-based filtering service for menu items
 * Implements role detection, caching, and menu item filtering
 *
 * Tasks: T048, T049, T050, T051, T054, T056, T057, T058
 * Requirements: FR-007, FR-008, FR-009, FR-010, FR-022
 * Feature: 003-enhanced-keyboard
 */

const adminRepository = require('../admin/admin-repository');
const redisClient = require('../shared/redis-client');
const config = require('../shared/config');
const logger = require('../shared/logger').child('role-filter');

// Cache configuration
const ROLE_CACHE_TTL = parseInt(config.get('ROLE_CACHE_TTL', '3600'), 10); // 1 hour default
const CACHE_KEY_PREFIX = 'role:user:';

/**
 * Get user role with caching and fail-safe mechanism
 * Cache → Database → Fail-safe (default to regular user)
 *
 * @param {number} telegramUserId Telegram user ID
 * @returns {Promise<{role: string, cached: boolean, source: string}>}
 *   - role: 'admin' | 'regular'
 *   - cached: true if from cache, false otherwise
 *   - source: 'cache' | 'database' | 'fail-safe'
 */
async function getUserRole(telegramUserId) {
  const startTime = Date.now();

  try {
    // Step 1: Try cache first
    const redis = redisClient.getRedis();
    if (redis && (process.env.NODE_ENV === 'test' || redis.status === 'ready')) {
      try {
        const cacheKey = `${CACHE_KEY_PREFIX}${telegramUserId}`;
        // Use Promise.race with timeout for test environment
        const cachePromise = redis.get(cacheKey);
        const timeoutPromise = new Promise((resolve) =>
          setTimeout(() => resolve(null), process.env.NODE_ENV === 'test' ? 100 : 5000)
        );
        const cachedRole = await Promise.race([cachePromise, timeoutPromise]);

        if (cachedRole) {
          const roleData = JSON.parse(cachedRole);
          const responseTime = Date.now() - startTime;

          logger.debug('Role retrieved from cache', {
            telegramUserId,
            role: roleData.role,
            responseTime,
          });

          return {
            role: roleData.role,
            cached: true,
            source: 'cache',
          };
        }
      } catch (redisError) {
        // Redis error - fall back to database
        logger.warn('Redis cache lookup failed, falling back to database', {
          telegramUserId,
          error: redisError.message,
        });
      }
    }

    // Step 2: Try database
    try {
      const admin = await adminRepository.findByTelegramId(telegramUserId);
      const role = admin ? 'admin' : 'regular';
      const responseTime = Date.now() - startTime;

      // Cache the result
      if (redis && (process.env.NODE_ENV === 'test' || redis.status === 'ready')) {
        try {
          const cacheKey = `${CACHE_KEY_PREFIX}${telegramUserId}`;
          // Use Promise.race with timeout for test environment
          const setPromise = redis.set(cacheKey, JSON.stringify({ role }), 'EX', ROLE_CACHE_TTL);
          const timeoutPromise = new Promise((resolve) =>
            setTimeout(() => resolve(), process.env.NODE_ENV === 'test' ? 100 : 5000)
          );
          await Promise.race([setPromise, timeoutPromise]);
        } catch (cacheError) {
          // Cache error is non-fatal - log and continue
          logger.warn('Failed to cache role', {
            telegramUserId,
            error: cacheError.message,
          });
        }
      }

      logger.debug('Role retrieved from database', {
        telegramUserId,
        role,
        cached: false,
        responseTime,
      });

      return {
        role,
        cached: false,
        source: 'database',
      };
    } catch (dbError) {
      // Database error - fall back to fail-safe
      logger.error('Database role lookup failed, using fail-safe', {
        telegramUserId,
        error: dbError.message,
      });
    }
  } catch (error) {
    // Unexpected error - use fail-safe
    logger.error('Unexpected error in role detection, using fail-safe', {
      telegramUserId,
      error: error.message,
    });
  }

  // Step 3: Fail-safe - default to regular user
  const responseTime = Date.now() - startTime;
  logger.warn('Role detection failed, defaulting to regular user (fail-safe)', {
    telegramUserId,
    responseTime,
  });

  return {
    role: 'regular',
    cached: false,
    source: 'fail-safe',
  };
}

/**
 * Filter menu items based on role visibility rules
 *
 * @param {Array<Object>} items Menu items to filter
 * @param {string} userRole User role ('admin' or 'regular')
 * @returns {Array<Object>} Filtered menu items (only visible items)
 */
function filterMenuItemsByRole(items, userRole) {
  if (!items || !Array.isArray(items)) {
    logger.warn('Invalid items array provided to filterMenuItemsByRole', {
      items: typeof items,
      userRole,
    });
    return [];
  }

  if (!userRole || (userRole !== 'admin' && userRole !== 'regular')) {
    logger.warn('Invalid user role provided to filterMenuItemsByRole', {
      userRole,
    });
    // Fail-safe: filter out admin-only items
    return items.filter((item) => {
      const itemRoles = item.roles || [];
      return itemRoles.length === 0 || itemRoles.includes('regular');
    });
  }

  const filtered = items.filter((item) => {
    // Items with no roles property or empty roles array are visible to all
    const itemRoles = item.roles || [];
    if (itemRoles.length === 0) {
      return true;
    }

    // Item is visible if user role matches any role in item roles
    return itemRoles.includes(userRole);
  });

  logger.debug('Menu items filtered by role', {
    userRole,
    originalCount: items.length,
    filteredCount: filtered.length,
  });

  return filtered;
}

/**
 * Mark admin-only buttons as disabled for regular users
 * Alternative to hiding: shows buttons but disables them
 *
 * @param {Array<Object>} items Menu items to process
 * @param {string} userRole User role ('admin' or 'regular')
 * @returns {Array<Object>} Items with disabled flag set appropriately
 */
function markDisabledButtons(items, userRole) {
  if (!items || !Array.isArray(items)) {
    return [];
  }

  if (userRole === 'admin') {
    // Admin users - all items enabled
    return items.map((item) => ({
      ...item,
      disabled: false,
    }));
  }

  // Regular users - disable admin-only items
  return items.map((item) => {
    const itemRoles = item.roles || [];

    // Items with no roles or 'regular' role are enabled
    if (itemRoles.length === 0 || itemRoles.includes('regular')) {
      return {
        ...item,
        disabled: false,
      };
    }

    // Admin-only items are disabled for regular users
    if (itemRoles.includes('admin') && !itemRoles.includes('regular')) {
      // Add lock emoji to label if not already present
      const label = item.text || item.label || '';
      const lockedLabel = label.includes('🔒') ? label : `🔒 ${label}`;

      return {
        ...item,
        text: lockedLabel,
        label: lockedLabel,
        disabled: true,
      };
    }

    return {
      ...item,
      disabled: false,
    };
  });
}

/**
 * Invalidate role cache for a specific user
 *
 * @param {number} telegramUserId Telegram user ID
 * @returns {Promise<void>}
 */
async function invalidateRoleCache(telegramUserId) {
  try {
    const redis = redisClient.getRedis();
    if (redis && (process.env.NODE_ENV === 'test' || redis.status === 'ready')) {
      const cacheKey = `${CACHE_KEY_PREFIX}${telegramUserId}`;
      // Use Promise.race with timeout for test environment
      const delPromise = redis.del(cacheKey);
      const timeoutPromise = new Promise((resolve) =>
        setTimeout(() => resolve(), process.env.NODE_ENV === 'test' ? 100 : 5000)
      );
      await Promise.race([delPromise, timeoutPromise]);

      logger.debug('Role cache invalidated', {
        telegramUserId,
      });
    }
  } catch (error) {
    // Cache invalidation errors are non-fatal
    logger.warn('Failed to invalidate role cache', {
      telegramUserId,
      error: error.message,
    });
  }
}

/**
 * Force refresh of role cache from database
 *
 * @param {number} telegramUserId Telegram user ID
 * @returns {Promise<{role: string}>} Refreshed role
 */
async function refreshRoleCache(telegramUserId) {
  // Invalidate existing cache
  await invalidateRoleCache(telegramUserId);

  // Fetch fresh role from database
  const roleData = await getUserRole(telegramUserId);

  logger.debug('Role cache refreshed', {
    telegramUserId,
    role: roleData.role,
    source: roleData.source,
  });

  return {
    role: roleData.role,
  };
}

module.exports = {
  getUserRole,
  filterMenuItemsByRole,
  markDisabledButtons,
  invalidateRoleCache,
  refreshRoleCache,
};
