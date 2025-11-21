/**
 * Navigation Handler - Fixed navigation buttons (Home/Back) management
 *
 * Task: T035, T040
 * Requirements: FR-005
 * Feature: 002-friday-enhancement
 */

const { Markup } = require('telegraf');
const logger = require('../shared/logger').child('navigation-handler');

// Navigation history storage (in-memory, per user)
const navigationHistory = new Map();

/**
 * Create fixed navigation row with Home and Back buttons
 * @returns {Array} Array with Home and Back buttons
 */
function createNavigationRow() {
  return [
    Markup.button.callback('🏠 Home', 'nav_home'),
    Markup.button.callback('◀️ Back', 'nav_back'),
  ];
}

/**
 * Add navigation history entry for user
 * @param {number} telegramUserId - Telegram user ID
 * @param {string} screenId - Screen identifier (e.g., 'product_list', 'checkout')
 */
function addNavigationHistory(telegramUserId, screenId) {
  if (!telegramUserId || !screenId) {
    logger.warn('Invalid navigation history entry', { telegramUserId, screenId });
    return;
  }

  if (!navigationHistory.has(telegramUserId)) {
    navigationHistory.set(telegramUserId, []);
  }

  const history = navigationHistory.get(telegramUserId);
  history.push(screenId);

  // Limit history to last 10 screens
  if (history.length > 10) {
    history.shift();
  }

  logger.debug('Navigation history updated', {
    telegramUserId,
    screenId,
    historyLength: history.length,
  });
}

/**
 * Get previous screen from navigation history
 * @param {number} telegramUserId - Telegram user ID
 * @returns {string|null} Previous screen ID or null if no history
 */
function getPreviousScreen(telegramUserId) {
  if (!telegramUserId || !navigationHistory.has(telegramUserId)) {
    return null;
  }

  const history = navigationHistory.get(telegramUserId);
  if (history.length < 2) {
    return null;
  }

  // Return second-to-last screen (last is current)
  return history[history.length - 2];
}

/**
 * Clear navigation history for user
 * @param {number} telegramUserId - Telegram user ID
 */
function clearNavigationHistory(telegramUserId) {
  if (telegramUserId) {
    navigationHistory.delete(telegramUserId);
    logger.debug('Navigation history cleared', { telegramUserId });
  }
}

/**
 * Get current screen from navigation history
 * @param {number} telegramUserId - Telegram user ID
 * @returns {string|null} Current screen ID or null if no history
 */
function getCurrentScreen(telegramUserId) {
  if (!telegramUserId || !navigationHistory.has(telegramUserId)) {
    return null;
  }

  const history = navigationHistory.get(telegramUserId);
  return history.length > 0 ? history[history.length - 1] : null;
}

module.exports = {
  createNavigationRow,
  addNavigationHistory,
  getPreviousScreen,
  getCurrentScreen,
  clearNavigationHistory,
};
