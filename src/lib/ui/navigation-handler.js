/**
 * Navigation Handler - Fixed navigation buttons (Home/Help/Back) management
 *
 * Task: T035, T040, T032, T033, T037
 * Requirements: FR-003, FR-004, FR-005, FR-006
 * Feature: 002-friday-enhancement, 003-enhanced-keyboard
 */

const { Markup } = require('telegraf');
const logger = require('../shared/logger').child('navigation-handler');

// Navigation history storage (in-memory, per user)
const navigationHistory = new Map();

/**
 * Create fixed navigation row with Home, Help, and Back buttons (T033, FR-003, FR-005)
 * @param {Object} options - Options
 * @param {boolean} options.isMainMenu - Whether this is the main menu (affects Back button)
 * @returns {Array} Array with Home, Help, and Back buttons
 */
function createNavigationRow(options = {}) {
  const { isMainMenu = false } = options;

  const buttons = [
    Markup.button.callback('🏠 Home', 'nav_home'),
    Markup.button.callback('❓ Help', 'nav_help'), // T033: Add Help button (FR-003, FR-005)
  ];

  // T037: Check if Back button should be disabled at main menu (FR-006)
  if (isMainMenu) {
    // At main menu, Back button is disabled (or we could omit it)
    // For now, we'll include it but mark it as disabled via callback handling
    buttons.push(Markup.button.callback('◀️ Back', 'nav_back'));
  } else {
    buttons.push(Markup.button.callback('◀️ Back', 'nav_back'));
  }

  return buttons;
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

/**
 * Check if user is at main menu (T037, FR-006)
 * @param {number} telegramUserId - Telegram user ID
 * @returns {boolean} True if user is at main menu (no previous screen)
 */
function isMainMenu(telegramUserId) {
  if (!telegramUserId || !navigationHistory.has(telegramUserId)) {
    return true; // No history = main menu
  }

  const history = navigationHistory.get(telegramUserId);
  // If history has only 1 entry or is empty, user is at main menu
  return history.length <= 1;
}

module.exports = {
  createNavigationRow,
  addNavigationHistory,
  getPreviousScreen,
  getCurrentScreen,
  clearNavigationHistory,
  isMainMenu, // Export for checking main menu state
};
