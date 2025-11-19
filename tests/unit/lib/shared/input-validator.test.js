/**
 * Unit tests for input-validator module (T154)
 */

const {
  validateTelegramUserId,
  validateProductId,
  sanitizeString,
  validateWebhookPayload,
} = require('../../../../src/lib/shared/input-validator');
const { ValidationError } = require('../../../../src/lib/shared/errors');

describe('input-validator', () => {
  describe('validateTelegramUserId()', () => {
    it('should validate positive integer Telegram ID', () => {
      expect(() => validateTelegramUserId(123456789)).not.toThrow();
      expect(validateTelegramUserId(123456789)).toBe(123456789);
    });

    it('should throw ValidationError for negative ID', () => {
      expect(() => validateTelegramUserId(-1)).toThrow(ValidationError);
    });

    it('should throw ValidationError for zero', () => {
      expect(() => validateTelegramUserId(0)).toThrow(ValidationError);
    });

    it('should parse float to integer (parseInt behavior)', () => {
      // parseInt(123.45) = 123, so it doesn't throw
      expect(() => validateTelegramUserId(123.45)).not.toThrow();
      expect(validateTelegramUserId(123.45)).toBe(123);
    });

    it('should throw ValidationError for NaN', () => {
      expect(() => validateTelegramUserId('invalid')).toThrow(ValidationError);
    });
  });

  describe('validateProductId()', () => {
    it('should validate positive integer product ID', () => {
      expect(() => validateProductId(1)).not.toThrow();
    });

    it('should throw ValidationError for negative ID', () => {
      expect(() => validateProductId(-1)).toThrow(ValidationError);
    });

    it('should throw ValidationError for zero', () => {
      expect(() => validateProductId(0)).toThrow(ValidationError);
    });
  });

  describe('sanitizeString()', () => {
    it('should trim whitespace', () => {
      const input = '  Hello World  ';
      const sanitized = sanitizeString(input);
      expect(sanitized).toBe('Hello World');
    });

    it('should remove null bytes', () => {
      const input = 'Hello\0World';
      const sanitized = sanitizeString(input);
      expect(sanitized).toBe('HelloWorld');
    });

    it('should limit length if maxLength specified', () => {
      const input = 'A'.repeat(100);
      const sanitized = sanitizeString(input, { maxLength: 10 });
      expect(sanitized.length).toBe(10);
    });

    it('should handle empty string', () => {
      const sanitized = sanitizeString('');
      expect(sanitized).toBe('');
    });

    it('should handle non-string input', () => {
      const sanitized = sanitizeString(null);
      expect(sanitized).toBe('');
    });
  });

  describe('validateWebhookPayload()', () => {
    it('should validate payload with all required fields', () => {
      const payload = {
        transactionId: 'tx123',
        orderId: 'order123',
        status: 'paid',
        amount: 100000,
      };

      expect(() =>
        validateWebhookPayload(payload, ['transactionId', 'orderId', 'status', 'amount'])
      ).not.toThrow();
    });

    it('should throw ValidationError for missing required field', () => {
      const payload = {
        transactionId: 'tx123',
        orderId: 'order123',
        // status missing
        amount: 100000,
      };

      expect(() =>
        validateWebhookPayload(payload, ['transactionId', 'orderId', 'status', 'amount'])
      ).toThrow(ValidationError);
    });

    it('should not throw for empty string field (validation only checks presence)', () => {
      const payload = {
        transactionId: '',
        orderId: 'order123',
        status: 'paid',
        amount: 100000,
      };

      // validateWebhookPayload only checks if field exists, not if it's empty
      expect(() =>
        validateWebhookPayload(payload, ['transactionId', 'orderId', 'status', 'amount'])
      ).not.toThrow();
    });

    it('should handle empty required fields array', () => {
      const payload = { any: 'data' };
      expect(() => validateWebhookPayload(payload, [])).not.toThrow();
    });
  });
});
