/**
 * Unit tests for Button State Manager (User Story 4)
 *
 * Tasks: T064, T065, T066
 * Requirements: FR-014, FR-015
 * Feature: 003-enhanced-keyboard
 */

const buttonStateManager = require('../../../src/lib/ui/button-state-manager');
const redisClientModule = require('../../../src/lib/shared/redis-client');

// Mock dependencies
jest.mock('../../../src/lib/shared/redis-client', () => {
  const mockRedis = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    status: 'ready', // Mock Redis status as 'ready' for tests
  };

  return {
    getRedis: jest.fn(() => mockRedis),
    closeRedis: jest.fn(() => Promise.resolve()),
    testConnection: jest.fn(() => Promise.resolve(true)),
  };
});

describe('Button State Manager Unit Tests', () => {
  let mockRedis;
  const testButtonId = 'test_button_123';
  const testUserId = 111111111;

  beforeEach(() => {
    jest.clearAllMocks();
    // Get the mock Redis instance from the module
    mockRedis = redisClientModule.getRedis();
  });

  afterAll(async () => {
    try {
      await redisClientModule.closeRedis();
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('disableButton() (T064)', () => {
    test('When button is disabled, Then state is stored in Redis', async () => {
      mockRedis.set.mockResolvedValue('OK');

      await buttonStateManager.disableButton(testButtonId, testUserId, {
        loadingText: '⏳ Processing...',
      });

      expect(mockRedis.set).toHaveBeenCalled();
      const [key, value] = mockRedis.set.mock.calls[0];
      expect(key).toMatch(/button:state:/);
      const stateData = JSON.parse(value);
      expect(stateData.state).toBe('processing');
      expect(stateData.loadingText).toBe('⏳ Processing...');
    });

    test('When button is disabled, Then Redis key has TTL of 30 seconds', async () => {
      mockRedis.set.mockResolvedValue('OK');

      await buttonStateManager.disableButton(testButtonId, testUserId, {
        loadingText: '⏳ Processing...',
      });

      expect(mockRedis.set).toHaveBeenCalled();
      const [, , setMode, ttl] = mockRedis.set.mock.calls[0];
      expect(setMode).toBe('EX');
      expect(ttl).toBe(30); // 30 seconds TTL
    });

    test('When disableButton fails, Then error is handled gracefully', async () => {
      mockRedis.set.mockRejectedValue(new Error('Redis error'));

      // Should not throw
      await expect(
        buttonStateManager.disableButton(testButtonId, testUserId, {
          loadingText: '⏳ Processing...',
        })
      ).resolves.not.toThrow();
    });
  });

  describe('enableButton() (T065)', () => {
    test('When button is enabled, Then state is removed from Redis', async () => {
      // First disable button
      mockRedis.set.mockResolvedValue('OK');
      await buttonStateManager.disableButton(testButtonId, testUserId, {
        loadingText: '⏳ Processing...',
      });

      // Then enable button
      mockRedis.del.mockResolvedValue(1);
      await buttonStateManager.enableButton(testButtonId, testUserId, {
        resultText: '✅ Complete',
        success: true,
      });

      expect(mockRedis.del).toHaveBeenCalled();
      const [key] = mockRedis.del.mock.calls[0];
      expect(key).toMatch(/button:state:/);
    });

    test('When enableButton fails, Then error is handled gracefully', async () => {
      mockRedis.del.mockRejectedValue(new Error('Redis error'));

      // Should not throw
      await expect(
        buttonStateManager.enableButton(testButtonId, testUserId, {
          resultText: '✅ Complete',
          success: true,
        })
      ).resolves.not.toThrow();
    });
  });

  describe('isButtonProcessing() (T066)', () => {
    test('When button is processing, Then returns true', async () => {
      // Set button state in Redis
      const stateData = JSON.stringify({
        state: 'processing',
        loadingText: '⏳ Processing...',
        timestamp: Date.now(),
      });
      mockRedis.get.mockResolvedValue(stateData);

      const isProcessing = await buttonStateManager.isButtonProcessing(testButtonId, testUserId);
      expect(isProcessing).toBe(true);
      expect(mockRedis.get).toHaveBeenCalled();
    });

    test('When button is not processing, Then returns false', async () => {
      mockRedis.get.mockResolvedValue(null);

      const isProcessing = await buttonStateManager.isButtonProcessing(testButtonId, testUserId);
      expect(isProcessing).toBe(false);
    });

    test('When Redis fails, Then returns false (fail-safe)', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis error'));

      const isProcessing = await buttonStateManager.isButtonProcessing(testButtonId, testUserId);
      expect(isProcessing).toBe(false);
    });

    test('When button state expired, Then returns false', async () => {
      // State expired (timestamp older than timeout)
      const expiredState = JSON.stringify({
        state: 'processing',
        loadingText: '⏳ Processing...',
        timestamp: Date.now() - 35000, // 35 seconds ago (> 30s timeout)
      });
      mockRedis.get.mockResolvedValue(expiredState);

      const isProcessing = await buttonStateManager.isButtonProcessing(testButtonId, testUserId);
      expect(isProcessing).toBe(false);
    });
  });

  describe('Button State Management', () => {
    test('When getButtonState is called, Then returns button state from Redis', async () => {
      const stateData = {
        state: 'processing',
        loadingText: '⏳ Processing...',
        timestamp: Date.now(),
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(stateData));

      const state = await buttonStateManager.getButtonState(testButtonId, testUserId);
      expect(state).toBeDefined();
      expect(state.state).toBe('processing');
      expect(state.loadingText).toBe('⏳ Processing...');
    });

    test('When clearButtonState is called, Then removes state from Redis', async () => {
      mockRedis.del.mockResolvedValue(1);

      await buttonStateManager.clearButtonState(testButtonId, testUserId);

      expect(mockRedis.del).toHaveBeenCalled();
    });
  });
});
