# Data Model: Premium Store Bot Inline Keyboard System Refactor

**Feature**: 005-keyboard-refactor  
**Date**: 2025-01-27  
**Purpose**: Define data entities, relationships, and validation rules for refactored keyboard system

## Entities

### 1. Keyboard State

**Description**: Represents the current state of a keyboard including layout, items, pagination info, and user context. Used for caching, navigation history, and state restoration.

**Storage**: Redis (cached) with TTL: 1 hour (3600 seconds)

**Key Attributes**:
- `keyboardId` (string, unique): Unique identifier for keyboard instance
- `items` (Array<MenuItem>): Array of menu items to display
- `layout` (Object): Layout configuration (rows, columns, pagination)
- `pagination` (Object, optional): Pagination context if items > 9
  - `currentPage` (number): Current page number (0-indexed)
  - `totalPages` (number): Total number of pages
  - `itemsPerPage` (number): Items per page (default: 9)
- `context` (Object): Menu context (menuId, parentMenuId, breadcrumb)
- `role` (string): User role ('admin' or 'regular')
- `timestamp` (ISO string): Keyboard generation timestamp
- `cacheKey` (string): Redis cache key for this keyboard

**Relationships**:
- One-to-many with MenuItem (keyboard contains multiple items)
- One-to-one with Navigation History (keyboard associated with navigation path)
- Many-to-one with User (multiple keyboards per user)

**Validation Rules**:
- `keyboardId` must be unique and non-empty
- `items` must be array with at least 0 items
- `layout.rows` must be positive integer
- `pagination.currentPage` must be >= 0 and < totalPages
- `role` must be 'admin' or 'regular'

**State Transitions**:
- Created: When keyboard generated
- Updated: When keyboard modified (pagination, filter, etc.)
- Expired: When TTL expires or cache invalidated
- Deleted: When user navigates away or keyboard no longer needed

**Cache Strategy**:
- Cache key: `keyboard:layout:${itemHash}:${role}:${context}`
- TTL: 1 hour (3600 seconds)
- Invalidation: On item changes, role changes, context changes

---

### 2. Navigation History

**Description**: Tracks user's path through menu hierarchy including menu levels, selected items, and context. Stored in Redis with 20-level limit (oldest levels evicted when exceeded). Used for breadcrumb navigation and backtracking.

**Storage**: Redis as JSON array, TTL: 2 hours (7200 seconds), Max: 20 entries

**Key Attributes**:
- `userId` (number): Telegram user ID (primary identifier)
- `history` (Array<HistoryEntry>): Navigation history entries (FIFO, max 20)
  - `level` (number): Menu level (0 = root, 1 = first level, etc.)
  - `menuId` (string): Menu identifier
  - `menuName` (string): Display name for breadcrumb
  - `context` (Object): Menu context (selected items, filters, etc.)
  - `timestamp` (ISO string): Navigation timestamp
- `currentLevel` (number): Current menu level
- `lastUpdated` (ISO string): Last history update timestamp

**Relationships**:
- One-to-one with User (each user has one navigation history)
- One-to-many with Keyboard State (history tracks keyboard navigation)

**Validation Rules**:
- `userId` must be positive integer
- `history` array length must be <= 20
- `level` must be >= 0
- `menuId` must be non-empty string
- History entries must be in chronological order (oldest first)

**State Transitions**:
- Entry Added: When user navigates to new menu level
- Entry Removed: When user navigates back or history limit exceeded
- History Cleared: When user returns to home or history expires

**Eviction Strategy**:
- When history exceeds 20 entries: Remove oldest entries (FIFO)
- When TTL expires: Clear entire history
- On Home navigation: Clear history (optional, user preference)

**Cache Strategy**:
- Cache key: `nav:history:${userId}`
- TTL: 2 hours (7200 seconds)
- Format: JSON array string in Redis

---

### 3. Role-Based Keyboard Configuration

**Description**: Defines keyboard layouts, themes, and available buttons based on user role (admin vs regular). Used for access control and personalized interfaces.

**Storage**: In-memory configuration with Redis caching for role detection

**Key Attributes**:
- `role` (string): User role ('admin' or 'regular')
- `theme` (Object): Keyboard theme configuration
  - `colorScheme` (string): Color scheme identifier ('friday-primary', 'friday-admin', etc.)
  - `emojiPattern` (string): Emoji pattern for buttons
  - `style` (string): Style identifier ('modern', 'classic', etc.)
- `permissions` (Array<string>): Granular permissions for role
  - Examples: ['product:create', 'product:edit', 'order:view', 'admin:access']
- `buttonVisibility` (Object): Button visibility rules
  - `default` (string): Default visibility ('visible', 'hidden', 'disabled')
  - `overrides` (Object): Per-button overrides
- `quickActions` (Array<QuickAction>, admin only): Quick action buttons
  - `label` (string): Button label
  - `callback` (string): Callback data
  - `icon` (string): Emoji icon
  - `permission` (string): Required permission

**Relationships**:
- Many-to-one with User Role (multiple configurations per role type)
- One-to-many with Keyboard State (configuration applied to keyboards)

**Validation Rules**:
- `role` must be 'admin' or 'regular'
- `permissions` must be array of non-empty strings
- `buttonVisibility.default` must be 'visible', 'hidden', or 'disabled'

**State Transitions**:
- Loaded: When role detected or configuration fetched
- Cached: When stored in Redis for performance
- Invalidated: When role changes or permissions updated

**Cache Strategy**:
- Cache key: `keyboard:config:${role}`
- TTL: 1 hour (3600 seconds)
- Invalidation: On role changes, permission updates

---

### 4. Stock-Aware Menu Item

**Description**: Extends standard menu items with real-time stock status, availability indicators, and update timestamps. Used for product selection keyboards that reflect current inventory.

**Storage**: In-memory (provided by product service) with Redis pub/sub for updates

**Key Attributes**:
- `id` (string): Menu item identifier
- `label` (string, max 64 bytes): Button label text
- `callback_data` (string, max 64 bytes): Callback data
- `stockStatus` (Object, product items only): Real-time stock information
  - `available` (boolean): Whether product is in stock
  - `quantity` (number): Current stock quantity
  - `lastUpdated` (ISO string): Last stock update timestamp
  - `updateSource` (string): Update source ('admin', 'system', 'webhook')
- `visualIndicator` (string): Emoji indicator for stock status
  - '✅' for available
  - '❌' for out of stock
  - '⚠️' for low stock (< 5 items)
- `colorType` (string): Color type for FRIDAY persona ('primary', 'danger', 'secondary')

**Relationships**:
- Many-to-one with Product (menu item represents product)
- One-to-many with Keyboard State (item appears in keyboards)

**Validation Rules**:
- `label` must be <= 64 bytes (Telegram API limit)
- `callback_data` must be <= 64 bytes (Telegram API limit)
- `stockStatus.quantity` must be >= 0
- `stockStatus.lastUpdated` must be valid ISO timestamp

**State Transitions**:
- Created: When menu item generated
- Stock Updated: When stock quantity changes (via Redis pub/sub)
- Status Changed: When availability status changes (available ↔ out of stock)
- Keyboard Updated: When keyboard refreshed with new stock status

**Real-Time Updates**:
- Subscribe to Redis channel: `stock:update`
- On update: Refresh menu item stock status
- Update active keyboards via `editMessageReplyMarkup`
- Target: <5 seconds from stock change to keyboard update

---

### 5. Keyboard Cache Entry

**Description**: Stores generated keyboard layouts in Redis with TTL, cache keys based on items, role, and context. Used for performance optimization and reducing generation time.

**Storage**: Redis with TTL: 1 hour (3600 seconds)

**Key Attributes**:
- `cacheKey` (string, unique): Redis cache key
- `keyboardMarkup` (Object): Telegraf keyboard markup object
- `itemHash` (string): Hash of items array (for cache key generation)
- `role` (string): User role ('admin' or 'regular')
- `context` (string): Menu context identifier
- `createdAt` (ISO string): Cache entry creation timestamp
- `ttl` (number): Time-to-live in seconds (default: 3600)
- `hitCount` (number): Cache hit counter (for analytics)

**Relationships**:
- One-to-one with Keyboard State (cache entry stores keyboard state)

**Validation Rules**:
- `cacheKey` must be unique and non-empty
- `keyboardMarkup` must be valid Telegraf markup object
- `ttl` must be positive integer
- `hitCount` must be >= 0

**State Transitions**:
- Created: When keyboard generated and cached
- Hit: When cached keyboard retrieved (increment hitCount)
- Expired: When TTL expires
- Invalidated: When cache manually invalidated (item changes, role changes)

**Cache Key Generation**:
```javascript
// Format: keyboard:layout:${itemHash}:${role}:${context}
const itemHash = hashItems(items) // MD5 or SHA-256 hash
const cacheKey = `keyboard:layout:${itemHash}:${role}:${context}`
```

**Performance Targets**:
- Cache hit rate: >70% for frequently accessed menus
- Cache response time: <200ms
- 50% reduction in keyboard generation time for cached keyboards

---

### 6. Pagination Context

**Description**: Tracks current page, total pages, item range, and preloaded pages for paginated keyboards. Used for efficient navigation of large item sets.

**Storage**: In-memory (part of Keyboard State) with Redis caching for preloaded pages

**Key Attributes**:
- `currentPage` (number): Current page number (0-indexed)
- `totalPages` (number): Total number of pages
- `itemsPerPage` (number): Items per page (default: 9)
- `totalItems` (number): Total number of items
- `startIndex` (number): Start index of current page items
- `endIndex` (number): End index of current page items
- `preloadedPages` (Array<number>): Preloaded page numbers (for performance)
- `preloadTimestamp` (ISO string): When preloading occurred

**Relationships**:
- One-to-one with Keyboard State (pagination context part of keyboard state)

**Validation Rules**:
- `currentPage` must be >= 0 and < totalPages
- `totalPages` must be >= 1
- `itemsPerPage` must be positive integer (default: 9)
- `startIndex` must be >= 0 and < totalItems
- `endIndex` must be > startIndex and <= totalItems

**State Transitions**:
- Created: When pagination initialized (items > 9)
- Page Changed: When user navigates to different page
- Preloaded: When adjacent pages loaded in background
- Reset: When items change or filter applied

**Preloading Strategy**:
- When user on page N: Preload pages N-1 and N+1
- Store preloaded pages in Redis with short TTL (5 minutes)
- Serve preloaded pages instantly when user navigates
- Target: <200ms pagination response time

---

### 7. Active Keyboard Registry

**Description**: Tracks which users are currently viewing which product keyboards. Used for real-time stock update propagation.

**Storage**: Redis Sets with TTL: 1 hour (3600 seconds)

**Key Attributes**:
- `productId` (number): Product identifier
- `keyboardIds` (Set<string>): Set of active keyboard IDs viewing this product
- `userId` (number, per keyboard): Telegram user ID for each keyboard
- `messageId` (number, per keyboard): Telegram message ID for keyboard
- `createdAt` (ISO string): Registry entry creation timestamp
- `ttl` (number): Time-to-live in seconds (default: 3600)

**Relationships**:
- Many-to-one with Product (multiple keyboards per product)
- One-to-many with User (user can have multiple active keyboards)

**Validation Rules**:
- `productId` must be positive integer
- `keyboardIds` must be Set of non-empty strings
- `userId` must be positive integer
- `messageId` must be positive integer

**State Transitions**:
- Added: When product keyboard displayed to user
- Updated: When keyboard updated (stock change)
- Removed: When user navigates away or keyboard expires
- Cleared: When TTL expires or product deleted

**Registry Operations**:
```javascript
// Add keyboard to registry
await redis.sadd(`keyboards:active:${productId}`, keyboardId)

// Get all active keyboards for product
const keyboards = await redis.smembers(`keyboards:active:${productId}`)

// Remove keyboard from registry
await redis.srem(`keyboards:active:${productId}`, keyboardId)
```

**Real-Time Update Flow**:
1. Stock update occurs → publish to Redis channel
2. Query active keyboards registry for product
3. Update each active keyboard via `editMessageReplyMarkup`
4. Remove failed keyboards from registry (message deleted, user left)

---

## Data Relationships Diagram

```
User (1) ──< (many) Navigation History (1) ──< (many) Keyboard State
                                                      │
                                                      ├──< (many) MenuItem
                                                      │
                                                      └──< (1) Pagination Context

User Role (1) ──< (1) Role-Based Keyboard Configuration
                              │
                              └──> (applied to) Keyboard State

Product (1) ──< (many) Stock-Aware Menu Item ──< (many) Keyboard State
                                                      │
                                                      └──> (registered in) Active Keyboard Registry

Keyboard State ──> (cached in) Keyboard Cache Entry
```

## Validation Rules Summary

- All string fields must be non-empty (unless optional)
- All numeric fields must be positive integers (unless specified otherwise)
- All timestamps must be valid ISO 8601 strings
- All cache keys must be unique and follow naming convention
- All Telegram API limits must be respected (64 bytes per button, 100 buttons max)
- All Redis TTLs must be positive integers
- All array lengths must respect limits (20 for navigation history, 9 for items per page)

## State Management

- **Keyboard State**: Managed in Redis with TTL-based expiration
- **Navigation History**: Managed in Redis with FIFO eviction (20-level limit)
- **Active Keyboard Registry**: Managed in Redis Sets with TTL-based cleanup
- **Cache Entries**: Managed in Redis with TTL and manual invalidation
- **Stock Updates**: Real-time via Redis pub/sub, no persistent storage needed

## Performance Considerations

- All Redis operations should have timeout protection (prevent hanging)
- Cache keys should be optimized for fast lookup (hash-based)
- Navigation history should be kept minimal (20-level limit)
- Active keyboard registry should be cleaned up regularly (TTL-based)
- Pagination context should be lightweight (in-memory, not persisted)

