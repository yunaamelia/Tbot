/**
 * Unit tests for Keyboard Builder - Label Truncation Logic
 *
 * Task: T019
 * Requirements: FR-001
 * Feature: 003-enhanced-keyboard
 */

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
});
