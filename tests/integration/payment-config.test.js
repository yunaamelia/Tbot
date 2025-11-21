/**
 * Integration tests for Dynamic Payment Method Selection (User Story 3)
 * Tests real Telegram Bot API interactions (Article IX)
 *
 * Tasks: T043, T044, T045, T046, T047, T048
 * Requirements: FR-006, FR-007, FR-008
 * Feature: 002-friday-enhancement
 */

const paymentConfig = require('../../src/lib/payment/config/payment-config');
const checkoutHandler = require('../../src/lib/order/checkout-handler');
const redisClient = require('../../src/lib/shared/redis-client');

describe('Dynamic Payment Method Selection Integration Tests', () => {
  const originalEnv = { ...process.env };

  beforeEach(async () => {
    // Clear cache before each test to ensure fresh state
    if (paymentConfig.refreshCache) {
      try {
        await paymentConfig.refreshCache();
      } catch (error) {
        // Ignore errors during setup
      }
    }
  });

  afterEach(async () => {
    // Clear cache and restore original environment
    if (paymentConfig.refreshCache) {
      try {
        await paymentConfig.refreshCache();
      } catch (error) {
        // Ignore errors during cleanup
      }
    }
    // Restore original environment
    process.env = { ...originalEnv };
  });

  afterAll(async () => {
    // Close Redis connection to prevent Jest from hanging
    try {
      await redisClient.closeRedis();
    } catch (error) {
      // Ignore errors during cleanup
    }
  });

  describe('Given payment methods are configured via environment variables', () => {
    test('When QRIS is fully configured, Then it appears in available payment methods', async () => {
      // Set QRIS environment variables
      process.env.DUITKU_MERCHANT_CODE = 'test_merchant_code';
      process.env.DUITKU_API_KEY = 'test_api_key';
      process.env.DUITKU_CALLBACK_URL = 'https://example.com/callback';

      // Refresh cache to pick up new env vars
      if (paymentConfig.refreshCache) {
        await paymentConfig.refreshCache();
      }

      const methods = await paymentConfig.getAvailableMethods();

      expect(methods).toBeDefined();
      expect(Array.isArray(methods)).toBe(true);

      const qrisMethod = methods.find((m) => m.type === 'qris');
      expect(qrisMethod).toBeDefined();
      expect(qrisMethod.enabled).toBe(true);
      expect(qrisMethod.displayName).toBeDefined();
      expect(typeof qrisMethod.displayName).toBe('string');
    });

    test('When E-Wallet is fully configured, Then it appears in available payment methods', async () => {
      // Set E-Wallet environment variables
      process.env.E_WALLET_NAME = 'OVO';
      process.env.E_WALLET_NUMBER = '081234567890';
      process.env.E_WALLET_HOLDER = 'Test Owner';

      // Refresh cache to pick up new env vars
      if (paymentConfig.refreshCache) {
        await paymentConfig.refreshCache();
      }

      const methods = await paymentConfig.getAvailableMethods();

      expect(methods).toBeDefined();
      expect(Array.isArray(methods)).toBe(true);

      const ewalletMethod = methods.find((m) => m.type === 'ewallet');
      expect(ewalletMethod).toBeDefined();
      expect(ewalletMethod.enabled).toBe(true);
      expect(ewalletMethod.displayName).toBeDefined();
      expect(typeof ewalletMethod.displayName).toBe('string');
    });

    test('When Bank Transfer is fully configured, Then it appears in available payment methods', async () => {
      // Set Bank environment variables
      process.env.BANK_NAME = 'Bank BCA';
      process.env.BANK_ACCOUNT_NUMBER = '1234567890';
      process.env.BANK_ACCOUNT_HOLDER = 'Test Account Holder';

      // Refresh cache to pick up new env vars
      if (paymentConfig.refreshCache) {
        await paymentConfig.refreshCache();
      }

      const methods = await paymentConfig.getAvailableMethods();

      expect(methods).toBeDefined();
      expect(Array.isArray(methods)).toBe(true);

      const bankMethod = methods.find((m) => m.type === 'bank');
      expect(bankMethod).toBeDefined();
      expect(bankMethod.enabled).toBe(true);
      expect(bankMethod.displayName).toBeDefined();
      expect(typeof bankMethod.displayName).toBe('string');
    });

    test('When a payment method is not fully configured, Then it does not appear in available methods', async () => {
      // Clear all QRIS-related env vars first
      delete process.env.DUITKU_MERCHANT_CODE;
      delete process.env.DUITKU_API_KEY;
      delete process.env.DUITKU_CALLBACK_URL;

      // Set partial QRIS config (missing one required var)
      process.env.DUITKU_MERCHANT_CODE = 'test_merchant_code';
      process.env.DUITKU_API_KEY = 'test_api_key';
      // DUITKU_CALLBACK_URL is intentionally missing

      // Set full Bank config for comparison
      process.env.BANK_NAME = 'Bank BCA';
      process.env.BANK_ACCOUNT_NUMBER = '1234567890';
      process.env.BANK_ACCOUNT_HOLDER = 'Test Account Holder';

      // Refresh cache to pick up new env vars
      if (paymentConfig.refreshCache) {
        await paymentConfig.refreshCache();
      }

      // Force fresh load (bypass cache)
      const methods = await paymentConfig.getAvailableMethods();

      expect(methods).toBeDefined();
      expect(Array.isArray(methods)).toBe(true);

      // QRIS should not be enabled (missing DUITKU_CALLBACK_URL)
      const qrisMethod = methods.find((m) => m.type === 'qris');
      expect(qrisMethod).toBeDefined();
      expect(qrisMethod.enabled).toBe(false);

      // Bank should be enabled
      const bankMethod = methods.find((m) => m.type === 'bank');
      expect(bankMethod).toBeDefined();
      expect(bankMethod.enabled).toBe(true);
    });

    test('When no payment methods are configured, Then an error is thrown or empty array is returned', async () => {
      // Clear all payment-related env vars
      delete process.env.DUITKU_MERCHANT_CODE;
      delete process.env.DUITKU_API_KEY;
      delete process.env.DUITKU_CALLBACK_URL;
      delete process.env.E_WALLET_NAME;
      delete process.env.E_WALLET_NUMBER;
      delete process.env.E_WALLET_HOLDER;
      delete process.env.BANK_NAME;
      delete process.env.BANK_ACCOUNT_NUMBER;
      delete process.env.BANK_ACCOUNT_HOLDER;

      // Refresh cache
      if (paymentConfig.refreshCache) {
        await paymentConfig.refreshCache();
      }

      // Should either throw error or return empty array
      try {
        const methods = await paymentConfig.getAvailableMethods();
        expect(Array.isArray(methods)).toBe(true);
        // If no error, all methods should be disabled
        const enabledMethods = methods.filter((m) => m.enabled);
        expect(enabledMethods.length).toBe(0);
      } catch (error) {
        // Error is acceptable when no methods configured
        expect(error).toBeDefined();
        expect(typeof error.message).toBe('string');
      }
    });

    test('When multiple payment methods are configured, Then keyboard layout is balanced using responsive keyboards', async () => {
      // Set all payment methods
      process.env.DUITKU_MERCHANT_CODE = 'test_merchant_code';
      process.env.DUITKU_API_KEY = 'test_api_key';
      process.env.DUITKU_CALLBACK_URL = 'https://example.com/callback';
      process.env.BANK_NAME = 'Bank BCA';
      process.env.BANK_ACCOUNT_NUMBER = '1234567890';
      process.env.BANK_ACCOUNT_HOLDER = 'Test Account Holder';

      // Refresh cache
      if (paymentConfig.refreshCache) {
        await paymentConfig.refreshCache();
      }

      // Create mock checkout session
      const mockSession = {
        totalAmount: 100000,
        productName: 'Test Product',
        quantity: 1,
        price: 100000,
      };

      // Get payment method selection message
      const message = await checkoutHandler.formatPaymentMethodSelection(mockSession);

      expect(message).toBeDefined();
      expect(message.reply_markup).toBeDefined();
      expect(message.reply_markup.inline_keyboard).toBeDefined();
      expect(Array.isArray(message.reply_markup.inline_keyboard)).toBe(true);

      // Check that keyboard has balanced layout (responsive)
      const keyboardRows = message.reply_markup.inline_keyboard;
      expect(keyboardRows.length).toBeGreaterThan(0);

      // Last row should have navigation buttons (Home/Back)
      const lastRow = keyboardRows[keyboardRows.length - 1];
      expect(lastRow.length).toBeGreaterThanOrEqual(2);

      // Payment method buttons should be in balanced rows
      const paymentRows = keyboardRows.slice(0, -1); // Exclude nav row
      if (paymentRows.length > 0) {
        // Check balance: difference between max and min row length ≤ 1
        const rowLengths = paymentRows.map((row) => row.length);
        const maxLength = Math.max(...rowLengths);
        const minLength = Math.min(...rowLengths);
        expect(maxLength - minLength).toBeLessThanOrEqual(1);
      }
    });
  });
});
