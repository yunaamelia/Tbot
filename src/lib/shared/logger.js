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

    return {
      timestamp,
      level: levelName,
      context,
      message,
      ...meta,
    };
  }

  _log(level, message, meta = {}) {
    if (!this._shouldLog(level)) return;

    const logEntry = this._formatMessage(level, message, meta);

    // In production, use structured JSON logging
    if (config.get('NODE_ENV') === 'production') {
      console.log(JSON.stringify(logEntry));
    } else {
      // In development, use readable format
      const prefix = `[${logEntry.timestamp}] ${logEntry.level} ${logEntry.context}`;
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

