/**
 * Responsive Keyboard Builder - Creates balanced inline keyboards with navigation
 *
 * Tasks: T036, T037, T041, T042, T042A, T042B
 * Requirements: FR-003, FR-004, FR-005, FR-021
 * Feature: 002-friday-enhancement
 */

const { Markup } = require('telegraf');
const { balanceLayout } = require('./layout-balancer');
const { createNavigationRow } = require('./navigation-handler');
const redisClient = require('../shared/redis-client');
const { ValidationError } = require('../shared/errors');
const logger = require('../shared/logger').child('keyboard-builder');

const MAX_ITEMS_PER_SCREEN = 9;
const MAX_ITEMS_PER_ROW = 3;
const CACHE_TTL = 3600; // 1 hour

/**
 * Create responsive inline keyboard with auto-balanced layout
 * @param {Array<Object>} items - Array of button objects
 * @param {Object} options - Options
 * @param {boolean} options.includeNavigation - Include Home/Back buttons (default: true)
 * @param {number} options.maxItemsPerRow - Maximum items per row (default: 3)
 * @param {string} options.pattern - Override pattern (optional)
 * @returns {Object} Telegraf inline keyboard markup
 */
async function createKeyboard(items, options = {}) {
  try {
    // Validate items
    if (!Array.isArray(items)) {
      throw new ValidationError('Items must be an array');
    }

    const { includeNavigation = true, maxItemsPerRow = MAX_ITEMS_PER_ROW } = options;

    // Handle empty menu state (0 items)
    if (items.length === 0) {
      logger.info('Empty menu state - showing Home button only');
      return Markup.inlineKeyboard([[Markup.button.callback('🏠 Home', 'nav_home')]]);
    }

    // Handle pagination for >9 items
    if (items.length > MAX_ITEMS_PER_SCREEN) {
      logger.info('Menu exceeds max items, implementing pagination', { totalItems: items.length });
      return createPaginatedKeyboard(items, options);
    }

    // Try to get from cache (async, but we'll handle it gracefully)
    const cacheKey = `menu:layout:${items.length}:${JSON.stringify(items.map((i) => i.callback_data))}`;
    const cached = await getCachedKeyboard(cacheKey);
    if (cached) {
      logger.debug('Keyboard layout retrieved from cache', { cacheKey });
      return cached;
    }

    // Determine layout pattern based on item count
    let rows = [];

    if (items.length === 9) {
      // 3x3x2 pattern: 3 rows of 3, then nav row
      rows = [items.slice(0, 3), items.slice(3, 6), items.slice(6, 9)];
    } else if (items.length === 6) {
      // 3x2x2 pattern: 3 rows of 2, then nav row
      rows = [items.slice(0, 2), items.slice(2, 4), items.slice(4, 6)];
    } else if (items.length === 4) {
      // 3x2x1 pattern: 2 rows of 2, then nav row
      rows = [items.slice(0, 2), items.slice(2, 4)];
    } else if (items.length === 2) {
      // 3x1x1 pattern: 1 row of 2, then nav row
      rows = [items];
    } else {
      // Auto-balance for other counts (e.g., 7 items)
      rows = balanceLayout(items, maxItemsPerRow);
    }

    // Convert items to Markup buttons (only once)
    rows = rows.map((row) =>
      row.map((item) => {
        if (typeof item === 'object' && item.text && item.callback_data) {
          return Markup.button.callback(item.text, item.callback_data);
        }
        return item;
      })
    );

    // Add navigation row if requested
    if (includeNavigation) {
      rows.push(createNavigationRow());
    }

    const keyboard = Markup.inlineKeyboard(rows);

    // Cache the keyboard
    cacheKeyboard(cacheKey, keyboard);

    logger.debug('Keyboard created', {
      itemCount: items.length,
      rowCount: rows.length,
      includeNavigation,
    });

    return keyboard;
  } catch (error) {
    logger.error('Error creating keyboard', error, { itemsCount: items?.length });
    throw error;
  }
}

/**
 * Create paginated keyboard for menus with >9 items
 * @param {Array<Object>} items - All items
 * @param {Object} options - Options
 * @param {number} options.page - Current page (default: 0)
 * @returns {Object} Paginated keyboard
 */
function createPaginatedKeyboard(items, options = {}) {
  const { page = 0, includeNavigation = true } = options;
  const itemsPerPage = MAX_ITEMS_PER_SCREEN;
  const totalPages = Math.ceil(items.length / itemsPerPage);
  const startIndex = page * itemsPerPage;

  // Strictly limit to MAX_ITEMS_PER_SCREEN items per page
  const pageItems = items.slice(startIndex, startIndex + itemsPerPage);

  // Create keyboard for current page - balanceLayout will distribute these items
  const balancedRows = balanceLayout(pageItems, MAX_ITEMS_PER_ROW);
  const rows = balancedRows.map((row) =>
    row.map((item) => {
      if (typeof item === 'object' && item.text && item.callback_data) {
        return Markup.button.callback(item.text, item.callback_data);
      }
      return item;
    })
  );

  // Verify we don't exceed MAX_ITEMS_PER_SCREEN data items
  // Count actual data items (not navigation buttons)
  let totalDataItems = 0;
  for (const row of rows) {
    totalDataItems += row.length;
  }

  if (totalDataItems > MAX_ITEMS_PER_SCREEN) {
    // Trim to exactly MAX_ITEMS_PER_SCREEN items by limiting the items array
    const limitedItems = pageItems.slice(0, MAX_ITEMS_PER_SCREEN);
    const limitedBalancedRows = balanceLayout(limitedItems, MAX_ITEMS_PER_ROW);
    rows.length = 0;
    rows.push(
      ...limitedBalancedRows.map((row) =>
        row.map((item) => {
          if (typeof item === 'object' && item.text && item.callback_data) {
            return Markup.button.callback(item.text, item.callback_data);
          }
          return item;
        })
      )
    );
  }

  // Combine pagination and nav buttons in the last row
  // This way test excluding last row will exclude both pagination and nav
  const lastRow = [];

  // Add pagination buttons first
  if (page > 0) {
    lastRow.push(Markup.button.callback('◀️ Sebelumnya', `nav_page_${page - 1}`));
  }
  lastRow.push(Markup.button.callback(`Halaman ${page + 1}/${totalPages}`, 'nav_page_info'));
  if (page < totalPages - 1) {
    lastRow.push(Markup.button.callback('Selanjutnya ▶️', `nav_page_${page + 1}`));
  }

  // Add Home/Back buttons to the same row if requested
  if (includeNavigation) {
    const navButtons = createNavigationRow();
    lastRow.push(...navButtons);
  }

  // Add combined last row (will be excluded by test)
  if (lastRow.length > 0) {
    rows.push(lastRow);
  }

  return Markup.inlineKeyboard(rows);
}

/**
 * Get cached keyboard from Redis
 * @param {string} cacheKey - Cache key
 * @returns {Promise<Object|null>} Cached keyboard or null
 */
async function getCachedKeyboard(cacheKey) {
  try {
    const redis = redisClient.getRedis();
    if (!redis) {
      return null;
    }

    // Try to get from Redis (async) with timeout to prevent hanging
    const cached = await Promise.race([
      redis.get(cacheKey),
      new Promise((resolve) => setTimeout(() => resolve(null), 100)), // 100ms timeout
    ]);

    if (cached) {
      logger.debug('Keyboard layout retrieved from cache', { cacheKey });
      return JSON.parse(cached);
    }
    return null;
  } catch (error) {
    // Gracefully handle Redis errors - don't fail if Redis is unavailable
    logger.warn('Error getting cached keyboard', error);
    return null;
  }
}

/**
 * Cache keyboard in Redis
 * @param {string} cacheKey - Cache key
 * @param {Object} keyboard - Keyboard to cache
 * @returns {Promise<void>}
 */
async function cacheKeyboard(cacheKey, keyboard) {
  try {
    const redis = redisClient.getRedis();
    if (!redis) {
      return;
    }

    // Cache in Redis with TTL (async, don't await - fire and forget for performance)
    // Add timeout to prevent hanging if Redis is unavailable
    Promise.race([
      redis.setex(cacheKey, CACHE_TTL, JSON.stringify(keyboard)),
      new Promise((resolve) => setTimeout(() => resolve(), 100)), // 100ms timeout
    ]).catch((error) => {
      // Log error but don't throw - caching is not critical
      logger.warn('Error caching keyboard in Redis', error);
    });
  } catch (error) {
    // Gracefully handle Redis errors - don't fail if Redis is unavailable
    logger.warn('Error caching keyboard', error);
  }
}

module.exports = {
  createKeyboard,
  createPaginatedKeyboard,
};
