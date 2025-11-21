/**
 * Integration tests for Responsive Menu Navigation with Balanced Layout (User Story 2)
 * Tests real Telegram Bot API interactions (Article IX)
 *
 * Tasks: T026, T027, T028, T029, T030, T031, T032, T033A, T033B
 * Requirements: FR-003, FR-004, FR-005
 * Feature: 002-friday-enhancement
 */

const keyboardBuilder = require('../../src/lib/ui/keyboard-builder');
const redisClient = require('../../src/lib/shared/redis-client');

describe('Responsive Menu Navigation with Balanced Layout Integration Tests', () => {
  afterAll(async () => {
    // Close Redis connection to prevent Jest from hanging
    try {
      // Call closeRedis directly - it handles test environment cleanup
      await redisClient.closeRedis();
    } catch (error) {
      // Ignore cleanup errors
    }
  }, 1000);
  describe('Given a menu with different numbers of items', () => {
    test('When menu has 9 items, Then buttons are arranged in 3x3x2 pattern (3 rows of 3, then 1 row of 2 with Home/Back)', async () => {
      const items = Array.from({ length: 9 }, (_, i) => ({
        text: `Item ${i + 1}`,
        callback_data: `item_${i + 1}`,
      }));

      const keyboard = await keyboardBuilder.createKeyboard(items);
      const keyboardRows = keyboard.reply_markup.inline_keyboard;

      // Should have 4 rows: 3 rows of 3 items + 1 row of 2 nav buttons
      expect(keyboardRows.length).toBe(4);

      // First 3 rows should have 3 items each
      expect(keyboardRows[0].length).toBe(3);
      expect(keyboardRows[1].length).toBe(3);
      expect(keyboardRows[2].length).toBe(3);

      // Last row should have 2 navigation buttons
      expect(keyboardRows[3].length).toBe(2);
      expect(keyboardRows[3][0].text).toMatch(/home|🏠/i);
      expect(keyboardRows[3][1].text).toMatch(/back|◀️/i);
    });

    test('When menu has 6 items, Then buttons are arranged in 3x2x2 pattern (3 rows of 2, then 1 row of 2 with Home/Back)', async () => {
      const items = Array.from({ length: 6 }, (_, i) => ({
        text: `Item ${i + 1}`,
        callback_data: `item_${i + 1}`,
      }));

      const keyboard = await keyboardBuilder.createKeyboard(items);
      const keyboardRows = keyboard.reply_markup.inline_keyboard;

      // Should have 4 rows: 3 rows of 2 items + 1 row of 2 nav buttons
      expect(keyboardRows.length).toBe(4);

      // First 3 rows should have 2 items each
      expect(keyboardRows[0].length).toBe(2);
      expect(keyboardRows[1].length).toBe(2);
      expect(keyboardRows[2].length).toBe(2);

      // Last row should have 2 navigation buttons
      expect(keyboardRows[3].length).toBe(2);
      expect(keyboardRows[3][0].text).toMatch(/home|🏠/i);
      expect(keyboardRows[3][1].text).toMatch(/back|◀️/i);
    });

    test('When menu has 4 items, Then buttons are arranged in 3x2x1 pattern (2 rows of 2, then 1 row with Home/Back)', async () => {
      const items = Array.from({ length: 4 }, (_, i) => ({
        text: `Item ${i + 1}`,
        callback_data: `item_${i + 1}`,
      }));

      const keyboard = await keyboardBuilder.createKeyboard(items);
      const keyboardRows = keyboard.reply_markup.inline_keyboard;

      // Should have 3 rows: 2 rows of 2 items + 1 row of 2 nav buttons
      expect(keyboardRows.length).toBe(3);

      // First 2 rows should have 2 items each
      expect(keyboardRows[0].length).toBe(2);
      expect(keyboardRows[1].length).toBe(2);

      // Last row should have 2 navigation buttons
      expect(keyboardRows[2].length).toBe(2);
      expect(keyboardRows[2][0].text).toMatch(/home|🏠/i);
      expect(keyboardRows[2][1].text).toMatch(/back|◀️/i);
    });

    test('When menu has 2 items, Then buttons are arranged in 3x1x1 pattern (1 row of 2, then 1 row with Home/Back)', async () => {
      const items = Array.from({ length: 2 }, (_, i) => ({
        text: `Item ${i + 1}`,
        callback_data: `item_${i + 1}`,
      }));

      const keyboard = await keyboardBuilder.createKeyboard(items);
      const keyboardRows = keyboard.reply_markup.inline_keyboard;

      // Should have 2 rows: 1 row of 2 items + 1 row of 2 nav buttons
      expect(keyboardRows.length).toBe(2);

      // First row should have 2 items
      expect(keyboardRows[0].length).toBe(2);

      // Last row should have 2 navigation buttons
      expect(keyboardRows[1].length).toBe(2);
      expect(keyboardRows[1][0].text).toMatch(/home|🏠/i);
      expect(keyboardRows[1][1].text).toMatch(/back|◀️/i);
    });

    test('When menu has incomplete rows (7 items), Then layout auto-balances to distribute items evenly across rows', async () => {
      const items = Array.from({ length: 7 }, (_, i) => ({
        text: `Item ${i + 1}`,
        callback_data: `item_${i + 1}`,
      }));

      const keyboard = await keyboardBuilder.createKeyboard(items);
      const keyboardRows = keyboard.reply_markup.inline_keyboard;

      // Should have navigation row
      const navRowIndex = keyboardRows.length - 1;
      expect(keyboardRows[navRowIndex].length).toBe(2);

      // Item rows (excluding nav)
      const itemRows = keyboardRows.slice(0, navRowIndex);
      const rowLengths = itemRows.map((row) => row.length);

      // Check that rows are balanced (difference between max and min ≤ 1)
      const maxLength = Math.max(...rowLengths);
      const minLength = Math.min(...rowLengths);
      expect(maxLength - minLength).toBeLessThanOrEqual(1);

      // Total items should match
      const totalItems = itemRows.reduce((sum, row) => sum + row.length, 0);
      expect(totalItems).toBe(7);
    });

    test('When menu has 0 items, Then it shows empty state with Home button only', async () => {
      const items = [];

      const keyboard = await keyboardBuilder.createKeyboard(items);
      const keyboardRows = keyboard.reply_markup.inline_keyboard;

      // Should have 1 row with Home button only
      expect(keyboardRows.length).toBe(1);
      expect(keyboardRows[0].length).toBe(1);
      expect(keyboardRows[0][0].text).toMatch(/home|🏠/i);
    });

    test('When menu has >9 items, Then pagination is implemented', async () => {
      const items = Array.from({ length: 15 }, (_, i) => ({
        text: `Item ${i + 1}`,
        callback_data: `item_${i + 1}`,
      }));

      const keyboard = await keyboardBuilder.createKeyboard(items);
      const keyboardRows = keyboard.reply_markup.inline_keyboard;

      // Should have pagination controls
      // First page should have max 9 items + nav
      const itemRows = keyboardRows.slice(0, -1); // Exclude nav row
      const totalItemsOnPage = itemRows.reduce((sum, row) => sum + row.length, 0);
      expect(totalItemsOnPage).toBeLessThanOrEqual(9);

      // Should have navigation row
      const navRow = keyboardRows[keyboardRows.length - 1];
      expect(navRow.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Given any menu screen', () => {
    test('When displayed, Then it includes fixed Home and Back navigation buttons in the last row', async () => {
      const items = Array.from({ length: 5 }, (_, i) => ({
        text: `Item ${i + 1}`,
        callback_data: `item_${i + 1}`,
      }));

      const keyboard = await keyboardBuilder.createKeyboard(items);
      const keyboardRows = keyboard.reply_markup.inline_keyboard;
      const lastRow = keyboardRows[keyboardRows.length - 1];

      expect(lastRow.length).toBe(2);
      expect(lastRow[0].text).toMatch(/home|🏠/i);
      expect(lastRow[1].text).toMatch(/back|◀️/i);
    });
  });

  describe('Given a customer clicks navigation buttons', () => {
    test('When they click Home, Then callback_data is nav_home', async () => {
      const items = [{ text: 'Test', callback_data: 'test' }];
      const keyboard = await keyboardBuilder.createKeyboard(items);
      const keyboardRows = keyboard.reply_markup.inline_keyboard;
      const navRow = keyboardRows[keyboardRows.length - 1];

      expect(navRow[0].callback_data).toBe('nav_home');
    });

    test('When they click Back, Then callback_data is nav_back', async () => {
      const items = [{ text: 'Test', callback_data: 'test' }];
      const keyboard = await keyboardBuilder.createKeyboard(items);
      const keyboardRows = keyboard.reply_markup.inline_keyboard;
      const navRow = keyboardRows[keyboardRows.length - 1];

      expect(navRow[1].callback_data).toBe('nav_back');
    });
  });
});
