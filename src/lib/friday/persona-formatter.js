/**
 * FRIDAY persona message formatter
 * Formats messages with FRIDAY AI assistant style (Iron Man style)
 *
 * Task: T021
 * Requirements: FR-002
 * Feature: 002-friday-enhancement
 */

const logger = require('../shared/logger').child('friday-formatter');

/**
 * Format message with FRIDAY persona style
 * @param {string} text - Message text to format
 * @param {Object} options - Formatting options
 * @param {boolean} options.includeGreeting - Include time-based greeting (default: false)
 * @param {string} options.tone - Override tone ('professional', 'friendly', 'assistant')
 * @returns {string} Formatted message
 */
function formatMessage(text, options = {}) {
  if (!text || typeof text !== 'string') {
    logger.warn('Invalid text provided to formatMessage', { text });
    return text || '';
  }

  const { tone = 'assistant' } = options;

  const formatted = text;

  // Apply FRIDAY persona characteristics
  // Professional yet friendly tone (Iron Man AI assistant style)
  if (tone === 'assistant' || tone === 'professional') {
    // Ensure message maintains professional yet friendly tone
    // This is mainly for consistency - actual templates already have the right tone
  }

  // If greeting should be included, it should be added by persona-service
  // This formatter just ensures consistency
  return formatted;
}

/**
 * Format greeting message with FRIDAY persona
 * @param {string} greeting - Time-based greeting (e.g., "Selamat pagi!")
 * @param {string} message - Main message
 * @returns {string} Formatted greeting message
 */
function formatGreeting(greeting, message) {
  if (!greeting || !message) {
    logger.warn('Invalid greeting or message provided', { greeting, message });
    return greeting || message || '';
  }

  // Combine greeting and message with FRIDAY persona style
  return `${greeting}\n\n${message}`;
}

module.exports = {
  formatMessage,
  formatGreeting,
};
