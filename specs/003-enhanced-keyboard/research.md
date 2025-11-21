# Research: Enhanced Inline Keyboard System

**Feature**: 003-enhanced-keyboard  
**Date**: 2025-11-21  
**Purpose**: Research best practices and patterns for implementing enhanced inline keyboard system with role-based access control, visual feedback, and performance optimization

## Technology Research

### 1. Telegraf Inline Keyboard Best Practices

**Source**: Context7 - `/telegraf/telegraf`

**Decision**: Use Telegraf's `Markup.inlineKeyboard()` for creating responsive layouts and `ctx.editMessageReplyMarkup()` for inline updates.

**Rationale**:
- Telegraf provides direct access to Telegram Bot API inline keyboard methods
- `Markup.inlineKeyboard()` supports multi-row layouts with callback buttons
- `ctx.editMessageReplyMarkup()` allows updating keyboards inline without new messages
- Pattern matching for callbacks enables dynamic button handling (e.g., `/^page_(.+)$/`)

**Alternatives Considered**:
- Raw Telegram Bot API calls: More verbose, less maintainable
- Higher-level abstraction libraries: Violates Article VIII (Anti-Abstraction)

**Key Patterns**:
```javascript
// Multi-row keyboard with callbacks
Markup.inlineKeyboard([
  [
    Markup.button.callback('Option 1', 'opt_1'),
    Markup.button.callback('Option 2', 'opt_2')
  ],
  [Markup.button.callback('Option 3', 'opt_3')]
])

// Inline keyboard update (replace current keyboard)
await ctx.editMessageReplyMarkup(
  Markup.inlineKeyboard([...])
)
```

**Limitations**:
- Telegram Bot API limit: 100 buttons per inline keyboard
- Button text limit: 64 bytes per button
- Callback data limit: 64 bytes per callback
- Cannot update buttons while action is processing (must wait for completion)

### 2. Redis Caching for Role Detection

**Source**: Context7 - `/redis/ioredis`

**Decision**: Use ioredis with TTL for role caching to minimize database queries.

**Rationale**:
- ioredis provides robust Redis client with connection pooling and retry strategies
- TTL (Time-To-Live) ensures cached roles expire appropriately
- Autopipelining can batch multiple cache operations for better performance
- Graceful error handling when Redis is unavailable (fail-safe to database)

**Alternatives Considered**:
- Memory caching: Not shared across instances, requires cache invalidation logic
- Database-only queries: Too slow for menu loading (< 200ms target)

**Key Patterns**:
```javascript
// Cache with TTL
await redis.setex(`role:user:${telegramUserId}`, TTL, JSON.stringify(roleData));

// Get with fallback
const cached = await redis.get(`role:user:${telegramUserId}`);
const role = cached ? JSON.parse(cached) : await fetchFromDatabase();

// Hash operations for role data
await redis.hset(`user:${telegramUserId}`, 'role', 'admin');
await redis.hset(`user:${telegramUserId}`, 'permissions', JSON.stringify(perms));
await redis.expire(`user:${telegramUserId}`, TTL);
```

**Performance Considerations**:
- Default TTL: 1 hour (configurable via environment variable)
- Cache key format: `role:user:{telegramUserId}` for consistency
- Cache invalidation: On role changes in database
- Timeout protection: 100ms timeout for cache operations to prevent hanging

### 3. Database Role Detection with Knex.js

**Source**: Context7 - `/knex/knex`

**Decision**: Use Knex.js for type-safe role queries with connection pooling.

**Rationale**:
- Knex.js provides database abstraction for PostgreSQL/MySQL support (constitution requirement)
- Connection pooling minimizes database connection overhead
- Transaction support for atomic role updates
- Query builder simplifies role-based filtering logic

**Alternatives Considered**:
- Raw SQL: Less maintainable, harder to switch between databases
- ORM (Sequelize, TypeORM): More abstraction than needed (violates Article VIII)

**Key Patterns**:
```javascript
// Role lookup with connection pooling
const admin = await knex('admins')
  .where('telegram_user_id', telegramUserId)
  .first();

// Transaction for role updates
await knex.transaction(async (trx) => {
  await trx('admins').where('id', adminId).update({ ... });
  await trx('admin_logs').insert({ ... });
});
```

**Performance Considerations**:
- Connection pool: min 2, max 10 (existing configuration)
- Index on `telegram_user_id` for fast lookups
- Query timeout: 5 seconds (configurable)

### 4. Express.js Webhook Handling

**Source**: Context7 - `/expressjs/express`

**Decision**: Use Express.js for webhook endpoints with middleware for validation and rate limiting.

**Rationale**:
- Express.js is essential for webhook server (not abstraction layer)
- Middleware pattern enables request validation and rate limiting
- Router for modular webhook endpoint organization
- Error handling middleware for consistent error responses

**Alternatives Considered**:
- Raw Node.js HTTP server: Too verbose, less maintainable
- Fastify: Different API, would require migration of existing webhook handlers

**Key Patterns**:
```javascript
// Webhook route with middleware
app.post('/webhook/telegram', 
  express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }),
  rateLimit({ windowMs: 1000, max: 100 }),
  webhookHandler
);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Webhook error', err);
  res.status(500).json({ error: 'Internal server error' });
});
```

## Implementation Patterns

### 1. Button State Management

**Decision**: Disable buttons during processing, show loading indicator, restore after completion.

**Rationale**:
- Prevents duplicate actions and race conditions
- Provides clear visual feedback to users
- Telegram Bot API supports button state changes via `editMessageReplyMarkup()`

**Pattern**:
```javascript
// Disable button during processing
const processingKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback('⏳ Processing...', 'processing', false)] // disabled
]);

await ctx.editMessageReplyMarkup(processingKeyboard);

// Perform action
await performAction();

// Restore enabled button
const resultKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback('✅ Complete', 'action_complete')]
]);

await ctx.editMessageReplyMarkup(resultKeyboard);
```

**Limitations**:
- Telegram Bot API does not support native button disabled state
- Workaround: Use callback data with state checking, or show loading text
- Cannot prevent clicks during processing (must handle in callback logic)

### 2. Role-Based Button Filtering

**Decision**: Filter menu items based on user role before keyboard creation, cache role lookup.

**Rationale**:
- Reduces complexity of keyboard creation logic
- Cached role lookups improve performance (< 200ms target)
- Fail-safe default (regular user) ensures security

**Pattern**:
```javascript
// Get user role (with caching)
async function getUserRole(telegramUserId) {
  // Try cache first
  const cached = await redis.get(`role:user:${telegramUserId}`);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Fallback to database (with fail-safe)
  try {
    const admin = await adminRepository.findByTelegramId(telegramUserId);
    const role = admin ? 'admin' : 'regular';
    
    // Cache for future lookups
    await redis.setex(`role:user:${telegramUserId}`, TTL, JSON.stringify({ role }));
    
    return { role };
  } catch (error) {
    // Fail-safe: default to regular user
    logger.warn('Role detection failed, defaulting to regular user', error);
    return { role: 'regular' };
  }
}

// Filter menu items by role
function filterMenuItemsByRole(items, userRole) {
  return items.filter(item => {
    if (!item.roles || item.roles.length === 0) return true;
    return item.roles.includes(userRole);
  });
}
```

### 3. Pagination Pattern

**Decision**: Replace current keyboard inline (same message) when navigating pages.

**Rationale**:
- Keeps context in one message (better UX)
- More efficient than creating new messages
- Matches clarified requirement (from spec clarifications)

**Pattern**:
```javascript
// Pagination navigation
async function navigatePage(ctx, pageNumber) {
  const items = await getMenuItems();
  const pageItems = paginate(items, pageNumber, ITEMS_PER_PAGE);
  
  const keyboard = Markup.inlineKeyboard([
    ...pageItems.map(item => [Markup.button.callback(item.label, item.callback)]),
    [
      Markup.button.callback('◀️ Prev', `page_${pageNumber - 1}`),
      Markup.button.callback('▶️ Next', `page_${pageNumber + 1}`)
    ]
  ]);
  
  // Replace current keyboard (not new message)
  await ctx.editMessageReplyMarkup(keyboard);
}
```

### 4. Visual Feedback Pattern

**Decision**: Use emojis and color coding via button text, loading indicators via button labels.

**Rationale**:
- Telegram Bot API does not support native button colors
- Emojis provide visual distinction (✅, ❌, 🔒, etc.)
- Loading states via button text changes (⏳ Processing...)

**Pattern**:
```javascript
// Color coding via emojis
const PRIMARY_BUTTON = '🔵 Action';      // Blue circle emoji
const SECONDARY_BUTTON = '⚪️ Option';    // White circle emoji
const DANGER_BUTTON = '🔴 Delete';       // Red circle emoji
const DISABLED_BUTTON = '🔒 Locked';     // Lock emoji

// Loading state
const LOADING_BUTTON = '⏳ Processing...';

// Success/Error states
const SUCCESS_BUTTON = '✅ Complete';
const ERROR_BUTTON = '❌ Failed';
```

**Limitations**:
- No native button colors in Telegram Bot API
- Must use emoji indicators for visual distinction
- Button text changes require message edit (has rate limits)

### 5. Interaction Logging Pattern

**Decision**: Log all user interactions (who, what, when, response time) to database with structured logging.

**Rationale**:
- Required for monitoring and analytics (FR-019, FR-020, FR-021)
- Structured logging enables querying and analysis
- Async logging to prevent blocking user interactions

**Pattern**:
```javascript
// Log interaction
async function logInteraction(userId, buttonId, responseTime) {
  try {
    await knex('interaction_logs').insert({
      telegram_user_id: userId,
      button_id: buttonId,
      response_time_ms: responseTime,
      timestamp: new Date(),
      metadata: JSON.stringify({ /* additional context */ })
    });
  } catch (error) {
    // Log error but don't block user interaction
    logger.error('Failed to log interaction', error);
  }
}

// Middleware for automatic logging
function withInteractionLogging(handler) {
  return async (ctx) => {
    const startTime = Date.now();
    try {
      await handler(ctx);
      const responseTime = Date.now() - startTime;
      await logInteraction(ctx.from.id, ctx.callbackQuery.data, responseTime);
    } catch (error) {
      await logInteraction(ctx.from.id, ctx.callbackQuery.data, null, error);
      throw error;
    }
  };
}
```

## Performance Optimization

### 1. Redis Caching Strategy

**Decision**: Cache role lookups with 1-hour TTL, cache keyboard layouts with 1-hour TTL.

**Rationale**:
- Role lookups occur on every menu display (high frequency)
- Keyboard layouts are expensive to compute (O(n) but still benefits from caching)
- 1-hour TTL balances freshness with performance

**Cache Keys**:
- `role:user:{telegramUserId}` - User role cache (TTL: 3600s)
- `keyboard:layout:{hash}` - Keyboard layout cache (TTL: 3600s)

**Cache Invalidation**:
- Role cache: On role changes in database
- Keyboard cache: On menu content changes

### 2. Database Query Optimization

**Decision**: Use indexes on `telegram_user_id`, connection pooling, query timeouts.

**Rationale**:
- Index on `telegram_user_id` ensures O(log n) lookup time
- Connection pooling reduces connection overhead
- Query timeouts prevent hanging operations

**Indexes**:
```sql
-- Existing index (from Phase 4)
CREATE INDEX idx_admins_telegram_user_id ON admins(telegram_user_id);
CREATE INDEX idx_customers_telegram_user_id ON customers(telegram_user_id);
```

### 3. Algorithm Complexity

**Decision**: Maintain O(n) complexity for layout balancing (existing from Phase 4).

**Rationale**:
- Phase 4 implementation already achieves O(n) complexity
- No nested loops or recursive calls
- Scales efficiently to 50+ items

**Analysis**:
- Layout balancing: O(n) - single pass through items
- Role filtering: O(n) - single pass through items
- Pagination: O(1) - simple array slicing
- Total: O(n) where n is number of menu items

## Security Considerations

### 1. Role Detection Fail-Safe

**Decision**: Default to regular user (limited access) when role detection fails.

**Rationale**:
- Follows principle of least privilege
- Prevents unauthorized admin access on failures
- Matches clarified requirement (from spec clarifications)

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

### 2. Input Validation

**Decision**: Validate all callback data and button actions before processing.

**Rationale**:
- Prevents injection attacks via callback data
- Validates button actions match expected patterns
- Required for security-first approach (Article XII)

**Pattern**:
```javascript
// Validate callback data
function validateCallbackData(callbackData) {
  if (callbackData.length > 64) {
    throw new ValidationError('Callback data exceeds 64 bytes');
  }
  
  // Check for malicious patterns
  if (callbackData.includes(';') || callbackData.includes('--')) {
    throw new ValidationError('Invalid callback data format');
  }
  
  return true;
}
```

## Integration Points

### 1. Extending Existing Keyboard Builder

**Decision**: Extend `src/lib/ui/keyboard-builder.js` from Phase 4 (002-friday-enhancement) rather than replacing.

**Rationale**:
- Phase 4 implementation already provides responsive layouts
- Backward compatibility required
- Extending is more maintainable than duplicating

**Extension Points**:
- Add role-based filtering before layout balancing
- Add button state management after keyboard creation
- Add interaction logging after button actions

### 2. Integration with Access Control

**Decision**: Use existing `src/lib/security/access-control.js` for role detection.

**Rationale**:
- Existing module already implements role detection logic
- Add caching layer on top of existing functionality
- Maintains consistency with existing security patterns

## Testing Strategy

### 1. Integration Tests

**Decision**: Use real Telegram Bot API for all keyboard interaction tests.

**Rationale**:
- Required by Article IX (Integration-First Testing)
- Validates actual Telegram behavior
- Catches API-specific issues early

**Test Scenarios**:
- Keyboard rendering with different item counts (1-3, 4-6, 7-9, 10+)
- Pagination navigation (forward/backward)
- Role-based button visibility (admin vs regular user)
- Button state transitions (enabled → disabled → enabled)
- Visual feedback (loading states, animations)

### 2. Unit Tests

**Decision**: Unit tests for layout algorithms, role filtering, state management.

**Rationale**:
- Faster execution for development iteration
- Tests business logic independently
- Required by Article III (Test-First Imperative)

**Test Coverage**:
- Layout balancing algorithm (O(n) complexity verification)
- Role filtering logic (admin vs regular user)
- Button state management (disabled/enabled transitions)
- Interaction logging (data structure validation)

## Dependencies

### Required Libraries

- **Telegraf 4.15.0**: Telegram Bot API framework (existing)
- **ioredis 5.3.2**: Redis client for caching (existing)
- **Knex.js 3.0.1**: Database query builder (existing)
- **Express 4.18.2**: Webhook server (existing)
- **Jest 29.7.0**: Testing framework (existing)

**No New Dependencies Required**: All required libraries are already in use.

## Open Questions Resolved

1. **Pagination behavior**: Replace current keyboard inline (clarified in spec)
2. **Button state during processing**: Disable button + show loading indicator (clarified in spec)
3. **Role detection failure**: Default to regular user (clarified in spec)
4. **Long button labels**: Truncate with ellipsis (clarified in spec)
5. **Pagination threshold**: Only show at 10+ items (clarified in spec)

## Next Steps

1. Create data model for interaction logs
2. Design API contracts for keyboard builder extensions
3. Create quickstart guide for testing enhanced keyboards
4. Break down implementation into tasks (Phase 2)

