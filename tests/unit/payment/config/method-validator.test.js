/**
 * Unit tests for Payment Method Validator
 *
 * Task: T049
 * Requirements: FR-006, FR-007
 * Feature: 002-friday-enhancement
 */

const methodValidator = require('../../../../src/lib/payment/config/method-validator');

describe('Payment Method Validator', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Save original env
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original env
    process.env = { ...originalEnv };
  });

  describe('validateMethod()', () => {
    describe('QRIS validation', () => {
      test('should return true when all QRIS credentials are present', async () => {
        process.env.DUITKU_MERCHANT_CODE = 'test_merchant_code';
        process.env.DUITKU_API_KEY = 'test_api_key';
        process.env.DUITKU_CALLBACK_URL = 'https://example.com/callback';

        const isValid = await methodValidator.validateMethod('qris');
        expect(isValid).toBe(true);
      });

      test('should return false when QRIS merchant code is missing', async () => {
        delete process.env.DUITKU_MERCHANT_CODE;
        process.env.DUITKU_API_KEY = 'test_api_key';
        process.env.DUITKU_CALLBACK_URL = 'https://example.com/callback';

        const isValid = await methodValidator.validateMethod('qris');
        expect(isValid).toBe(false);
      });

      test('should return false when QRIS API key is missing', async () => {
        process.env.DUITKU_MERCHANT_CODE = 'test_merchant_code';
        delete process.env.DUITKU_API_KEY;
        process.env.DUITKU_CALLBACK_URL = 'https://example.com/callback';

        const isValid = await methodValidator.validateMethod('qris');
        expect(isValid).toBe(false);
      });

      test('should return false when QRIS callback URL is missing', async () => {
        process.env.DUITKU_MERCHANT_CODE = 'test_merchant_code';
        process.env.DUITKU_API_KEY = 'test_api_key';
        delete process.env.DUITKU_CALLBACK_URL;

        const isValid = await methodValidator.validateMethod('qris');
        expect(isValid).toBe(false);
      });
    });

    describe('E-Wallet validation', () => {
      test('should return true when all E-Wallet credentials are present', async () => {
        process.env.E_WALLET_NAME = 'OVO';
        process.env.E_WALLET_NUMBER = '081234567890';
        process.env.E_WALLET_HOLDER = 'Test Owner';

        const isValid = await methodValidator.validateMethod('ewallet');
        expect(isValid).toBe(true);
      });

      test('should return false when E-Wallet name is missing', async () => {
        delete process.env.E_WALLET_NAME;
        process.env.E_WALLET_NUMBER = '081234567890';
        process.env.E_WALLET_HOLDER = 'Test Owner';

        const isValid = await methodValidator.validateMethod('ewallet');
        expect(isValid).toBe(false);
      });

      test('should return false when E-Wallet number is missing', async () => {
        process.env.E_WALLET_NAME = 'OVO';
        delete process.env.E_WALLET_NUMBER;
        process.env.E_WALLET_HOLDER = 'Test Owner';

        const isValid = await methodValidator.validateMethod('ewallet');
        expect(isValid).toBe(false);
      });

      test('should return false when E-Wallet holder is missing', async () => {
        process.env.E_WALLET_NAME = 'OVO';
        process.env.E_WALLET_NUMBER = '081234567890';
        delete process.env.E_WALLET_HOLDER;

        const isValid = await methodValidator.validateMethod('ewallet');
        expect(isValid).toBe(false);
      });
    });

    describe('Bank Transfer validation', () => {
      test('should return true when all Bank credentials are present', async () => {
        process.env.BANK_NAME = 'Bank BCA';
        process.env.BANK_ACCOUNT_NUMBER = '1234567890';
        process.env.BANK_ACCOUNT_HOLDER = 'Test Account Holder';

        const isValid = await methodValidator.validateMethod('bank');
        expect(isValid).toBe(true);
      });

      test('should return false when Bank name is missing', async () => {
        delete process.env.BANK_NAME;
        process.env.BANK_ACCOUNT_NUMBER = '1234567890';
        process.env.BANK_ACCOUNT_HOLDER = 'Test Account Holder';

        const isValid = await methodValidator.validateMethod('bank');
        expect(isValid).toBe(false);
      });

      test('should return false when Bank account number is missing', async () => {
        process.env.BANK_NAME = 'Bank BCA';
        delete process.env.BANK_ACCOUNT_NUMBER;
        process.env.BANK_ACCOUNT_HOLDER = 'Test Account Holder';

        const isValid = await methodValidator.validateMethod('bank');
        expect(isValid).toBe(false);
      });

      test('should return false when Bank account holder is missing', async () => {
        process.env.BANK_NAME = 'Bank BCA';
        process.env.BANK_ACCOUNT_NUMBER = '1234567890';
        delete process.env.BANK_ACCOUNT_HOLDER;

        const isValid = await methodValidator.validateMethod('bank');
        expect(isValid).toBe(false);
      });
    });

    describe('Invalid method type', () => {
      test('should throw ValidationError for invalid method type', async () => {
        await expect(methodValidator.validateMethod('invalid_type')).rejects.toThrow();
      });

      test('should throw ValidationError for empty string', async () => {
        await expect(methodValidator.validateMethod('')).rejects.toThrow();
      });

      test('should throw ValidationError for null', async () => {
        await expect(methodValidator.validateMethod(null)).rejects.toThrow();
      });
    });
  });
});
