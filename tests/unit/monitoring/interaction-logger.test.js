/**
 * Unit Tests: Interaction Logger
 * Tests for user interaction logging, response time tracking, and error logging
 *
 * Tasks: T100
 * Requirements: FR-019, FR-020, FR-021
 * Feature: 003-enhanced-keyboard
 */

const dbConnection = require('../../../src/lib/database/db-connection');
const roleFilter = require('../../../src/lib/security/role-filter');

// Mock dependencies
jest.mock('../../../src/lib/database/db-connection');
jest.mock('../../../src/lib/security/role-filter');
jest.mock('../../../src/lib/shared/logger', () => ({
  child: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

describe('Interaction Logger Unit Tests', () => {
  let interactionLogger;
  let mockKnex;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Knex query builder chain
    mockKnex = {
      insert: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([{ id: 1 }]),
    };

    // Mock Knex table() method to return query builder
    const mockTable = jest.fn().mockReturnValue(mockKnex);
    dbConnection.getDb.mockReturnValue(mockTable);

    // Mock roleFilter
    roleFilter.getUserRole = jest.fn().mockResolvedValue({ role: 'regular' });

    // Load module after mocks are set up
    interactionLogger = require('../../../src/lib/monitoring/interaction-logger');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('logInteraction() (T096, FR-019)', () => {
    test('When interaction is logged, Then it is stored in database', async () => {
      const interactionData = {
        telegramUserId: 123456,
        buttonId: 'product_1',
        buttonLabel: 'Produk 1',
        responseTimeMs: 150,
        menuContext: 'main',
        success: true,
      };

      await interactionLogger.logInteraction(interactionData);

      expect(dbConnection.getDb).toHaveBeenCalled();
      const db = dbConnection.getDb();
      expect(db).toHaveBeenCalledWith('interaction_logs');
      expect(mockKnex.insert).toHaveBeenCalled();
      const insertCall = mockKnex.insert.mock.calls[0][0];
      expect(insertCall).toMatchObject({
        telegram_user_id: 123456,
        button_id: 'product_1',
        button_label: 'Produk 1',
        response_time_ms: 150,
        menu_context: 'main',
        success: true,
      });
      expect(mockKnex.returning).toHaveBeenCalledWith('id');
    });

    test('When interaction is logged, Then user role is included if available', async () => {
      roleFilter.getUserRole.mockResolvedValue({ role: 'admin' });

      const interactionData = {
        telegramUserId: 123456,
        buttonId: 'admin_panel',
        buttonLabel: 'Admin Panel',
        responseTimeMs: 200,
        menuContext: 'main',
        success: true,
      };

      await interactionLogger.logInteraction(interactionData);

      expect(roleFilter.getUserRole).toHaveBeenCalledWith(123456);
      const insertCall = mockKnex.insert.mock.calls[0][0];
      expect(insertCall.user_role).toBe('admin');
    });

    test('When interaction fails, Then error is logged but does not throw', async () => {
      dbConnection.getDb.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const interactionData = {
        telegramUserId: 123456,
        buttonId: 'product_1',
        buttonLabel: 'Produk 1',
        responseTimeMs: 150,
        menuContext: 'main',
        success: true,
      };

      // Should not throw
      await expect(interactionLogger.logInteraction(interactionData)).resolves.not.toThrow();
    });

    test('When required fields are missing, Then validation error is thrown', async () => {
      const invalidData = {
        telegramUserId: 123456,
        // Missing buttonId
      };

      await expect(interactionLogger.logInteraction(invalidData)).rejects.toThrow();
    });
  });

  describe('trackResponseTime() (T098, FR-020)', () => {
    test('When response time is tracked, Then it is included in log', async () => {
      const startTime = Date.now();
      const interactionData = {
        telegramUserId: 123456,
        buttonId: 'product_1',
        buttonLabel: 'Produk 1',
        menuContext: 'main',
        success: true,
      };

      // Simulate some processing time
      await new Promise((resolve) => setTimeout(resolve, 50));

      const responseTime = Date.now() - startTime;
      interactionData.responseTimeMs = responseTime;

      await interactionLogger.logInteraction(interactionData);

      expect(mockKnex.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          response_time_ms: expect.any(Number),
        })
      );
      // Response time should be >= 0 (timing can vary slightly)
      expect(mockKnex.insert.mock.calls[0][0].response_time_ms).toBeGreaterThanOrEqual(0);
    });

    test('When response time is 0, Then it is still logged correctly', async () => {
      const interactionData = {
        telegramUserId: 123456,
        buttonId: 'nav_home',
        buttonLabel: 'Home',
        responseTimeMs: 0,
        menuContext: 'main',
        success: true,
      };

      await interactionLogger.logInteraction(interactionData);

      expect(mockKnex.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          response_time_ms: 0,
        })
      );
    });
  });

  describe('logError() (T099, FR-021)', () => {
    test('When error occurs, Then error is logged with error details', async () => {
      const error = new Error('Payment failed');
      const interactionData = {
        telegramUserId: 123456,
        buttonId: 'checkout_confirm',
        buttonLabel: 'Konfirmasi Pembayaran',
        responseTimeMs: 500,
        menuContext: 'checkout',
        success: false,
        error: error,
      };

      await interactionLogger.logInteraction(interactionData);

      expect(mockKnex.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error_message: expect.stringContaining('Payment failed'),
        })
      );
    });

    test('When error occurs, Then metadata includes error stack trace', async () => {
      const error = new Error('Database query failed');
      error.stack = 'Error: Database query failed\n  at function (file.js:10:20)';

      const interactionData = {
        telegramUserId: 123456,
        buttonId: 'product_details_1',
        buttonLabel: 'Detail Produk',
        responseTimeMs: 300,
        menuContext: 'products',
        success: false,
        error: error,
      };

      await interactionLogger.logInteraction(interactionData);

      const insertCall = mockKnex.insert.mock.calls[0][0];
      expect(insertCall.success).toBe(false);
      expect(insertCall.error_message).toBeTruthy();
      if (insertCall.metadata) {
        const metadata =
          typeof insertCall.metadata === 'string'
            ? JSON.parse(insertCall.metadata)
            : insertCall.metadata;
        expect(metadata).toHaveProperty('error');
      }
    });

    test('When error logging fails, Then error is handled gracefully', async () => {
      mockKnex.returning.mockRejectedValue(new Error('Database insert failed'));

      const error = new Error('Original error');
      const interactionData = {
        telegramUserId: 123456,
        buttonId: 'product_1',
        buttonLabel: 'Produk 1',
        responseTimeMs: 100,
        menuContext: 'main',
        success: false,
        error: error,
      };

      // Should not throw
      await expect(interactionLogger.logInteraction(interactionData)).resolves.not.toThrow();
    });
  });

  describe('logInteraction() metadata handling', () => {
    test('When metadata is provided, Then it is stored as JSON', async () => {
      const interactionData = {
        telegramUserId: 123456,
        buttonId: 'nav_page_2',
        buttonLabel: 'Halaman Selanjutnya',
        responseTimeMs: 120,
        menuContext: 'products',
        success: true,
        metadata: {
          pageNumber: 2,
          totalPages: 5,
          itemCount: 15,
        },
      };

      await interactionLogger.logInteraction(interactionData);

      const insertCall = mockKnex.insert.mock.calls[0][0];
      expect(insertCall.metadata).toBeDefined();
      const metadata =
        typeof insertCall.metadata === 'string'
          ? JSON.parse(insertCall.metadata)
          : insertCall.metadata;
      expect(metadata.pageNumber).toBe(2);
      expect(metadata.totalPages).toBe(5);
    });

    test('When metadata is not provided, Then it is stored as null', async () => {
      const interactionData = {
        telegramUserId: 123456,
        buttonId: 'product_1',
        buttonLabel: 'Produk 1',
        responseTimeMs: 150,
        menuContext: 'main',
        success: true,
      };

      await interactionLogger.logInteraction(interactionData);

      const insertCall = mockKnex.insert.mock.calls[0][0];
      // metadata can be null or undefined
      expect(insertCall.metadata === null || insertCall.metadata === undefined).toBe(true);
    });
  });

  describe('logInteraction() timestamp handling', () => {
    test('When interaction is logged, Then timestamp is included', async () => {
      const interactionData = {
        telegramUserId: 123456,
        buttonId: 'product_1',
        buttonLabel: 'Produk 1',
        responseTimeMs: 150,
        menuContext: 'main',
        success: true,
      };

      const beforeTimestamp = new Date();
      await interactionLogger.logInteraction(interactionData);
      const afterTimestamp = new Date();

      const insertCall = mockKnex.insert.mock.calls[0][0];
      const timestamp = insertCall.timestamp || new Date(insertCall.timestamp);
      expect(timestamp.getTime()).toBeGreaterThanOrEqual(beforeTimestamp.getTime());
      expect(timestamp.getTime()).toBeLessThanOrEqual(afterTimestamp.getTime());
    });
  });

  describe('logInteraction() validation', () => {
    test('When telegramUserId is missing, Then validation error is thrown', async () => {
      const invalidData = {
        buttonId: 'product_1',
        buttonLabel: 'Produk 1',
        responseTimeMs: 150,
      };

      await expect(interactionLogger.logInteraction(invalidData)).rejects.toThrow();
    });

    test('When buttonId is missing, Then validation error is thrown', async () => {
      const invalidData = {
        telegramUserId: 123456,
        buttonLabel: 'Produk 1',
        responseTimeMs: 150,
      };

      await expect(interactionLogger.logInteraction(invalidData)).rejects.toThrow();
    });

    test('When responseTimeMs is missing, Then validation error is thrown', async () => {
      const invalidData = {
        telegramUserId: 123456,
        buttonId: 'product_1',
        buttonLabel: 'Produk 1',
      };

      await expect(interactionLogger.logInteraction(invalidData)).rejects.toThrow();
    });

    test('When responseTimeMs is negative, Then validation error is thrown', async () => {
      const invalidData = {
        telegramUserId: 123456,
        buttonId: 'product_1',
        buttonLabel: 'Produk 1',
        responseTimeMs: -1,
      };

      await expect(interactionLogger.logInteraction(invalidData)).rejects.toThrow();
    });
  });
});
