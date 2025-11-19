/**
 * Input validation and sanitization utility (FR-043, Article XII)
 * Validates and sanitizes all external input (user messages, webhook callbacks, admin commands)
 */

const logger = require('./logger').child('validator');
const { ValidationError } = require('./errors');

/**
 * Sanitize string input
 * @param {string} input Input string
 * @param {Object} options Sanitization options
 * @returns {string} Sanitized string
 */
function sanitizeString(input, options = {}) {
  if (typeof input !== 'string') {
    return '';
  }

  let sanitized = input.trim();

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Limit length if specified
  if (options.maxLength && sanitized.length > options.maxLength) {
    sanitized = sanitized.substring(0, options.maxLength);
  }

  return sanitized;
}

/**
 * Validate and sanitize Telegram user ID
 * @param {any} userId User ID
 * @returns {number} Validated user ID
 * @throws {ValidationError} If invalid
 */
function validateTelegramUserId(userId) {
  const id = parseInt(userId, 10);
  if (isNaN(id) || id <= 0) {
    throw new ValidationError('Invalid Telegram user ID', { userId });
  }
  return id;
}

/**
 * Validate and sanitize product ID
 * @param {any} productId Product ID
 * @returns {number} Validated product ID
 * @throws {ValidationError} If invalid
 */
function validateProductId(productId) {
  const id = parseInt(productId, 10);
  if (isNaN(id) || id <= 0) {
    throw new ValidationError('Invalid product ID', { productId });
  }
  return id;
}

/**
 * Validate and sanitize order ID
 * @param {any} orderId Order ID
 * @returns {number} Validated order ID
 * @throws {ValidationError} If invalid
 */
function validateOrderId(orderId) {
  const id = parseInt(orderId, 10);
  if (isNaN(id) || id <= 0) {
    throw new ValidationError('Invalid order ID', { orderId });
  }
  return id;
}

/**
 * Validate and sanitize quantity
 * @param {any} quantity Quantity
 * @param {number} min Minimum value (default: 1)
 * @param {number} max Maximum value (optional)
 * @returns {number} Validated quantity
 * @throws {ValidationError} If invalid
 */
function validateQuantity(quantity, min = 1, max = undefined) {
  const qty = parseInt(quantity, 10);
  if (isNaN(qty) || qty < min) {
    throw new ValidationError(`Quantity must be at least ${min}`, { quantity });
  }
  if (max !== undefined && qty > max) {
    throw new ValidationError(`Quantity must be at most ${max}`, { quantity });
  }
  return qty;
}

/**
 * Validate and sanitize price
 * @param {any} price Price
 * @returns {number} Validated price
 * @throws {ValidationError} If invalid
 */
function validatePrice(price) {
  const p = parseFloat(price);
  if (isNaN(p) || p < 0) {
    throw new ValidationError('Price must be a positive number', { price });
  }
  return p;
}

/**
 * Validate callback data format
 * @param {string} callbackData Callback data from Telegram
 * @returns {Object} Parsed callback data
 * @throws {ValidationError} If invalid
 */
function validateCallbackData(callbackData) {
  if (typeof callbackData !== 'string' || callbackData.length > 64) {
    throw new ValidationError('Invalid callback data format', { callbackData });
  }

  // Sanitize callback data
  const sanitized = sanitizeString(callbackData, { maxLength: 64 });

  return sanitized;
}

/**
 * Validate webhook payload structure
 * @param {Object} payload Webhook payload
 * @param {Array<string>} requiredFields Required field names
 * @returns {Object} Validated payload
 * @throws {ValidationError} If invalid
 */
function validateWebhookPayload(payload, requiredFields = []) {
  if (!payload || typeof payload !== 'object') {
    throw new ValidationError('Invalid webhook payload: must be an object');
  }

  for (const field of requiredFields) {
    if (!(field in payload)) {
      throw new ValidationError(`Missing required field: ${field}`, { payload });
    }
  }

  return payload;
}

/**
 * Sanitize user message text
 * @param {string} text Message text
 * @returns {string} Sanitized text
 */
function sanitizeMessageText(text) {
  return sanitizeString(text, { maxLength: 4096 }); // Telegram message limit
}

module.exports = {
  sanitizeString,
  validateTelegramUserId,
  validateProductId,
  validateOrderId,
  validateQuantity,
  validatePrice,
  validateCallbackData,
  validateWebhookPayload,
  sanitizeMessageText,
};

