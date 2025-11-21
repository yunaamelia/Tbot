/**
 * FRIDAY Persona Service
 * Provides time-based personalized greetings with FRIDAY AI assistant persona
 *
 * Task: T022, T024, T025
 * Requirements: FR-001, FR-002
 * Feature: 002-friday-enhancement
 */

const { getGreetingTemplate } = require('./greeting-templates');
const { formatGreeting } = require('./persona-formatter');
const { ValidationError } = require('../shared/errors');
const logger = require('../shared/logger').child('friday-persona');

/**
 * Determine current time of day based on server time
 * @returns {string} One of: 'morning', 'afternoon', 'evening', 'night'
 */
function getTimeOfDay() {
  const now = new Date();
  const hour = now.getUTCHours(); // Use UTC for consistency

  if (hour >= 6 && hour < 12) {
    return 'morning';
  } else if (hour >= 12 && hour < 18) {
    return 'afternoon';
  } else if (hour >= 18 && hour < 24) {
    return 'evening';
  } else {
    // 0:00 - 5:59
    return 'night';
  }
}

/**
 * Get personalized FRIDAY greeting based on time of day
 * @param {number} telegramUserId - Telegram user ID
 * @param {string} timeOfDay - Optional override time of day ('morning', 'afternoon', 'evening', 'night')
 * @returns {Promise<string>} Personalized greeting message
 * @throws {ValidationError} If telegramUserId is invalid
 */
async function getGreeting(telegramUserId, timeOfDay = null) {
  try {
    // Validate telegramUserId
    if (!telegramUserId || typeof telegramUserId !== 'number' || telegramUserId <= 0) {
      throw new ValidationError('Invalid telegram user ID');
    }

    // Determine time of day if not provided
    const currentTimeOfDay = timeOfDay || getTimeOfDay();

    // Validate timeOfDay if provided
    const validTimeOfDays = ['morning', 'afternoon', 'evening', 'night'];
    if (timeOfDay && !validTimeOfDays.includes(timeOfDay)) {
      logger.warn('Invalid timeOfDay provided, using current time', { timeOfDay });
      const actualTimeOfDay = getTimeOfDay();
      return getGreeting(telegramUserId, actualTimeOfDay);
    }

    // Get greeting template
    const template = getGreetingTemplate(currentTimeOfDay);

    // Format greeting with FRIDAY persona
    const greeting = formatGreeting(template.greeting, template.message);

    logger.info('FRIDAY greeting generated', {
      telegramUserId,
      timeOfDay: currentTimeOfDay,
    });

    return greeting;
  } catch (error) {
    logger.error('Error generating FRIDAY greeting', error, { telegramUserId, timeOfDay });
    throw error;
  }
}

/**
 * Format a message with FRIDAY persona style
 * @param {string} text - Message text to format
 * @param {Object} options - Formatting options
 * @param {boolean} options.includeGreeting - Include time-based greeting (default: false)
 * @param {string} options.tone - Override tone ('professional', 'friendly', 'assistant')
 * @returns {string} Formatted message
 */
function formatMessage(text, options = {}) {
  const { formatMessage: format } = require('./persona-formatter');
  return format(text, options);
}

module.exports = {
  getGreeting,
  getTimeOfDay,
  formatMessage,
};
