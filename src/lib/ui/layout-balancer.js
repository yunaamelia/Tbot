/**
 * Layout Balancer - Auto-balances incomplete rows to distribute items evenly
 *
 * Task: T034
 * Requirements: FR-004
 * Feature: 002-friday-enhancement
 */

const logger = require('../shared/logger').child('layout-balancer');

/**
 * Auto-balance incomplete rows to distribute items evenly across available space
 * @param {Array} items - Items to balance
 * @param {number} maxItemsPerRow - Maximum items per row (default: 3)
 * @returns {Array<Array>} Array of rows, each row is array of items
 */
function balanceLayout(items, maxItemsPerRow = 3) {
  if (!Array.isArray(items)) {
    logger.warn('balanceLayout: items must be an array', { items });
    return [];
  }

  if (items.length === 0) {
    return [];
  }

  if (items.length <= maxItemsPerRow) {
    return [items];
  }

  // Calculate optimal distribution
  const totalItems = items.length;
  const numRows = Math.ceil(totalItems / maxItemsPerRow);

  const rows = [];
  let currentIndex = 0;

  // Distribute items across rows
  for (let rowIndex = 0; rowIndex < numRows; rowIndex++) {
    const remainingRows = numRows - rowIndex;
    const remainingItems = totalItems - currentIndex;
    const itemsInThisRow = Math.ceil(remainingItems / remainingRows);

    const row = items.slice(currentIndex, currentIndex + itemsInThisRow);
    rows.push(row);
    currentIndex += itemsInThisRow;
  }

  // Verify balance: difference between max and min row length ≤ 1
  const rowLengths = rows.map((row) => row.length);
  const maxLength = Math.max(...rowLengths);
  const minLength = Math.min(...rowLengths);

  if (maxLength - minLength > 1) {
    logger.warn('Layout not perfectly balanced', {
      rowLengths,
      maxLength,
      minLength,
      difference: maxLength - minLength,
    });
  }

  return rows;
}

module.exports = {
  balanceLayout,
};
