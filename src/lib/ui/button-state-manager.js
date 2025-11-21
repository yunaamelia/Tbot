/**
 * Button State Manager - Manages button states for visual feedback
 *
 * Tasks: T067, T068, T069, T070, T071, T073, T074, T075, T076, T077, T078
 * Requirements: FR-014, FR-015
 * Feature: 003-enhanced-keyboard
 */

const redisClient = require('../shared/redis-client');
const logger = require('../shared/logger').child('button-state-manager');

const STATE_KEY_PREFIX = 'button:state:';
const DEFAULT_TIMEOUT_SECONDS = 30;
const DEFAULT_LOADING_TEXT = '⏳ Processing...';
const SUCCESS_EMOJI = '✅';
const ERROR_EMOJI = '❌';

/**
 * Generate Redis key for button state
 * @param {string} buttonId - Button callback data
 * @param {number} userId - Telegram user ID
 * @returns {string} Redis key
 */
function getStateKey(buttonId, userId) {
  return `${STATE_KEY_PREFIX}${userId}:${buttonId}`;
}

/**
 * Disable a button and show loading indicator (T067, T073, FR-014)
 * @param {string} buttonId - Button callback data
 * @param {number} userId - Telegram user ID
 * @param {Object} options - Options
 * @param {string} options.loadingText - Loading text (default: '⏳ Processing...')
 * @param {number} options.timeoutSeconds - Timeout in seconds (default: 30)
 * @returns {Promise<void>}
 */
async function disableButton(buttonId, userId, options = {}) {
  const { loadingText = DEFAULT_LOADING_TEXT, timeoutSeconds = DEFAULT_TIMEOUT_SECONDS } = options;

  try {
    const redis = redisClient.getRedis();
    if (!redis) {
      // Skip Redis if unavailable
      logger.debug('Skipping Redis state storage (Redis unavailable)', {
        buttonId,
        userId,
      });
      return;
    }

    // Check if Redis is connected before accessing
    if (redis.status !== 'ready') {
      logger.debug('Skipping Redis state storage (Redis not ready)', {
        buttonId,
        userId,
        redisStatus: redis.status,
      });
      return;
    }

    const stateKey = getStateKey(buttonId, userId);
    const stateData = {
      state: 'processing',
      loadingText,
      timestamp: Date.now(),
      timeoutSeconds, // Store timeout for expiration check
      buttonId,
      userId,
    };

    await redis.set(stateKey, JSON.stringify(stateData), 'EX', timeoutSeconds);
    logger.debug('Button disabled and state stored', {
      buttonId,
      userId,
      timeoutSeconds,
    });
  } catch (error) {
    // Handle Redis connection errors gracefully (non-blocking)
    if (error.message && error.message.includes('writeable')) {
      // Redis unavailable - this is expected in some cases
      logger.debug('Skipping Redis state storage (Redis unavailable)', {
        buttonId,
        userId,
        error: error.message,
      });
      return;
    }

    // Other errors - log as warning
    logger.warn('Failed to disable button state in Redis', {
      buttonId,
      userId,
      error: error.message,
    });
  }
}

/**
 * Enable a button and show result indicator (T068, T074, FR-015)
 * @param {string} buttonId - Button callback data
 * @param {number} userId - Telegram user ID
 * @param {Object} options - Options
 * @param {string} options.resultText - Result text
 * @param {boolean} options.success - Whether action succeeded (default: true)
 * @returns {Promise<void>}
 */
async function enableButton(buttonId, userId, options = {}) {
  const { resultText, success = true } = options;

  try {
    const redis = redisClient.getRedis();
    if (!redis) {
      // Skip Redis if unavailable
      logger.debug('Skipping Redis state removal (Redis unavailable)', {
        buttonId,
        userId,
      });
      return;
    }

    // Check if Redis is connected before accessing
    if (redis.status !== 'ready') {
      logger.debug('Skipping Redis state removal (Redis not ready)', {
        buttonId,
        userId,
        redisStatus: redis.status,
      });
      return;
    }

    const stateKey = getStateKey(buttonId, userId);
    await redis.del(stateKey);

    logger.debug('Button enabled and state removed', {
      buttonId,
      userId,
      resultText,
      success,
    });
  } catch (error) {
    // Handle Redis connection errors gracefully (non-blocking)
    if (error.message && error.message.includes('writeable')) {
      // Redis unavailable - this is expected in some cases
      logger.debug('Skipping Redis state removal (Redis unavailable)', {
        buttonId,
        userId,
        error: error.message,
      });
      return;
    }

    // Other errors - log as warning
    logger.warn('Failed to enable button state in Redis', {
      buttonId,
      userId,
      error: error.message,
    });
  }
}

/**
 * Check if a button is currently processing (T069, T076, FR-014)
 * @param {string} buttonId - Button callback data
 * @param {number} userId - Telegram user ID
 * @returns {Promise<boolean>} True if button is processing
 */
async function isButtonProcessing(buttonId, userId) {
  try {
    const redis = redisClient.getRedis();
    if (!redis) {
      // Skip Redis if unavailable
      return false;
    }

    // Check if Redis is connected before accessing
    if (redis.status !== 'ready') {
      logger.debug('Skipping button state check (Redis not ready)', {
        buttonId,
        userId,
        redisStatus: redis.status,
      });
      return false;
    }

    const stateKey = getStateKey(buttonId, userId);
    const stateJson = await redis.get(stateKey);

    if (!stateJson) {
      return false;
    }

    const stateData = JSON.parse(stateJson);

    // Check if state expired (fail-safe)
    const now = Date.now();
    const stateAge = now - stateData.timestamp;
    const timeoutMs = (stateData.timeoutSeconds || DEFAULT_TIMEOUT_SECONDS) * 1000;

    if (stateAge > timeoutMs) {
      // State expired, remove it
      try {
        await redis.del(stateKey);
        logger.debug('Button state expired and removed', { buttonId, userId, stateAge });
      } catch (delError) {
        // Ignore delete errors if Redis is unavailable
        logger.debug('Could not remove expired button state', {
          buttonId,
          userId,
          error: delError.message,
        });
      }
      return false;
    }

    return stateData.state === 'processing';
  } catch (error) {
    // Handle Redis connection errors gracefully (fail-safe: return false)
    if (error.message && error.message.includes('writeable')) {
      // Redis unavailable - this is expected in some cases
      logger.debug('Skipping button state check (Redis unavailable)', {
        buttonId,
        userId,
        error: error.message,
      });
      return false;
    }

    // Other errors - log as debug (not warning) since this is a fail-safe
    logger.debug('Failed to check button state, returning false (fail-safe)', {
      buttonId,
      userId,
      error: error.message,
    });
    return false;
  }
}

/**
 * Get button state from Redis (for testing/debugging)
 * @param {string} buttonId - Button callback data
 * @param {number} userId - Telegram user ID
 * @returns {Promise<Object|null>} Button state or null
 */
async function getButtonState(buttonId, userId) {
  try {
    const redis = redisClient.getRedis();
    if (!redis) {
      return null;
    }

    // Check if Redis is connected before accessing
    if (redis.status !== 'ready') {
      logger.debug('Skipping button state retrieval (Redis not ready)', {
        buttonId,
        userId,
        redisStatus: redis.status,
      });
      return null;
    }

    const stateKey = getStateKey(buttonId, userId);
    const stateJson = await redis.get(stateKey);

    if (!stateJson) {
      return null;
    }

    return JSON.parse(stateJson);
  } catch (error) {
    // Handle Redis connection errors gracefully
    if (error.message && error.message.includes('writeable')) {
      logger.debug('Skipping button state retrieval (Redis unavailable)', {
        buttonId,
        userId,
        error: error.message,
      });
      return null;
    }

    logger.warn('Failed to get button state', {
      buttonId,
      userId,
      error: error.message,
    });
    return null;
  }
}

/**
 * Clear button state (for testing/cleanup)
 * @param {string} buttonId - Button callback data
 * @param {number} userId - Telegram user ID (optional)
 * @returns {Promise<void>}
 */
async function clearButtonState(buttonId, userId = null) {
  try {
    const redis = redisClient.getRedis();
    if (!redis) {
      return;
    }

    // Check if Redis is connected before accessing
    if (redis.status !== 'ready') {
      logger.debug('Skipping button state cleanup (Redis not ready)', {
        buttonId,
        userId,
        redisStatus: redis.status,
      });
      return;
    }

    if (userId) {
      // Clear specific user's button state
      const stateKey = getStateKey(buttonId, userId);
      await redis.del(stateKey);
    } else {
      // Clear all button states for this button (pattern match)
      const pattern = `${STATE_KEY_PREFIX}*:${buttonId}`;
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    }

    logger.debug('Button state cleared', { buttonId, userId });
  } catch (error) {
    // Handle Redis connection errors gracefully
    if (error.message && error.message.includes('writeable')) {
      logger.debug('Skipping button state cleanup (Redis unavailable)', {
        buttonId,
        userId,
        error: error.message,
      });
      return;
    }

    logger.warn('Failed to clear button state', {
      buttonId,
      userId,
      error: error.message,
    });
  }
}

/**
 * Implement visual feedback on button click (T075, FR-015)
 * Updates button text with loading indicator and later with result
 * @param {string} originalText - Original button text
 * @param {string} loadingText - Loading text
 * @param {string} resultText - Result text
 * @param {boolean} success - Whether action succeeded
 * @returns {string} Updated button text
 */
function getButtonTextWithFeedback(originalText, loadingText, resultText, success) {
  if (loadingText) {
    return `${loadingText}`;
  }
  if (resultText) {
    const emoji = success ? SUCCESS_EMOJI : ERROR_EMOJI;
    return `${emoji} ${resultText}`;
  }
  return originalText;
}

module.exports = {
  disableButton,
  enableButton,
  isButtonProcessing,
  getButtonState,
  clearButtonState,
  getButtonTextWithFeedback,
  DEFAULT_LOADING_TEXT,
  SUCCESS_EMOJI,
  ERROR_EMOJI,
};
