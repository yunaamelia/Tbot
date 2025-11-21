# API Contract: Layout Manager

**Module**: `src/lib/ui/layout-manager.js`  
**Version**: 1.0.0  
**Feature**: 005-keyboard-refactor

## Overview

The Layout Manager implements an intelligent 3-column grid layout algorithm that automatically balances button distribution for any number of items (1-1000+), minimizing empty spaces and maximizing visual balance.

## calculateLayout(items, options)

Calculates optimal 3-column grid layout for given items.

**Parameters**:

- `items` (Array<MenuItem>, required): Items to arrange
- `options` (Object, optional):
  - `maxItemsPerRow` (number, default: 3): Maximum items per row
  - `preferBalance` (boolean, default: true): Prefer visual balance over strict distribution

**Returns**: `Array<Array<MenuItem>>` - Array of rows, each row contains items for that row

**Behavior**:

1. Calculate total number of items
2. Determine optimal row distribution:
   - 1-3 items: 1 row
   - 4-6 items: 2 rows (prefer 3-3 over 2-2-2)
   - 7-9 items: 3 rows (prefer 3-3-3 over 2-2-2-1)
   - 10+ items: Use pagination (9 items per page)
3. Distribute items across rows to minimize empty spaces
4. For uneven counts, prefer balanced distribution (e.g., 7 → 3-2-2, 8 → 3-3-2)
5. Return row array

**Algorithm Complexity**: O(n) where n is number of items

**Example**:

```javascript
const rows = layoutManager.calculateLayout(
  [
    { text: 'Item 1', callback_data: 'item_1' },
    { text: 'Item 2', callback_data: 'item_2' },
    // ... 7 more items
  ],
  { maxItemsPerRow: 3 }
);

// Returns: [
//   [item1, item2, item3],
//   [item4, item5, item6],
//   [item7, item8, item9]
// ]
```

---

## calculatePaginationLayout(items, page, itemsPerPage)

Calculates layout for paginated items.

**Parameters**:

- `items` (Array<MenuItem>, required): All items
- `page` (number, required): Current page (0-indexed)
- `itemsPerPage` (number, default: 9): Items per page

**Returns**: `Object` - Pagination layout result

- `rows` (Array<Array<MenuItem>>): Rows for current page
- `pagination` (Object): Pagination context
  - `currentPage` (number): Current page
  - `totalPages` (number): Total pages
  - `startIndex` (number): Start index
  - `endIndex` (number): End index

**Behavior**:

1. Calculate total pages: `Math.ceil(items.length / itemsPerPage)`
2. Calculate start/end indices for current page
3. Slice items for current page
4. Calculate layout for page items using `calculateLayout()`
5. Return rows and pagination context

**Example**:

```javascript
const result = layoutManager.calculatePaginationLayout(allItems, 0, 9);
// Returns: {
//   rows: [[...9 items in 3 rows]],
//   pagination: { currentPage: 0, totalPages: 5, startIndex: 0, endIndex: 9 }
// }
```

---

## optimizeLayout(rows)

Optimizes existing layout to improve visual balance.

**Parameters**:

- `rows` (Array<Array<MenuItem>>, required): Current row layout

**Returns**: `Array<Array<MenuItem>>` - Optimized row layout

**Behavior**:

1. Analyze row distribution (count items per row)
2. Identify imbalances (rows with 1 item when others have 3)
3. Redistribute items to balance rows
4. Maintain 3-column maximum constraint
5. Return optimized layout

**Example**:

```javascript
// Input: [[item1, item2], [item3], [item4, item5]]
// Output: [[item1, item2, item3], [item4, item5]]
```

---

## validateLayout(rows, maxItemsPerRow)

Validates layout against constraints.

**Parameters**:

- `rows` (Array<Array<MenuItem>>, required): Layout to validate
- `maxItemsPerRow` (number, default: 3): Maximum items per row

**Returns**: `boolean` - True if valid, false otherwise

**Behavior**:

1. Check each row doesn't exceed `maxItemsPerRow`
2. Check no empty rows
3. Check all items are included
4. Return validation result

**Errors**:

- `ValidationError`: Layout violates constraints

---

## getLayoutPattern(itemCount)

Returns recommended layout pattern for given item count.

**Parameters**:

- `itemCount` (number, required): Number of items

**Returns**: `Object` - Layout pattern

- `rows` (number): Number of rows
- `cols` (Array<number>): Items per row
- `pattern` (string): Pattern name (e.g., '3x3x2', '3x2x2')

**Example**:

```javascript
const pattern = layoutManager.getLayoutPattern(9);
// Returns: { rows: 3, cols: [3, 3, 3], pattern: '3x3x2' }
```

---

## Performance Considerations

- **Caching**: Layout calculations cached for common item counts (1-20)
- **Complexity**: O(n) algorithm ensures fast calculation even for 1000+ items
- **Memory**: Minimal memory footprint (only stores row arrays)

## Integration Points

- **Keyboard Engine**: Used by `keyboard-engine.js` for layout calculation
- **Performance Optimizer**: Caches layout patterns for performance
