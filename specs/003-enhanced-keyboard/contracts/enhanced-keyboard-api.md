# API Contract: Enhanced Inline Keyboard System

**Feature**: 003-enhanced-keyboard  
**Date**: 2025-11-21  
**Purpose**: Define API contracts for enhanced inline keyboard system

## Keyboard Builder API

### `createKeyboard(items, options)` (Extended)

Creates a responsive inline keyboard with role-based filtering, visual enhancements, and pagination. This function extends the existing `createKeyboard()` from Phase 4 (002-friday-enhancement) with new features.

**Parameters**:
- `items` (Array<MenuItem>): Array of menu items to display
- `options` (Object, optional):
  - `telegramUserId` (number, optional): Telegram user ID for role detection (required for role-based filtering)
  - `includeNavigation` (boolean, default: true): Include Home/Help/Back buttons
  - `maxItemsPerRow` (number, default: 3): Maximum items per row
  - `currentPage` (number, default: 1): Current pagination page (for 10+ items)
  - `menuContext` (string, optional): Menu context for logging

**Returns**: `Promise<Markup>` - Telegraf inline keyboard markup

**Behavior**:
1. If `telegramUserId` provided: Get user role (cache → database → fail-safe to 'regular')
2. If role detected: Filter items by role (hide admin-only items for regular users)
3. Apply responsive layout (1-3: 1 row, 4-6: 2 rows, 7-9: 3 rows)
4. Add pagination if items > 9 (show 9 items per page)
5. Add fixed navigation row (Home/Help/Back) at bottom
6. Truncate long labels with ellipsis
7. Return keyboard markup

**Backward Compatibility**: Function maintains backward compatibility. If `telegramUserId` is not provided, works as before (no role filtering).

**Errors**:
- `ValidationError`: Invalid items array or options
- `DatabaseError`: Database query failure (falls back to regular user when role filtering is enabled)

**Example**:
```javascript
// Enhanced usage with role filtering
const keyboard = await createKeyboard([
  { id: '1', label: '🔵 Product A', callback: 'product_1', roles: [] },
  { id: '2', label: '⚪️ Product B', callback: 'product_2', roles: [] },
  { id: '3', label: '🔴 Admin Panel', callback: 'admin_panel', roles: ['admin'] }
], {
  telegramUserId: 123456789,
  includeNavigation: true,
  menuContext: 'main_menu'
});

await ctx.reply('Choose an option:', keyboard);

// Backward compatible usage (no role filtering)
const simpleKeyboard = await createKeyboard([
  { id: '1', label: 'Option 1', callback: 'opt_1' },
  { id: '2', label: 'Option 2', callback: 'opt_2' }
]);
```

### `createPaginatedKeyboard(items, options)`

Creates a paginated keyboard for menus with >9 items.

**Parameters**:
- `items` (Array<MenuItem>): All menu items
- `options` (Object):
  - `telegramUserId` (number, required): Telegram user ID for role detection
  - `currentPage` (number, default: 1): Current page number
  - `itemsPerPage` (number, default: 9): Items per page
  - `includeNavigation` (boolean, default: true): Include Home/Help/Back buttons

**Returns**: `Promise<Markup>` - Telegraf inline keyboard markup with pagination controls

**Behavior**:
1. Filter items by role
2. Slice items for current page (9 items per page)
3. Create layout for page items (3x3 grid)
4. Add pagination controls (Prev/Next buttons) if needed
5. Add fixed navigation row
6. Return keyboard markup

**Pagination Controls**:
- Prev button: Only shown if currentPage > 1
- Next button: Only shown if more pages exist
- Page indicator: Optional (e.g., "Page 1/3")

**Example**:
```javascript
const keyboard = await createPaginatedKeyboard(items, {
  telegramUserId: 123456789,
  currentPage: 2,
  itemsPerPage: 9
});

await ctx.editMessageReplyMarkup(keyboard); // Replace current keyboard inline
```

## Role Filter API

### `filterMenuItemsByRole(items, userRole)`

Filters menu items based on user role visibility rules.

**Parameters**:
- `items` (Array<MenuItem>): Menu items to filter
- `userRole` (string): User role ('admin' or 'regular')

**Returns**: `Array<MenuItem>` - Filtered menu items

**Filtering Rules**:
- Items with empty `roles` array: Visible to all users
- Items with `roles: ['admin']`: Only visible to admin users
- Items with `roles: ['regular']`: Only visible to regular users
- Items with multiple roles: Visible if user role matches any role

**Example**:
```javascript
const filtered = filterMenuItemsByRole([
  { id: '1', label: 'Public Item', roles: [] },
  { id: '2', label: 'Admin Only', roles: ['admin'] },
  { id: '3', label: 'Regular Only', roles: ['regular'] }
], 'admin');

// Returns: [{ id: '1' }, { id: '2' }] (admin can see public + admin items)
```

### `getUserRole(telegramUserId)`

Gets user role with caching and fail-safe mechanism.

**Parameters**:
- `telegramUserId` (number): Telegram user ID

**Returns**: `Promise<{role: string, cached: boolean}>` - User role object

**Behavior**:
1. Try Redis cache first (`role:user:{telegramUserId}`)
2. If cache miss, query database (admins table)
3. If database query fails, default to 'regular' (fail-safe)
4. Cache result with TTL (1 hour)
5. Return role with cache hit indicator

**Fail-Safe**: Always defaults to 'regular' on failure (denies admin privileges)

**Example**:
```javascript
const { role, cached } = await getUserRole(123456789);
// { role: 'admin', cached: true }
// or { role: 'regular', cached: false }
```

## Button State Manager API

### `disableButton(ctx, buttonId, loadingText)`

Disables a button and shows loading indicator.

**Parameters**:
- `ctx` (Context): Telegraf context
- `buttonId` (string): Button callback data
- `loadingText` (string, optional): Loading text (default: '⏳ Processing...')

**Returns**: `Promise<void>`

**Behavior**:
1. Get current keyboard from message
2. Find button by callback_data
3. Replace button text with loading indicator
4. Update keyboard inline (replace current keyboard)
5. Store button state in Redis (timeout: 30 seconds)

**Example**:
```javascript
await disableButton(ctx, 'product_1', '⏳ Loading product...');
// Button text changes to "⏳ Loading product..."
```

### `enableButton(ctx, buttonId, resultText, success)`

Re-enables a button and shows result indicator.

**Parameters**:
- `ctx` (Context): Telegraf context
- `buttonId` (string): Button callback data
- `resultText` (string, optional): Result text
- `success` (boolean, default: true): Whether action succeeded

**Returns**: `Promise<void>`

**Behavior**:
1. Get current keyboard from message
2. Find button by callback_data
3. Replace loading indicator with result text
4. Update keyboard inline
5. Remove button state from Redis

**Example**:
```javascript
await enableButton(ctx, 'product_1', '✅ Product loaded', true);
// Button text changes to "✅ Product loaded"
```

### `isButtonProcessing(buttonId)`

Checks if a button is currently processing.

**Parameters**:
- `buttonId` (string): Button callback data

**Returns**: `Promise<boolean>` - True if button is processing

**Behavior**:
1. Check Redis for button state (`button:state:{buttonId}`)
2. If state is 'processing', check timeout
3. If timeout exceeded, auto-re-enable button
4. Return processing status

**Example**:
```javascript
const isProcessing = await isButtonProcessing('product_1');
if (isProcessing) {
  return; // Ignore duplicate clicks
}
```

## Interaction Logger API

### `logInteraction(telegramUserId, buttonId, buttonLabel, responseTime, metadata)`

Logs user interaction for monitoring and analytics.

**Parameters**:
- `telegramUserId` (number): Telegram user ID
- `buttonId` (string): Button identifier (callback_data)
- `buttonLabel` (string): Button label text
- `responseTime` (number): Response time in milliseconds
- `metadata` (Object, optional): Additional context

**Returns**: `Promise<void>`

**Behavior**:
1. Create interaction log record
2. Insert into database (async, non-blocking)
3. Handle errors gracefully (log but don't throw)

**Example**:
```javascript
const startTime = Date.now();
await performAction();
const responseTime = Date.now() - startTime;

await logInteraction(
  ctx.from.id,
  'product_1',
  '🔵 Product A',
  responseTime,
  { menuContext: 'main_menu', userRole: 'regular' }
);
```

### `getUserInteractionHistory(telegramUserId, limit)`

Gets user interaction history for analytics.

**Parameters**:
- `telegramUserId` (number): Telegram user ID
- `limit` (number, default: 100): Maximum records to return

**Returns**: `Promise<Array<InteractionLog>>` - Interaction log records

**Example**:
```javascript
const history = await getUserInteractionHistory(123456789, 50);
// Returns last 50 interactions for user
```

## Navigation Handler API (Extended from Phase 4)

### `createNavigationRow(options)`

Creates fixed navigation row (Home/Help/Back) for keyboards.

**Parameters**:
- `options` (Object, optional):
  - `showBack` (boolean, default: true): Show Back button
  - `backDisabled` (boolean, default: false): Disable Back button (if at main menu)

**Returns**: `Array<Array<Markup>>` - Navigation button row

**Example**:
```javascript
const navRow = createNavigationRow({ showBack: true, backDisabled: false });
// Returns: [[Home], [Help], [Back]]
```

## Error Handling

### Error Types

- `ValidationError` (400): Invalid input parameters
- `UnauthorizedError` (401): User not authorized for action
- `NotFoundError` (404): Resource not found
- `DatabaseError` (500): Database operation failure
- `CacheError` (502): Cache operation failure (non-critical, falls back to database)

### Error Response Format

```javascript
{
  error: 'Error message in Indonesian',
  code: 'ERROR_CODE',
  details: { /* optional error details */ }
}
```

## Rate Limiting

- Button clicks: 10 clicks per 10 seconds per user (prevents spam)
- Menu requests: 20 requests per minute per user
- Role lookups: Unlimited (cached)

## Webhooks

### Telegram Webhook Endpoint

**Path**: `POST /webhook/telegram`

**Headers**:
- `Content-Type: application/json`

**Body**: Telegram Update object (as per Telegram Bot API)

**Response**: `200 OK` (acknowledgment)

**Behavior**:
1. Validate webhook signature (if configured)
2. Process callback query (button click)
3. Check button state (ignore if processing)
4. Update button state (disable + loading)
5. Execute action
6. Log interaction
7. Update button state (enable + result)

