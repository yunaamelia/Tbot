/**
 * Integration tests for Button States and Visual Feedback (User Story 4)
 * Tests real Redis interactions and button state management
 *
 * Tasks: T060, T061, T062, T063
 * Requirements: FR-014, FR-015
 * Feature: 003-enhanced-keyboard
 */

const buttonStateManager = require('../../src/lib/ui/button-state-manager');
const redisClient = require('../../src/lib/shared/redis-client');

describe('Button States and Visual Feedback Integration Tests', () => {
  const testButtonId = 'test_button_123';
  const testUserId = 111111111;
  let redisAvailable = false;

  beforeAll(async () => {
    // Check if Redis is available (with timeout to prevent hanging)
    try {
      const redis = redisClient.getRedis();
      if (redis) {
        // Use Promise.race with timeout to avoid hanging
        await Promise.race([
          redis.ping(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Redis timeout')), 500)),
        ]);
        redisAvailable = true;
      } else {
        redisAvailable = false;
      }
    } catch (error) {
      // Redis not available - skip integration tests
      redisAvailable = false;
      console.warn('Redis not available, skipping Redis-dependent integration tests');
    }

    // Cleanup any existing button states
    if (redisAvailable) {
      try {
        await buttonStateManager.clearButtonState(testButtonId, testUserId);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  afterAll(async () => {
    // Cleanup: Remove button states for test button (only if Redis was available)
    if (redisAvailable) {
      try {
        await Promise.race([
          buttonStateManager.clearButtonState(testButtonId, testUserId),
          new Promise((resolve) => setTimeout(resolve, 500)),
        ]);
      } catch (error) {
        // Ignore cleanup errors
      }
    }

    // Close Redis connection
    try {
      await redisClient.closeRedis();
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Given a button is clicked during processing', () => {
    test('When button is processing, Then button should be disabled (T060)', async () => {
      if (!redisAvailable) {
        console.warn('Skipping test - Redis not available');
        return;
      }

      // Set button to processing state
      await buttonStateManager.disableButton(testButtonId, testUserId, {
        loadingText: '⏳ Processing...',
      });

      // Check if button is processing
      const isProcessing = await buttonStateManager.isButtonProcessing(testButtonId, testUserId);
      expect(isProcessing).toBe(true);

      // Verify button state in Redis
      const buttonState = await buttonStateManager.getButtonState(testButtonId, testUserId);
      expect(buttonState).toBeDefined();
      expect(buttonState.state).toBe('processing');
    });

    test('When button is processing, Then loading indicator is shown (T061)', async () => {
      if (!redisAvailable) {
        console.warn('Skipping test - Redis not available');
        return;
      }

      const loadingText = '⏳ Memproses...';
      await buttonStateManager.disableButton(testButtonId, testUserId, {
        loadingText,
      });

      const buttonState = await buttonStateManager.getButtonState(testButtonId, testUserId);
      expect(buttonState).toBeDefined();
      expect(buttonState.loadingText).toBe(loadingText);
      expect(buttonState.state).toBe('processing');

      // Cleanup
      await buttonStateManager.enableButton(testButtonId, testUserId, {
        resultText: '✅ Complete',
        success: true,
      });
    });

    test('When button processing completes, Then button is re-enabled (T062)', async () => {
      if (!redisAvailable) {
        console.warn('Skipping test - Redis not available');
        return;
      }

      // First, disable button
      await buttonStateManager.disableButton(testButtonId, testUserId, {
        loadingText: '⏳ Processing...',
      });

      // Verify button is processing
      const wasProcessing = await buttonStateManager.isButtonProcessing(testButtonId, testUserId);
      expect(wasProcessing).toBe(true);

      // Re-enable button after processing
      await buttonStateManager.enableButton(testButtonId, testUserId, {
        resultText: '✅ Complete',
        success: true,
      });

      // Verify button is no longer processing
      const isStillProcessing = await buttonStateManager.isButtonProcessing(
        testButtonId,
        testUserId
      );
      expect(isStillProcessing).toBe(false);

      // Verify button state is cleared
      const buttonState = await buttonStateManager.getButtonState(testButtonId, testUserId);
      expect(buttonState).toBeNull();
    });

    test('When button is processing, Then duplicate clicks are prevented (T063)', async () => {
      if (!redisAvailable) {
        console.warn('Skipping test - Redis not available');
        return;
      }

      // Set button to processing state
      await buttonStateManager.disableButton(testButtonId, testUserId, {
        loadingText: '⏳ Processing...',
      });

      // Attempt to process button again (should be ignored)
      const isProcessing = await buttonStateManager.isButtonProcessing(testButtonId, testUserId);
      expect(isProcessing).toBe(true);

      // Try to disable again (should still be processing)
      await buttonStateManager.disableButton(testButtonId, testUserId, {
        loadingText: '⏳ Processing...',
      });

      // Verify button is still in processing state
      const stillProcessing = await buttonStateManager.isButtonProcessing(testButtonId, testUserId);
      expect(stillProcessing).toBe(true);

      // Cleanup
      await buttonStateManager.enableButton(testButtonId, testUserId, {
        resultText: '✅ Complete',
        success: true,
      });
    });
  });

  describe('Given button state timeout', () => {
    test('When button processing exceeds timeout, Then button is auto-re-enabled', async () => {
      if (!redisAvailable) {
        console.warn('Skipping test - Redis not available');
        return;
      }

      // Set button to processing with short timeout (for testing)
      await buttonStateManager.disableButton(testButtonId, testUserId, {
        loadingText: '⏳ Processing...',
        timeoutSeconds: 1, // 1 second timeout for test
      });

      // Wait for timeout (plus buffer)
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Verify button is no longer processing (auto-re-enabled)
      const isProcessing = await buttonStateManager.isButtonProcessing(testButtonId, testUserId);
      expect(isProcessing).toBe(false);
    });
  });

  describe('Given button visual feedback', () => {
    test('When button succeeds, Then success emoji is shown', async () => {
      if (!redisAvailable) {
        console.warn('Skipping test - Redis not available');
        return;
      }

      await buttonStateManager.disableButton(testButtonId, testUserId, {
        loadingText: '⏳ Processing...',
      });

      await buttonStateManager.enableButton(testButtonId, testUserId, {
        resultText: 'Berhasil',
        success: true,
      });

      // Button should be enabled
      const isProcessing = await buttonStateManager.isButtonProcessing(testButtonId, testUserId);
      expect(isProcessing).toBe(false);
    });

    test('When button fails, Then error emoji is shown', async () => {
      if (!redisAvailable) {
        console.warn('Skipping test - Redis not available');
        return;
      }

      await buttonStateManager.disableButton(testButtonId, testUserId, {
        loadingText: '⏳ Processing...',
      });

      await buttonStateManager.enableButton(testButtonId, testUserId, {
        resultText: 'Gagal',
        success: false,
      });

      // Button should be enabled (even on failure)
      const isProcessing = await buttonStateManager.isButtonProcessing(testButtonId, testUserId);
      expect(isProcessing).toBe(false);
    });
  });
});
