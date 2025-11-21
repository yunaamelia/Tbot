# Data Model: Enhanced Inline Keyboard System

**Feature**: 003-enhanced-keyboard  
**Date**: 2025-11-21  
**Purpose**: Define data entities, relationships, and validation rules for enhanced inline keyboard system

## Entities

### 1. User Role (Extended from Existing)

**Source**: Existing `admins` and `customers` tables from Phase 4

**Description**: Represents the access level of a user (admin or regular user), determined by registered chat IDs in the system, affects menu visibility and button availability.

**Database Tables**:
- `admins` (existing): Stores admin users with permissions
- `customers` (existing): Stores regular users

**Key Attributes**:
- `telegram_user_id` (bigint, unique, indexed): Telegram user ID (primary identifier)
- `role` (derived): 'admin' if exists in `admins` table, 'regular' if exists in `customers` table, 'regular' if unknown (fail-safe)
- `permissions` (json, admins only): Array of permission strings (existing)

**Relationships**:
- One-to-one with `admins` table (if admin)
- One-to-one with `customers` table (if regular user)

**Validation Rules**:
- `telegram_user_id` must be positive integer (> 0)
- Role detection must default to 'regular' on failure (fail-safe)
- Role must be determined before keyboard creation

**State Transitions**:
- User role changes: Update cache, refresh keyboard on next interaction

**Cache Strategy**:
- Cache key: `role:user:{telegram_user_id}`
- TTL: 1 hour (3600 seconds, configurable)
- Invalidation: On role changes in database

### 2. Menu Item

**Description**: Represents a single button option in a menu, includes label, action, visibility rules based on user role, and visual properties (emoji, color).

**Storage**: In-memory (provided by bot's business logic) or database (menu configurations)

**Key Attributes**:
- `id` (string): Unique identifier for menu item
- `label` (string, max 64 bytes): Button label text (must fit Telegram's 64-byte limit)
- `callback_data` (string, max 64 bytes): Callback data for button (must fit Telegram's 64-byte limit)
- `emoji` (string, optional): Emoji or icon prefix (e.g., "🏠", "🔵")
- `color_type` (enum: 'primary', 'secondary', 'danger', optional): Visual color coding type
- `roles` (array<string>, optional): Allowed roles for visibility (['admin'], ['regular'], or empty for all)
- `action` (string): Action identifier (e.g., 'nav_home', 'page_1', 'admin_stock_update')
- `order` (number, optional): Display order within menu
- `disabled` (boolean, default: false): Whether button is disabled (grayed out)
- `visible` (boolean, default: true): Whether button is visible to current user

**Validation Rules**:
- `label` must not exceed 64 bytes (Telegram limit)
- `callback_data` must not exceed 64 bytes (Telegram limit)
- `label` must be truncated with ellipsis if too long for 3-column grid
- `roles` array must contain valid role names ('admin', 'regular')
- `order` must be non-negative integer

**Relationships**:
- Many-to-one with Menu (items belong to a menu)
- Many-to-many with User Role (items visible to certain roles)

**State Transitions**:
- Button disabled/enabled: Update `disabled` flag, refresh keyboard
- Button visibility: Update `visible` flag based on role, refresh keyboard
- Button label change: Update `label`, refresh keyboard

### 3. Navigation State

**Description**: Represents the user's current position in the menu hierarchy, used for Back button functionality and context-aware help.

**Storage**: In-memory (Redis session) or callback data

**Key Attributes**:
- `telegram_user_id` (bigint): Telegram user ID
- `current_menu` (string): Current menu identifier (e.g., 'main', 'products', 'admin_panel')
- `menu_history` (array<string>): Stack of previous menus for Back navigation
- `page_number` (number, optional): Current pagination page (for paginated menus)
- `timestamp` (datetime): Last navigation timestamp

**Validation Rules**:
- `current_menu` must be non-empty string
- `menu_history` must be array of strings
- `page_number` must be positive integer (if pagination active)

**Relationships**:
- One-to-one with User (each user has one navigation state)

**State Transitions**:
- Navigate forward: Push current menu to history, update current menu
- Navigate back: Pop from history, update current menu
- Navigate home: Clear history, set current menu to 'main'
- Page change: Update page_number, keep menu unchanged

**Cache Strategy**:
- Cache key: `nav:user:{telegram_user_id}`
- TTL: 30 minutes (1800 seconds, configurable)
- Invalidation: On navigation or session timeout

### 4. Interaction Log

**Description**: Represents recorded user actions including timestamp, user ID, button clicked, and response time, used for monitoring and analytics.

**Database Table**: `interaction_logs` (new table)

**Key Attributes**:
- `id` (bigint, primary key, auto-increment): Unique identifier
- `telegram_user_id` (bigint, indexed): Telegram user ID
- `button_id` (string, indexed): Button identifier (callback_data or action)
- `button_label` (string): Button label text (for readability)
- `response_time_ms` (integer): Response time in milliseconds
- `timestamp` (datetime, indexed): Interaction timestamp
- `menu_context` (string, optional): Menu context (e.g., 'main', 'products')
- `user_role` (enum: 'admin', 'regular', optional): User role at time of interaction
- `metadata` (json, optional): Additional context (error details, pagination info, etc.)
- `success` (boolean, default: true): Whether interaction succeeded
- `error_message` (text, optional): Error message if interaction failed

**Validation Rules**:
- `telegram_user_id` must be positive integer (> 0)
- `button_id` must be non-empty string
- `response_time_ms` must be non-negative integer
- `timestamp` must be valid datetime
- `user_role` must be 'admin' or 'regular' (if provided)

**Relationships**:
- Many-to-one with User (multiple interactions per user)
- Many-to-one with Menu Item (multiple interactions per button)

**Indexes**:
- Primary key on `id`
- Index on `telegram_user_id` (for user analytics)
- Index on `button_id` (for button analytics)
- Index on `timestamp` (for time-based queries)
- Composite index on `(telegram_user_id, timestamp)` (for user history)

**Data Retention**:
- Default: 90 days (configurable via environment variable)
- Cleanup job: Delete records older than retention period

### 5. Button State

**Description**: Represents the current state of a button during processing (disabled, loading, enabled).

**Storage**: In-memory (Redis session) or callback data

**Key Attributes**:
- `button_id` (string): Button identifier (callback_data)
- `state` (enum: 'enabled', 'disabled', 'processing'): Current button state
- `processing_start_time` (datetime, optional): When processing started
- `timeout_seconds` (number, optional): Processing timeout (default: 30 seconds)
- `message_id` (bigint, optional): Telegram message ID for keyboard update

**Validation Rules**:
- `state` must be valid enum value
- `processing_start_time` must be valid datetime (if processing)
- `timeout_seconds` must be positive integer (if processing)

**Relationships**:
- One-to-one with Menu Item (each button has one state)

**State Transitions**:
- Enabled → Disabled: User clicks button, disable it
- Disabled → Processing: Action initiated, show loading
- Processing → Enabled: Action completed, re-enable button
- Processing → Error: Action failed, show error, re-enable button

**Timeout Handling**:
- If processing exceeds timeout: Auto-re-enable button, log error
- Timeout default: 30 seconds (configurable)

## Database Schema

### New Migration: `006_add_interaction_logs.js`

```javascript
exports.up = function (knex) {
  return knex.schema.createTable('interaction_logs', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('telegram_user_id').notNullable().index();
    table.string('button_id', 64).notNullable().index();
    table.string('button_label', 255).notNullable();
    table.integer('response_time_ms').notNullable();
    table.timestamp('timestamp').notNullable().defaultTo(knex.fn.now()).index();
    table.string('menu_context', 100);
    table.enum('user_role', ['admin', 'regular']);
    table.json('metadata');
    table.boolean('success').notNullable().defaultTo(true);
    table.text('error_message');
    
    // Composite index for user history queries
    table.index(['telegram_user_id', 'timestamp']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('interaction_logs');
};
```

## Data Validation

### Role Detection

**Rule**: Default to 'regular' user when role detection fails (fail-safe).

**Implementation**:
```javascript
async function getUserRole(telegramUserId) {
  try {
    // Try cache first
    const cached = await redis.get(`role:user:${telegramUserId}`);
    if (cached) return JSON.parse(cached);
    
    // Try database
    const admin = await adminRepository.findByTelegramId(telegramUserId);
    return admin ? { role: 'admin' } : { role: 'regular' };
  } catch (error) {
    // Fail-safe: default to regular user
    logger.warn('Role detection failed, defaulting to regular user', error);
    return { role: 'regular' };
  }
}
```

### Button Label Validation

**Rule**: Truncate labels exceeding 3-column grid width with ellipsis.

**Implementation**:
```javascript
function truncateLabel(label, maxLength = 20) {
  if (label.length <= maxLength) return label;
  return label.substring(0, maxLength - 3) + '...';
}
```

### Callback Data Validation

**Rule**: Validate callback data for security (no injection patterns).

**Implementation**:
```javascript
function validateCallbackData(callbackData) {
  if (callbackData.length > 64) {
    throw new ValidationError('Callback data exceeds 64 bytes');
  }
  if (callbackData.includes(';') || callbackData.includes('--')) {
    throw new ValidationError('Invalid callback data format');
  }
  return true;
}
```

## Data Flow

### 1. Menu Display Flow

1. User requests menu → Get user role (cache → database → fail-safe)
2. Filter menu items by role → Filter visible items
3. Create keyboard layout → Balance layout (O(n))
4. Add navigation buttons → Add Home/Help/Back
5. Send keyboard → Display to user
6. Log interaction → Log menu display (async)

### 2. Button Click Flow

1. User clicks button → Validate callback data
2. Check button state → If processing, ignore click
3. Disable button → Update keyboard (disable + loading indicator)
4. Process action → Execute button action (async)
5. Log interaction → Log click with response time (async)
6. Re-enable button → Update keyboard (enable + result indicator)

### 3. Role Change Flow

1. Admin updates user role → Update database
2. Invalidate cache → Delete `role:user:{telegramUserId}`
3. User next interaction → Fresh role lookup
4. Refresh keyboard → Update visible buttons based on new role

## Performance Considerations

### Indexing Strategy

- `telegram_user_id` indexes: Enable fast role lookups (existing indexes)
- `interaction_logs.timestamp` index: Enable time-based queries
- Composite index `(telegram_user_id, timestamp)`: Optimize user history queries

### Caching Strategy

- Role cache: `role:user:{telegram_user_id}` (TTL: 1 hour)
- Navigation cache: `nav:user:{telegram_user_id}` (TTL: 30 minutes)
- Keyboard layout cache: `keyboard:layout:{hash}` (TTL: 1 hour)

### Query Optimization

- Use connection pooling for database queries
- Batch interaction log inserts (when multiple interactions occur)
- Async logging to prevent blocking user interactions

## Security Considerations

### Fail-Safe Role Detection

- Default to 'regular' user on detection failure
- Prevent unauthorized admin access
- Log role detection failures for monitoring

### Input Validation

- Validate all callback data before processing
- Sanitize button labels (prevent XSS via emoji abuse)
- Rate limit button clicks to prevent abuse

### Audit Logging

- Log all admin button interactions
- Log role changes and access attempts
- Retain logs for security analysis (90 days default)

