# Research: Premium Store Bot Inline Keyboard System Refactor

**Feature**: 005-keyboard-refactor  
**Date**: 2025-01-27  
**Purpose**: Research best practices and patterns for implementing comprehensive keyboard system refactor with FRIDAY persona, advanced layouts, navigation, and performance optimization

## Technology Research

### 1. Telegraf Inline Keyboard Best Practices

**Source**: Existing implementation (003-enhanced-keyboard), Telegraf documentation

**Decision**: Use Telegraf's `Markup.inlineKeyboard()` for creating responsive layouts and `ctx.editMessageReplyMarkup()` for inline updates. Extend existing patterns with new engine architecture.

**Rationale**:
- Telegraf provides direct access to Telegram Bot API inline keyboard methods
- `Markup.inlineKeyboard()` supports multi-row layouts with callback buttons
- `ctx.editMessageReplyMarkup()` allows updating keyboards inline without new messages
- Pattern matching for callbacks enables dynamic button handling
- Existing implementation (keyboard-builder.js) provides foundation for refactor

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

**Refactor Approach**:
- Create modular keyboard-engine.js that encapsulates generation logic
- Separate layout calculation (layout-manager.js) from keyboard building
- Implement plugin architecture for extensibility

---

### 2. Advanced 3-Column Grid Layout Algorithm

**Source**: Existing layout-balancer.js, mathematical grid algorithms

**Decision**: Implement intelligent auto-balancing algorithm that distributes items across rows to minimize empty spaces while maintaining 3-column maximum constraint.

**Rationale**:
- Current implementation handles basic cases (1-9 items) but needs enhancement for edge cases
- Mathematical approach: divide items into rows of 3, handle remainders optimally
- Visual balance: prefer 3-3-3 over 2-2-2-3 for 9 items
- Performance: O(n) complexity for any number of items

**Algorithm Approach**:
```javascript
// For n items:
// 1. Calculate rows: Math.ceil(n / 3)
// 2. Distribute items: first rows get 3 items, last row gets remainder
// 3. For remainders: prefer 2-2 over 1-1-1 (visual balance)
// 4. Handle edge cases: 7 items → 3-2-2, 8 items → 3-3-2
```

**Optimization**:
- Cache layout calculations for common item counts
- Pre-compute layouts for 1-20 items (most common cases)
- Use dynamic calculation for 20+ items

**Alternatives Considered**:
- Fixed patterns only: Rejected - too rigid, doesn't handle all cases
- Pure mathematical distribution: Rejected - doesn't consider visual balance
- Machine learning approach: Rejected - overkill, adds complexity

---

### 3. Redis Caching Strategy for Keyboards

**Source**: Existing Redis implementation, ioredis documentation

**Decision**: Use ioredis with multi-level caching: (1) Keyboard layout cache (TTL: 1 hour), (2) Navigation history cache (TTL: 2 hours, 20-level limit), (3) Role-based keyboard cache (TTL: 1 hour).

**Rationale**:
- ioredis provides robust Redis client with connection pooling and retry strategies
- TTL ensures cached keyboards expire appropriately
- Multi-level caching reduces database queries and generation time
- Cache keys based on items hash, role, and context for accurate invalidation

**Cache Key Strategy**:
```javascript
// Layout cache: `keyboard:layout:${itemHash}:${role}:${context}`
// History cache: `nav:history:${userId}`
// Role cache: `role:user:${userId}` (existing)
```

**Cache Invalidation**:
- Layout cache: Invalidate on item changes, role changes, context changes
- History cache: Auto-expire after 2 hours, evict oldest when limit exceeded
- Role cache: Invalidate on role changes (existing pattern)

**Performance Target**:
- Cache hit rate: >70% for frequently accessed menus
- Cache response time: <200ms (vs <1s for generation)
- 50% reduction in keyboard generation time for cached keyboards

**Alternatives Considered**:
- In-memory caching only: Rejected - doesn't scale across instances
- Database caching: Rejected - slower than Redis, adds database load
- No caching: Rejected - doesn't meet performance goals

---

### 4. Navigation History and Breadcrumb Management

**Source**: Navigation patterns, Redis data structures

**Decision**: Store navigation history in Redis as JSON array with 20-level limit, implement FIFO eviction when limit exceeded. Generate breadcrumb row from history array.

**Rationale**:
- Redis provides fast access and persistence
- JSON array structure allows easy manipulation (push, pop, slice)
- 20-level limit prevents unbounded growth while supporting deep navigation
- FIFO eviction ensures recent navigation context is preserved

**Data Structure**:
```javascript
// Navigation history: Array of { level, menuId, context, timestamp }
// Stored in Redis: `nav:history:${userId}` as JSON string
// TTL: 2 hours (7200 seconds)
```

**Breadcrumb Generation**:
- Extract menu names from history array
- Format as compact string: "Home > Products > Add"
- Truncate if exceeds 64 bytes (Telegram button limit)
- Display as separate keyboard row above navigation buttons

**Back Navigation**:
- Pop last entry from history array
- Restore previous menu context
- Update keyboard with previous state

**Alternatives Considered**:
- In-memory only: Rejected - lost on server restart
- Database storage: Rejected - slower access, adds database load
- Unlimited depth: Rejected - memory concerns, rarely needed

---

### 5. Real-Time Stock Update Propagation

**Source**: Existing stock-notifier.js, Redis pub/sub patterns

**Decision**: Use Redis pub/sub to broadcast stock updates, maintain active keyboard registry in Redis, push updates via `editMessageReplyMarkup` to all users viewing affected product keyboards.

**Rationale**:
- Redis pub/sub provides efficient broadcast mechanism
- Active keyboard registry tracks which users are viewing which keyboards
- Push updates ensure real-time accuracy (within 5 seconds target)
- `editMessageReplyMarkup` is Telegram's native update mechanism

**Implementation Pattern**:
```javascript
// 1. Stock update occurs → publish to Redis channel
redis.publish('stock:update', JSON.stringify({ productId, quantity }))

// 2. Keyboard system subscribes to channel
redis.subscribe('stock:update')

// 3. On update: query active keyboards registry
const activeKeyboards = await redis.smembers(`keyboards:active:${productId}`)

// 4. Update each active keyboard
for (const keyboardId of activeKeyboards) {
  await editMessageReplyMarkup(keyboardId, updatedKeyboard)
}
```

**Active Keyboard Registry**:
- Store in Redis Set: `keyboards:active:${productId}`
- Add keyboard ID when product keyboard displayed
- Remove keyboard ID when user navigates away or keyboard expires
- TTL: 1 hour (auto-cleanup)

**Error Handling**:
- If `editMessageReplyMarkup` fails (message deleted, user left), remove from registry
- Retry logic for transient failures (max 3 retries)
- Graceful degradation: update on next interaction if push fails

**Alternatives Considered**:
- Polling: Rejected - inefficient, doesn't meet 5-second target
- Database triggers: Rejected - doesn't scale, adds database load
- WebSocket: Rejected - Telegram doesn't support, adds complexity

---

### 6. FRIDAY Persona Keyboard Styling

**Source**: Existing FRIDAY persona system (002-friday-enhancement), Telegram emoji support

**Decision**: Implement emoji-based color indicators (🔵 primary, 🔴 danger, ⚪️ secondary) with consistent patterns matching FRIDAY persona. Extend existing persona-service.js with keyboard-specific styling.

**Rationale**:
- Telegram inline keyboards don't support button colors
- Emoji-based indicators provide visual distinction while staying within API limits
- Consistent with existing color coding (003-enhanced-keyboard)
- FRIDAY persona requires Iron Man-style visual elements

**Styling Patterns**:
```javascript
// Primary actions: 🔵 Blue circle
// Danger actions: 🔴 Red circle  
// Secondary actions: ⚪️ White circle
// Time-based: Add contextual emojis based on time of day
```

**Persona Integration**:
- Time-based styling: Morning (🌅), Afternoon (☀️), Evening (🌙), Night (🌃)
- Iron Man terminology: Use "Arc Reactor", "JARVIS-style" references in help text
- Contextual help: FRIDAY-style guidance messages

**Implementation**:
- Extend existing persona-service.js with keyboard styling methods
- Create keyboard-persona.js module for keyboard-specific persona logic
- Maintain consistency with existing FRIDAY greeting system

**Alternatives Considered**:
- Unicode symbols: Rejected - less recognizable, inconsistent
- Text-based indicators: Rejected - less visual, takes more space
- No styling: Rejected - doesn't meet FRIDAY persona requirements

---

### 7. Role-Based Access Control for Keyboards

**Source**: Existing role-filter.js (003-enhanced-keyboard), security best practices

**Decision**: Extend existing role-filter.js with granular permission checking for individual keyboard buttons. Implement keyboard-access.js module for permission management and audit logging.

**Rationale**:
- Existing role-filter.js provides foundation (admin vs regular user)
- Granular permissions enable fine-grained access control
- Audit logging required for admin actions (FR-015)
- Fail-safe defaults ensure security (default to regular user on failure)

**Permission Model**:
```javascript
// Button-level permissions
{
  callback_data: 'admin_product_add',
  roles: ['admin'],
  permissions: ['product:create']
}

// Check before displaying button
if (hasPermission(userRole, button.permissions)) {
  // Include button
}
```

**Audit Logging**:
- Log all admin actions performed through keyboards
- Include: userId, action, timestamp, context
- Store in database (audit_logs table) or structured logs
- Queryable for compliance and security reviews

**Performance**:
- Cache role and permissions in Redis (existing pattern)
- Permission checks: <10ms overhead per keyboard generation
- Audit logging: Async, non-blocking

**Alternatives Considered**:
- Role-only checking: Rejected - too coarse, doesn't meet granular requirement
- Database-only permissions: Rejected - too slow, doesn't meet performance goals
- No audit logging: Rejected - security requirement (FR-015)

---

### 8. Performance Optimization Strategies

**Source**: Performance best practices, existing Redis implementation

**Decision**: Implement multi-level optimization: (1) Redis caching for layouts (50% reduction target), (2) Lazy loading for 50+ items (load visible items first), (3) Intelligent preloading (fetch adjacent pages in background), (4) Memory optimization (30% reduction target).

**Rationale**:
- Performance goals: <1 second response (95th percentile), <200ms cache hits
- Caching provides immediate performance boost for frequently accessed menus
- Lazy loading reduces initial load time for large menus
- Preloading improves perceived performance
- Memory optimization supports scalability (100 concurrent users)

**Caching Strategy**:
- Cache key: `keyboard:layout:${itemHash}:${role}:${context}`
- TTL: 1 hour (3600 seconds)
- Invalidation: On item changes, role changes, context changes
- Cache hit target: >70% for frequently accessed menus

**Lazy Loading**:
- For menus with 50+ items: Load first 9 items immediately
- Load remaining items in background
- Update keyboard when additional items ready
- User sees immediate response, full menu loads progressively

**Preloading**:
- When user on page N: Preload pages N-1, N+1 in background
- Store preloaded pages in Redis with short TTL (5 minutes)
- Serve preloaded pages instantly when user navigates
- Reduces pagination wait time to <200ms

**Memory Optimization**:
- Use object pooling for keyboard state objects
- Minimize string duplication (use references)
- Clean up unused navigation history entries
- Monitor memory usage per active keyboard

**Alternatives Considered**:
- No caching: Rejected - doesn't meet performance goals
- Full preloading: Rejected - wastes resources, slow initial load
- No lazy loading: Rejected - slow for large menus

---

### 9. Search and Filter Implementation

**Source**: Telegram inline query documentation, existing filter patterns

**Decision**: Implement hybrid approach: (1) Filter buttons in keyboard (e.g., "All", "Available", "Out of Stock") for common filters, (2) Telegram inline query for text-based search.

**Rationale**:
- Filter buttons provide quick access to common filters (stock status, category)
- Inline query enables flexible text-based search
- Hybrid approach balances functionality with keyboard space constraints
- Uses Telegram's native inline query feature

**Filter Buttons**:
- Display as separate row in keyboard
- Common filters: "All", "Available", "Out of Stock", "By Category"
- Apply filter immediately on click
- Update keyboard with filtered results

**Inline Query**:
- User types: `@botname search term`
- Bot responds with filtered results
- Results displayed as inline query results
- User selects result to view product

**Implementation**:
- Extend keyboard-engine.js with filter application logic
- Implement inline query handler in bot.js
- Cache filtered results in Redis (short TTL: 5 minutes)

**Alternatives Considered**:
- Filter buttons only: Rejected - doesn't support text search
- Inline query only: Rejected - less discoverable, requires typing
- Wizard-based search: Rejected - too many steps, poor UX

---

### 10. Integration with Existing Systems

**Source**: Existing codebase analysis

**Decision**: Maintain backward compatibility by extending existing modules rather than replacing them. Use adapter pattern to bridge old and new keyboard systems during transition.

**Rationale**:
- Backward compatibility requirement (FR-026)
- Existing keyboard-builder.js is used throughout codebase
- Gradual migration reduces risk
- Adapter pattern enables parallel operation

**Migration Strategy**:
1. Implement new keyboard-engine.js alongside existing keyboard-builder.js
2. Create adapter that routes to new engine when feature flag enabled
3. Gradually migrate call sites to new engine
4. Deprecate old keyboard-builder.js after full migration

**Integration Points**:
- Product catalog: Extend product-service.js to use new keyboard engine
- Checkout flow: Extend checkout-handler.js with new keyboard patterns
- Admin panels: Extend admin-interface.js with enhanced keyboards
- Stock management: Integrate real-time updates via existing stock-notifier.js

**Testing Strategy**:
- Contract tests ensure API compatibility
- Integration tests verify end-to-end flows
- Backward compatibility tests ensure old code still works

**Alternatives Considered**:
- Complete rewrite: Rejected - too risky, breaks backward compatibility
- No integration: Rejected - doesn't meet requirements
- Parallel systems: Rejected - maintenance burden, confusion

---

## Design Decisions Summary

| Decision | Rationale | Alternative Rejected |
|----------|-----------|---------------------|
| Modular architecture (6 modules) | Separation of concerns, testability, maintainability | Single file rejected - too large, unmaintainable |
| Emoji-based color indicators | Telegram API constraints, visual distinction | Unicode symbols rejected - less recognizable |
| Redis for navigation history | Fast access, persistence, scalability | In-memory rejected - lost on restart |
| Redis pub/sub for stock updates | Real-time propagation, efficient broadcast | Polling rejected - inefficient, slow |
| Hybrid search/filter | Balance functionality with constraints | Single approach rejected - less flexible |
| Adapter pattern for migration | Backward compatibility, gradual transition | Complete rewrite rejected - too risky |

## Performance Targets

- **Keyboard Response Time**: <1 second (95th percentile)
- **Cache Hit Response**: <200ms
- **Cache Hit Rate**: >70% for frequently accessed menus
- **Memory Reduction**: 30% compared to current implementation
- **Concurrent Users**: 100 without performance degradation
- **Stock Update Propagation**: <5 seconds from update to keyboard display

## Security Considerations

- **Role-Based Access**: Granular permissions with fail-safe defaults
- **Audit Logging**: All admin actions logged for compliance
- **Input Validation**: All keyboard inputs validated and sanitized
- **Rate Limiting**: Consider rate limits for keyboard generation
- **Secure Storage**: No credentials in keyboard data

## Next Steps

1. **Phase 1 Design**: Create data-model.md, API contracts, quickstart.md
2. **Implementation**: Follow TDD approach (tests first, then implementation)
3. **Integration**: Gradual migration with adapter pattern
4. **Testing**: Comprehensive unit, integration, and contract tests
5. **Performance Validation**: Load testing with 100 concurrent users

