/**
 * Unit tests for errors module (T154)
 */

const {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  DatabaseError,
  PaymentGatewayError,
  asyncHandler,
} = require('../../../../src/lib/shared/errors');

describe('Error Classes', () => {
  describe('AppError', () => {
    it('should create error with default values', () => {
      const error = new AppError('Test error');
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('INTERNAL_ERROR');
      expect(error.isOperational).toBe(true);
    });

    it('should create error with custom values', () => {
      const error = new AppError('Test error', 400, 'CUSTOM_ERROR', { field: 'test' });
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('CUSTOM_ERROR');
      expect(error.details).toEqual({ field: 'test' });
    });

    it('should have correct name', () => {
      const error = new AppError('Test');
      expect(error.name).toBe('AppError');
    });
  });

  describe('ValidationError', () => {
    it('should create validation error with 400 status', () => {
      const error = new ValidationError('Invalid input');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.message).toBe('Invalid input');
    });

    it('should accept details', () => {
      const error = new ValidationError('Invalid input', { field: 'email' });
      expect(error.details).toEqual({ field: 'email' });
    });
  });

  describe('NotFoundError', () => {
    it('should create not found error with 404 status', () => {
      const error = new NotFoundError();
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
    });

    it('should accept custom message', () => {
      const error = new NotFoundError('Custom not found');
      expect(error.message).toBe('Custom not found');
    });
  });

  describe('UnauthorizedError', () => {
    it('should create unauthorized error with 401 status', () => {
      const error = new UnauthorizedError();
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('DatabaseError', () => {
    it('should create database error with 500 status', () => {
      const error = new DatabaseError();
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('DATABASE_ERROR');
    });
  });

  describe('PaymentGatewayError', () => {
    it('should create payment gateway error with 502 status', () => {
      const error = new PaymentGatewayError();
      expect(error.statusCode).toBe(502);
      expect(error.code).toBe('PAYMENT_GATEWAY_ERROR');
    });
  });
});

describe('asyncHandler', () => {
  it('should handle successful async function', async () => {
    const req = {};
    const res = { json: jest.fn() };
    const next = jest.fn();

    const handler = asyncHandler(async (req, res) => {
      res.json({ success: true });
    });

    await handler(req, res, next);

    expect(res.json).toHaveBeenCalledWith({ success: true });
    expect(next).not.toHaveBeenCalled();
  });

  it('should catch and forward errors', async () => {
    const req = {};
    const res = {};
    const next = jest.fn();
    const testError = new Error('Test error');

    const handler = asyncHandler(async () => {
      throw testError;
    });

    await handler(req, res, next);

    expect(next).toHaveBeenCalledWith(testError);
  });

  it('should wrap function in Promise.resolve', async () => {
    const req = {};
    const res = {};
    const next = jest.fn();
    let resultValue = null;

    const handler = asyncHandler((_req, _res) => {
      resultValue = 'success';
      return 'success';
    });

    // Handler should return undefined (Promise.resolve doesn't return the promise)
    // But the function should execute
    handler(req, res, next);

    // Wait a bit for the promise to execute
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(resultValue).toBe('success');
  });
});
