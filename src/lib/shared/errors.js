/**
 * Base error handling middleware and custom error classes
 * Comprehensive error handling for all bot operations (FR-036, Article X)
 */

const logger = require('./logger').child('errors');
const i18n = require('./i18n');

/**
 * Base application error class
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = {}) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error
 */
class ValidationError extends AppError {
  constructor(message, details = {}) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

/**
 * Not found error
 */
class NotFoundError extends AppError {
  constructor(message = i18n.t('error_not_found'), details = {}) {
    super(message, 404, 'NOT_FOUND', details);
  }
}

/**
 * Unauthorized error
 */
class UnauthorizedError extends AppError {
  constructor(message = i18n.t('error_unauthorized'), details = {}) {
    super(message, 401, 'UNAUTHORIZED', details);
  }
}

/**
 * Database error
 */
class DatabaseError extends AppError {
  constructor(message = i18n.t('error_database'), details = {}) {
    super(message, 500, 'DATABASE_ERROR', details);
  }
}

/**
 * Payment gateway error
 */
class PaymentGatewayError extends AppError {
  constructor(message = i18n.t('error_payment_gateway'), details = {}) {
    super(message, 502, 'PAYMENT_GATEWAY_ERROR', details);
  }
}

/**
 * Error handler middleware for Express
 */
function errorHandler(err, req, res, _next) {
  // Log error with structured logging
  logger.error('Error occurred', err, {
    path: req.path,
    method: req.method,
    statusCode: err.statusCode || 500,
    code: err.code || 'UNKNOWN_ERROR',
  });

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';

  const errorResponse = {
    error: {
      message: err.isOperational ? err.message : i18n.t('error_generic'),
      code: err.code || 'INTERNAL_ERROR',
    },
  };

  if (isDevelopment) {
    errorResponse.error.stack = err.stack;
    errorResponse.error.details = err.details;
  }

  res.status(err.statusCode || 500).json(errorResponse);
}

/**
 * Async error wrapper for route handlers
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  DatabaseError,
  PaymentGatewayError,
  errorHandler,
  asyncHandler,
};
