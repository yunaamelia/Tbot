# API Contract: Navigation Engine

**Module**: `src/lib/ui/navigation-engine.js`  
**Version**: 1.0.0  
**Feature**: 005-keyboard-refactor

## Overview

The Navigation Engine manages breadcrumb navigation, navigation history tracking, and contextual back navigation for deep menu structures.

## addNavigationEntry(userId, menuId, menuName, context)

Adds a navigation entry to user's history.

**Parameters**:
- `userId` (number, required): Telegram user ID
- `menuId` (string, required): Menu identifier
- `menuName` (string, required): Display name for breadcrumb
- `context` (Object, optional): Menu context (selected items, filters, etc.)

**Returns**: `Promise<void>`

**Behavior**:
1. Retrieve existing navigation history from Redis
2. Add new entry to history array
3. If history exceeds 20 entries, remove oldest (FIFO eviction)
4. Update Redis with new history
5. Set TTL: 2 hours (7200 seconds)

**Errors**:
- `ValidationError`: Invalid parameters
- `RedisError`: Redis connection failure (logged, doesn't throw)

---

## getNavigationHistory(userId)

Retrieves user's navigation history.

**Parameters**:
- `userId` (number, required): Telegram user ID

**Returns**: `Promise<Array<HistoryEntry>>` - Navigation history array (oldest first)

**Behavior**:
1. Retrieve navigation history from Redis
2. Parse JSON array
3. Return history entries or empty array if not found

**Errors**:
- `RedisError`: Redis connection failure (returns empty array)

---

## generateBreadcrumb(userId, maxLength)

Generates breadcrumb string from navigation history.

**Parameters**:
- `userId` (number, required): Telegram user ID
- `maxLength` (number, default: 64): Maximum breadcrumb length (bytes)

**Returns**: `Promise<string>` - Breadcrumb string (e.g., "Home > Products > Add")

**Behavior**:
1. Retrieve navigation history
2. Extract menu names from history entries
3. Join with " > " separator
4. Truncate if exceeds `maxLength` (preserve last menu name)
5. Return breadcrumb string

**Example**:
```javascript
const breadcrumb = await navigationEngine.generateBreadcrumb(123456789, 64);
// Returns: "Home > Products > Add"
```

---

## navigateBack(userId)

Navigates user back to previous menu level.

**Parameters**:
- `userId` (number, required): Telegram user ID

**Returns**: `Promise<HistoryEntry|null>` - Previous navigation entry or null if at root

**Behavior**:
1. Retrieve navigation history
2. Remove last entry (current level)
3. Return previous entry (new current level)
4. Update Redis with updated history

**Errors**:
- `NotFoundError`: No history available (user at root level)

---

## clearHistory(userId)

Clears user's navigation history.

**Parameters**:
- `userId` (number, required): Telegram user ID

**Returns**: `Promise<void>`

**Behavior**:
1. Delete navigation history from Redis
2. Log history cleared event

---

## getCurrentLevel(userId)

Gets user's current navigation level.

**Parameters**:
- `userId` (number, required): Telegram user ID

**Returns**: `Promise<number>` - Current level (0 = root, 1 = first level, etc.)

**Behavior**:
1. Retrieve navigation history
2. Return history array length (current level)

---

## Data Types

### HistoryEntry

```typescript
interface HistoryEntry {
  level: number;           // Menu level (0 = root)
  menuId: string;          // Menu identifier
  menuName: string;        // Display name for breadcrumb
  context: Object;         // Menu context (selected items, filters)
  timestamp: string;       // ISO timestamp
}
```

---

## Performance Considerations

- **Redis Operations**: All operations use Redis with timeout protection
- **History Limit**: 20 entries maximum (FIFO eviction)
- **TTL**: 2 hours (7200 seconds) auto-expiration
- **Breadcrumb Generation**: O(n) where n is history length

## Integration Points

- **Keyboard Engine**: Uses navigation engine for breadcrumb generation
- **Redis**: Stores navigation history with TTL

