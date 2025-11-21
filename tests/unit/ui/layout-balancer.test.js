/**
 * Unit tests for Layout Balancer algorithm
 *
 * Task: T033
 * Requirements: FR-004
 * Feature: 002-friday-enhancement
 */

const { balanceLayout } = require('../../../src/lib/ui/layout-balancer');

describe('Layout Balancer', () => {
  describe('balanceLayout()', () => {
    it('should balance 7 items into rows with max 3 items per row', () => {
      const items = [1, 2, 3, 4, 5, 6, 7];
      const rows = balanceLayout(items, 3);

      expect(rows.length).toBeGreaterThan(0);
      expect(rows.every((row) => row.length <= 3)).toBe(true);

      // Check balance: difference between max and min row length ≤ 1
      const rowLengths = rows.map((row) => row.length);
      const maxLength = Math.max(...rowLengths);
      const minLength = Math.min(...rowLengths);
      expect(maxLength - minLength).toBeLessThanOrEqual(1);

      // Total items should match
      const totalItems = rows.reduce((sum, row) => sum + row.length, 0);
      expect(totalItems).toBe(7);
    });

    it('should balance 5 items into rows with max 3 items per row', () => {
      const items = [1, 2, 3, 4, 5];
      const rows = balanceLayout(items, 3);

      expect(rows.length).toBeGreaterThan(0);
      expect(rows.every((row) => row.length <= 3)).toBe(true);

      // Should be balanced: [3, 2] or [2, 3]
      const rowLengths = rows.map((row) => row.length);
      const maxLength = Math.max(...rowLengths);
      const minLength = Math.min(...rowLengths);
      expect(maxLength - minLength).toBeLessThanOrEqual(1);

      const totalItems = rows.reduce((sum, row) => sum + row.length, 0);
      expect(totalItems).toBe(5);
    });

    it('should handle items that fit exactly in rows', () => {
      const items = [1, 2, 3, 4, 5, 6];
      const rows = balanceLayout(items, 3);

      expect(rows.length).toBe(2);
      expect(rows[0].length).toBe(3);
      expect(rows[1].length).toBe(3);
    });

    it('should handle items less than maxItemsPerRow', () => {
      const items = [1, 2];
      const rows = balanceLayout(items, 3);

      expect(rows.length).toBe(1);
      expect(rows[0].length).toBe(2);
    });

    it('should handle single item', () => {
      const items = [1];
      const rows = balanceLayout(items, 3);

      expect(rows.length).toBe(1);
      expect(rows[0].length).toBe(1);
    });

    it('should handle empty array', () => {
      const items = [];
      const rows = balanceLayout(items, 3);

      expect(rows.length).toBe(0);
    });

    it('should respect maxItemsPerRow limit', () => {
      const items = Array.from({ length: 20 }, (_, i) => i);
      const rows = balanceLayout(items, 3);

      expect(rows.every((row) => row.length <= 3)).toBe(true);
    });
  });
});
