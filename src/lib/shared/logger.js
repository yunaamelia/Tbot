/**
 * Structured logging utility for debugging and monitoring (FR-037, Article X)
 * Provides structured logging with log levels and context
 */

const config = require('./config');

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

const LOG_LEVEL_NAMES = ['ERROR', 'WARN', 'INFO', 'DEBUG'];

class Logger {
  constructor(context = '') {
    this.context = context;
    this.logLevel = this._getLogLevel();
  }

  _getLogLevel() {
    const levelName = config.get('LOG_LEVEL', 'info').toUpperCase();
    return LOG_LEVELS[levelName] !== undefined ? LOG_LEVELS[levelName] : LOG_LEVELS.INFO;
  }

  _shouldLog(level) {
    return level <= this.logLevel;
  }

  _formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const levelName = LOG_LEVEL_NAMES[level];
    const context = this.context ? `[${this.context}]` : '';

    // Sanitize meta to remove credentials (T137, FR-044)
    const sanitizedMeta = this._sanitizeMeta(meta);

    return {
      timestamp,
      level: levelName,
      context,
      message,
      ...sanitizedMeta,
    };
  }

  /**
   * Sanitize metadata to remove credentials and secrets (T137, FR-044)
   * @param {Object} meta Metadata object
   * @returns {Object} Sanitized metadata
   */
  _sanitizeMeta(meta) {
    if (!meta || typeof meta !== 'object') {
      return meta;
    }

    const sanitized = { ...meta };
    const sensitiveKeys = [
      'credentials',
      'credential',
      'password',
      'secret',
      'apiKey',
      'api_key',
      'token',
      'accessToken',
      'access_token',
      'account_credentials',
      'encryptedCredentials',
      'plaintext',
    ];

    for (const key of Object.keys(sanitized)) {
      const lowerKey = key.toLowerCase();
      if (
        sensitiveKeys.some((sensitive) => lowerKey.includes(sensitive)) ||
        typeof sanitized[key] === 'string' ||
        sanitized[key] === null
      ) {
        // Check if value looks like credentials (contains common patterns)
        if (
          typeof sanitized[key] === 'string' &&
          (sanitized[key].includes('@') ||
            sanitized[key].includes('://') ||
            sanitized[key].length > 20)
        ) {
          sanitized[key] = '[REDACTED]';
        }
      }

      // Recursively sanitize nested objects
      if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this._sanitizeMeta(sanitized[key]);
      }
    }

    return sanitized;
  }

  _log(level, message, meta = {}) {
    if (!this._shouldLog(level)) return;

    const logEntry = this._formatMessage(level, message, meta);

    // In production, use structured JSON logging
    // eslint-disable-next-line no-console
    if (config.get('NODE_ENV') === 'production') {
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(logEntry));
    } else {
      // In development, use readable format
      const prefix = `[${logEntry.timestamp}] ${logEntry.level} ${logEntry.context}`;
      // eslint-disable-next-line no-console
      console.log(prefix, message, Object.keys(meta).length > 0 ? meta : '');
    }
  }

  error(message, error = null, meta = {}) {
    const errorMeta = {
      ...meta,
    };

    if (error) {
      errorMeta.error = {
        message: error.message,
        stack: error.stack,
        name: error.name,
      };
    }

    this._log(LOG_LEVELS.ERROR, message, errorMeta);
  }

  warn(message, meta = {}) {
    this._log(LOG_LEVELS.WARN, message, meta);
  }

  info(message, meta = {}) {
    this._log(LOG_LEVELS.INFO, message, meta);
  }

  debug(message, meta = {}) {
    this._log(LOG_LEVELS.DEBUG, message, meta);
  }

  /**
   * Create child logger with additional context
   * @param {string} context Additional context
   * @returns {Logger} Child logger instance
   */
  child(context) {
    const childContext = this.context ? `${this.context}:${context}` : context;
    return new Logger(childContext);
  }
}

// Default logger instance
const defaultLogger = new Logger();

module.exports = defaultLogger;
module.exports.Logger = Logger;
