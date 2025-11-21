/**
 * Interaction logging service for tracking user interactions with inline keyboards
 * Implements logging, response time tracking, and error logging
 *
 * Tasks: T096, T098, T099
 * Requirements: FR-019, FR-020, FR-021
 * Feature: 003-enhanced-keyboard
 */

const dbConnection = require('../database/db-connection');
const roleFilter = require('../security/role-filter');
const logger = require('../shared/logger').child('interaction-logger');
const { ValidationError } = require('../shared/errors');

/**
 * Logs a user interaction to the database
 * @param {object} interactionData Interaction data to log
 * @param {number} interactionData.telegramUserId Telegram user ID (required)
 * @param {string} interactionData.buttonId Button identifier (callback_data) (required)
 * @param {string} interactionData.buttonLabel Button label text (required)
 * @param {number} interactionData.responseTimeMs Response time in milliseconds (required)
 * @param {string} [interactionData.menuContext] Menu context (e.g., 'main', 'products')
 * @param {string} [interactionData.userRole] User role ('admin' or 'regular') - auto-detected if not provided
 * @param {object} [interactionData.metadata] Additional context (error details, pagination info, etc.)
 * @param {boolean} [interactionData.success=true] Whether interaction succeeded
 * @param {Error} [interactionData.error] Error object if interaction failed
 * @returns {Promise<number>} Log entry ID
 */
async function logInteraction(interactionData) {
  const {
    telegramUserId,
    buttonId,
    buttonLabel,
    responseTimeMs,
    menuContext,
    userRole: providedUserRole,
    metadata,
    success = true,
    error,
  } = interactionData;

  // Validate required fields
  if (!telegramUserId || typeof telegramUserId !== 'number' || telegramUserId <= 0) {
    throw new ValidationError('telegramUserId is required and must be a positive integer');
  }

  if (!buttonId || typeof buttonId !== 'string' || buttonId.length === 0) {
    throw new ValidationError('buttonId is required and must be a non-empty string');
  }

  if (!buttonLabel || typeof buttonLabel !== 'string' || buttonLabel.length === 0) {
    throw new ValidationError('buttonLabel is required and must be a non-empty string');
  }

  if (
    typeof responseTimeMs !== 'number' ||
    responseTimeMs < 0 ||
    !Number.isInteger(responseTimeMs)
  ) {
    throw new ValidationError('responseTimeMs is required and must be a non-negative integer');
  }

  try {
    // Auto-detect user role if not provided
    let userRole = providedUserRole;
    if (!userRole) {
      try {
        const roleData = await roleFilter.getUserRole(telegramUserId);
        userRole = roleData.role;
      } catch (roleError) {
        // If role detection fails, continue without role (non-critical)
        logger.debug('Failed to detect user role for interaction log', {
          telegramUserId,
          error: roleError.message,
        });
        userRole = null;
      }
    }

    // Prepare error message and metadata
    let errorMessage = null;
    let logMetadata = metadata || null;

    if (error) {
      errorMessage = error.message || error.toString();
      // Include error stack trace in metadata if available
      logMetadata = {
        ...(metadata || {}),
        error: {
          message: error.message,
          name: error.name,
          stack: error.stack,
        },
      };
    }

    // Prepare database record
    const logRecord = {
      telegram_user_id: telegramUserId,
      button_id: buttonId,
      button_label: buttonLabel,
      response_time_ms: responseTimeMs,
      timestamp: new Date(),
      menu_context: menuContext || null,
      user_role: userRole || null,
      metadata: logMetadata ? JSON.stringify(logMetadata) : null,
      success: success,
      error_message: errorMessage,
    };

    // Insert into database
    const db = dbConnection.getDb();
    const [insertedRecord] = await db('interaction_logs').insert(logRecord).returning('id');

    logger.debug('Interaction logged successfully', {
      telegramUserId,
      buttonId,
      buttonLabel,
      responseTimeMs,
      logId: insertedRecord.id,
    });

    return insertedRecord.id;
  } catch (error) {
    // Log error but don't throw (non-critical operation)
    logger.error('Failed to log interaction', error, {
      telegramUserId,
      buttonId,
      buttonLabel,
    });
    // Return null instead of throwing to avoid disrupting user interaction
    return null;
  }
}

/**
 * Helper function to track response time for an async operation
 * @param {Function} fn Async function to track
 * @param {object} context Context data (telegramUserId, buttonId, buttonLabel, etc.)
 * @returns {Promise<any>} Result of the function
 */
async function trackResponseTime(fn, context) {
  const startTime = Date.now();
  let success = true;
  let error = null;

  try {
    const result = await fn();
    return result;
  } catch (err) {
    success = false;
    error = err;
    throw err;
  } finally {
    const responseTime = Date.now() - startTime;
    // Log interaction asynchronously (don't await to avoid blocking)
    logInteraction({
      ...context,
      responseTimeMs: responseTime,
      success,
      error,
    }).catch((logError) => {
      // Silently ignore logging errors
      logger.debug('Failed to log interaction in trackResponseTime', {
        error: logError.message,
      });
    });
  }
}

module.exports = {
  logInteraction,
  trackResponseTime,
};
