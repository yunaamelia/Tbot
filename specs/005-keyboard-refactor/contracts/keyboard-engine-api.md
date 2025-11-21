# API Contract: Keyboard Engine

**Module**: `src/lib/ui/keyboard-engine.js`  
**Version**: 1.0.0  
**Feature**: 005-keyboard-refactor

## Overview

The Keyboard Engine is the core module responsible for generating inline keyboards with FRIDAY persona styling, intelligent layouts, and performance optimization. It orchestrates layout management, persona integration, and caching.

## createKeyboard(items, options)

Creates a responsive inline keyboard with FRIDAY persona styling, role-based filtering, and optimized layout.

**Parameters**:
- `items` (Array<MenuItem>, required): Array of menu items to display
- `options` (Object, optional):
  - `telegramUserId` (number, optional): Telegram user ID for role detection
  - `includeNavigation` (boolean, default: true): Include Home/Back/Help buttons
  - `maxItemsPerRow` (number, default: 3): Maximum items per row
  - `currentPage` (number, default: 0): Current pagination page (for 10+ items)
  - `menuContext` (string, optional): Menu context identifier
  - `includeBreadcrumb` (boolean, default: false): Include breadcrumb row (for 3+ levels)
  - `fridayPersona` (boolean, default: true): Apply FRIDAY persona styling

**Returns**: `Promise<Markup>` - Telegraf inline keyboard markup

**Behavior**:
1. If `telegramUserId` provided: Get user role (cache → database → fail-safe to 'regular')
2. If role detected: Filter items by role (hide admin-only items for regular users)
3. Apply FRIDAY persona styling (emoji indicators, color coding)
4. Calculate optimal layout using layout-manager
5. Add pagination if items > 9 (show 9 items per page)
6. Add breadcrumb row if `includeBreadcrumb` true and navigation depth >= 3
7. Add fixed navigation row (Home/Help/Back) at bottom
8. Cache keyboard layout in Redis
9. Return keyboard markup

**Errors**:
- `ValidationError`: Invalid items array or options
- `DatabaseError`: Database query failure (falls back to regular user when role filtering enabled)

**Example**:
```javascript
const keyboard = await keyboardEngine.createKeyboard([
  { text: '🔵 Produk', callback_data: 'menu_products' },
  { text: '⚪️ Bantuan', callback_data: 'menu_help' }
], {
  telegramUserId: 123456789,
  includeNavigation: true,
  includeBreadcrumb: true,
  menuContext: 'main'
});
```

**Performance**:
- Target: <1 second for uncached keyboards
- Target: <200ms for cached keyboards
- Cache hit rate target: >70% for frequently accessed menus

---

## updateKeyboard(keyboardId, updates)

Updates an existing keyboard with new items, layout, or styling.

**Parameters**:
- `keyboardId` (string, required): Keyboard identifier
- `updates` (Object, required):
  - `items` (Array<MenuItem>, optional): New items array
  - `currentPage` (number, optional): New pagination page
  - `filters` (Object, optional): Applied filters
  - `stockUpdates` (Array<StockUpdate>, optional): Stock status updates

**Returns**: `Promise<Markup>` - Updated Telegraf inline keyboard markup

**Behavior**:
1. Retrieve existing keyboard state from cache
2. Apply updates (items, pagination, filters, stock)
3. Recalculate layout if items changed
4. Update cache entry
5. Return updated keyboard markup

**Errors**:
- `NotFoundError`: Keyboard not found
- `ValidationError`: Invalid updates

**Example**:
```javascript
const updatedKeyboard = await keyboardEngine.updateKeyboard('kb_123', {
  stockUpdates: [
    { productId: 1, available: false, quantity: 0 }
  ]
});
```

---

## getCachedKeyboard(cacheKey)

Retrieves a cached keyboard layout from Redis.

**Parameters**:
- `cacheKey` (string, required): Cache key for keyboard

**Returns**: `Promise<Markup|null>` - Cached keyboard markup or null if not found

**Behavior**:
1. Query Redis for cache key
2. Parse JSON keyboard markup
3. Return markup or null if not found

**Errors**:
- `RedisError`: Redis connection failure (returns null, doesn't throw)

**Performance**:
- Target: <200ms response time
- Graceful degradation: Returns null if Redis unavailable

---

## invalidateCache(cacheKey)

Invalidates a cached keyboard entry.

**Parameters**:
- `cacheKey` (string, required): Cache key to invalidate

**Returns**: `Promise<void>`

**Behavior**:
1. Delete cache entry from Redis
2. Log invalidation for monitoring

**Errors**:
- `RedisError`: Redis connection failure (logged, doesn't throw)

---

## applyFilters(items, filters)

Applies search and filter criteria to menu items.

**Parameters**:
- `items` (Array<MenuItem>, required): Items to filter
- `filters` (Object, required):
  - `stockStatus` (string, optional): 'all', 'available', 'out_of_stock'
  - `category` (string, optional): Category filter
  - `searchTerm` (string, optional): Text search term

**Returns**: `Array<MenuItem>` - Filtered items array

**Behavior**:
1. Apply stock status filter if provided
2. Apply category filter if provided
3. Apply text search if provided (case-insensitive)
4. Return filtered items

**Example**:
```javascript
const filtered = keyboardEngine.applyFilters(items, {
  stockStatus: 'available',
  searchTerm: 'github'
});
```

---

## Data Types

### MenuItem

```typescript
interface MenuItem {
  text: string;              // Button label (max 64 bytes)
  callback_data: string;     // Callback data (max 64 bytes)
  color_type?: string;       // 'primary', 'danger', 'secondary'
  roles?: string[];          // Required roles ['admin', 'regular']
  permissions?: string[];    // Required permissions
  stockStatus?: {            // For product items
    available: boolean;
    quantity: number;
    lastUpdated: string;
  };
}
```

### StockUpdate

```typescript
interface StockUpdate {
  productId: number;
  available: boolean;
  quantity: number;
  timestamp: string;
}
```

---

## Backward Compatibility

This API maintains backward compatibility with existing `keyboard-builder.js`:
- Same function signature for `createKeyboard()`
- Same return type (Telegraf Markup)
- Same error handling patterns
- Gradual migration via adapter pattern

## Integration Points

- **Layout Manager**: Uses `layout-manager.js` for layout calculation
- **FRIDAY Persona**: Uses `keyboard-persona.js` for styling
- **Role Filter**: Uses `role-filter.js` for access control
- **Performance Optimizer**: Uses `performance-optimizer.js` for caching
- **Navigation Engine**: Uses `navigation-engine.js` for breadcrumbs

