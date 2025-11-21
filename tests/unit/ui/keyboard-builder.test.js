/**
 * Unit tests for Keyboard Builder - Label Truncation Logic and Pagination
 *
 * Tasks: T019, T086
 * Requirements: FR-001, FR-002, FR-016, FR-017, FR-018
 * Feature: 003-enhanced-keyboard
 */

const keyboardBuilder = require('../../../src/lib/ui/keyboard-builder');
const { truncateLabel, validateButtonLabel } = require('../../../src/lib/ui/keyboard-builder');
const { ValidationError } = require('../../../src/lib/shared/errors');

describe('Keyboard Builder - Label Truncation', () => {
  describe('truncateLabel() helper function', () => {
    test('When label length exceeds maxLength, Then label is truncated with ellipsis', () => {
      const longLabel = 'A'.repeat(25); // 25 characters
      const result = truncateLabel(longLabel, 20);

      // Should be truncated to 17 characters + '...' = 20 total
      expect(result.length).toBe(20);
      expect(result).toBe('A'.repeat(17) + '...');
      expect(result).toMatch(/\.\.\.$/);
    });

    test('When label length equals maxLength, Then label is not truncated', () => {
      const exactLabel = 'A'.repeat(20); // Exactly 20 characters
      const result = truncateLabel(exactLabel, 20);

      expect(result).toBe(exactLabel);
      expect(result).not.toMatch(/\.\.\.$/);
    });

    test('When label length is less than maxLength, Then label is not truncated', () => {
      const shortLabel = 'Short';
      const result = truncateLabel(shortLabel, 20);

      expect(result).toBe(shortLabel);
      expect(result).not.toMatch(/\.\.\.$/);
    });

    test('When label is empty string, Then empty string is returned', () => {
      const emptyLabel = '';
      const result = truncateLabel(emptyLabel, 20);

      expect(result).toBe('');
    });

    test('When maxLength is less than 3, Then label is truncated to maxLength without ellipsis', () => {
      const longLabel = 'ABCD';
      const result = truncateLabel(longLabel, 2);

      // Should truncate to 2 characters without ellipsis
      expect(result).toBe('AB');
      expect(result).not.toMatch(/\.\.\.$/);
    });

    test('When label is not a string, Then empty string is returned', () => {
      expect(truncateLabel(null, 20)).toBe('');
      expect(truncateLabel(undefined, 20)).toBe('');
      expect(truncateLabel(123, 20)).toBe('');
    });
  });

  describe('validateButtonLabel() function', () => {
    test('When label exceeds byte limit, Then label is truncated', () => {
      // Create a label that exceeds 64 bytes (using multi-byte characters)
      const longLabel = '🚀'.repeat(25); // Emoji takes 4 bytes each, so 25 * 4 = 100 bytes
      const result = validateButtonLabel(longLabel);

      // Should be truncated to fit within 64 bytes
      const byteLength = Buffer.byteLength(result, 'utf8');
      expect(byteLength).toBeLessThanOrEqual(64);
    });

    test('When label is valid, Then label is returned with truncation for UI consistency', () => {
      const validLabel = 'A'.repeat(25); // Exceeds MAX_LABEL_LENGTH (20)
      const result = validateButtonLabel(validLabel);

      // Should be truncated to 20 characters (UI consistency)
      expect(result.length).toBeLessThanOrEqual(20);
    });

    test('When label is not a string, Then ValidationError is thrown', () => {
      expect(() => validateButtonLabel(null)).toThrow(ValidationError);
      expect(() => validateButtonLabel(undefined)).toThrow(ValidationError);
      expect(() => validateButtonLabel(123)).toThrow(ValidationError);
    });
  });

  describe('createPaginatedKeyboard() pagination logic (T086)', () => {
    test('When menu has 10 items, Then pagination is shown with page 0 having 9 items', async () => {
      const items = Array.from({ length: 10 }, (_, i) => ({
        text: `Item ${i + 1}`,
        callback_data: `item_${i + 1}`,
      }));

      const keyboard = await keyboardBuilder.createKeyboard(items, { page: 0 });
      const keyboardRows = keyboard.reply_markup.inline_keyboard;

      // Should have max 9 items on first page
      const itemRows = keyboardRows.slice(0, -1); // Exclude pagination/nav row
      const totalItemsOnPage = itemRows.reduce((sum, row) => sum + row.length, 0);
      expect(totalItemsOnPage).toBeLessThanOrEqual(9);

      // Last row should have pagination controls
      const lastRow = keyboardRows[keyboardRows.length - 1];
      const hasPagination = lastRow.some((btn) => btn.callback_data.match(/nav_page/));
      expect(hasPagination).toBe(true);
    });

    test('When on page 1, Then pagination shows correct items', async () => {
      const items = Array.from({ length: 15 }, (_, i) => ({
        text: `Item ${i + 1}`,
        callback_data: `item_${i + 1}`,
      }));

      const keyboard = await keyboardBuilder.createKeyboard(items, { page: 1 });
      const keyboardRows = keyboard.reply_markup.inline_keyboard;

      // Should have items from page 1 (items 10-15, max 9 items)
      const itemRows = keyboardRows.slice(0, -1); // Exclude pagination/nav row
      const totalItemsOnPage = itemRows.reduce((sum, row) => sum + row.length, 0);
      expect(totalItemsOnPage).toBeLessThanOrEqual(9);
      expect(totalItemsOnPage).toBeGreaterThan(0);

      // Last row should have Prev button (not on first page)
      const lastRow = keyboardRows[keyboardRows.length - 1];
      const hasPrev = lastRow.some((btn) => btn.callback_data === 'nav_page_0');
      expect(hasPrev).toBe(true);
    });

    test('When pagination buttons are present, Then they have correct callback_data format', async () => {
      const items = Array.from({ length: 12 }, (_, i) => ({
        text: `Item ${i + 1}`,
        callback_data: `item_${i + 1}`,
      }));

      const keyboard = await keyboardBuilder.createKeyboard(items, { page: 0 });
      const keyboardRows = keyboard.reply_markup.inline_keyboard;
      const lastRow = keyboardRows[keyboardRows.length - 1];

      // Should have page info button
      const pageInfoButton = lastRow.find((btn) => btn.callback_data === 'nav_page_info');
      expect(pageInfoButton).toBeDefined();

      // Should have Next button with correct format (nav_page_1)
      const nextButton = lastRow.find((btn) => btn.callback_data === 'nav_page_1');
      expect(nextButton).toBeDefined();
      expect(nextButton.callback_data).toMatch(/^nav_page_\d+$/);
    });

    test('When on first page, Then Prev button is NOT shown (FR-018)', async () => {
      const items = Array.from({ length: 12 }, (_, i) => ({
        text: `Item ${i + 1}`,
        callback_data: `item_${i + 1}`,
      }));

      const keyboard = await keyboardBuilder.createKeyboard(items, { page: 0 });
      const keyboardRows = keyboard.reply_markup.inline_keyboard;
      const lastRow = keyboardRows[keyboardRows.length - 1];

      // Should NOT have Prev button on first page
      const prevButton = lastRow.find((btn) => btn.callback_data === 'nav_page_-1');
      expect(prevButton).toBeUndefined();
    });

    test('When on last page, Then Next button is NOT shown (FR-018)', async () => {
      const items = Array.from({ length: 12 }, (_, i) => ({
        text: `Item ${i + 1}`,
        callback_data: `item_${i + 1}`,
      }));

      // Last page (page 1 for 12 items = 2 pages total, page 0-indexed)
      const keyboard = await keyboardBuilder.createKeyboard(items, { page: 1 });
      const keyboardRows = keyboard.reply_markup.inline_keyboard;
      const lastRow = keyboardRows[keyboardRows.length - 1];

      // Should NOT have Next button on last page
      const nextButton = lastRow.find((btn) => btn.callback_data === 'nav_page_2');
      expect(nextButton).toBeUndefined();
    });
  });
});
