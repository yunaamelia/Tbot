# Quick Start: Enhanced Inline Keyboard System

**Feature**: 003-enhanced-keyboard  
**Date**: 2025-11-21

## Prerequisites

- Node.js 20.0.0+
- PostgreSQL 14+ or MySQL 8.0+
- Redis 7.0+
- Existing bot setup (from `001-premium-store-bot` and `002-friday-enhancement`)
- Phase 4 keyboard builder implementation (from `002-friday-enhancement`)

## Installation Steps

### 1. Checkout Feature Branch

```bash
git checkout 003-enhanced-keyboard
```

### 2. Install Dependencies

No new dependencies required. Existing dependencies are sufficient:
- `telegraf` ^4.15.0 (existing)
- `express` ^4.18.2 (existing)
- `knex` ^3.0.1 (existing)
- `ioredis` ^5.3.2 (existing)

### 3. Run Database Migration

```bash
npm run migrate
```

This will create the new `interaction_logs` table for monitoring and analytics.

### 4. Configure Environment Variables

Ensure your `.env` file has Redis configuration (if not already configured):

```bash
# Redis Configuration (existing)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password  # Optional
REDIS_DB=0

# Role Cache TTL (new, optional)
ROLE_CACHE_TTL=3600  # 1 hour in seconds (default: 3600)

# Navigation Cache TTL (new, optional)
NAV_CACHE_TTL=1800  # 30 minutes in seconds (default: 1800)

# Interaction Log Retention (new, optional)
INTERACTION_LOG_RETENTION_DAYS=90  # 90 days (default: 90)
```

### 5. Start Redis (if not running)

```bash
redis-server
```

### 6. Start the Bot

```bash
npm start
```

Or for webhook mode:

```bash
npm run server
```

## Testing the Features

### Test Responsive Layouts

**Test Case**: Verify responsive layouts for different item counts.

1. **1-3 Items**: Open bot, navigate to menu with 1-3 items
   - **Expected**: Buttons arranged in single row
   - **Command**: `/start` → Navigate to menu with 1-3 items

2. **4-6 Items**: Navigate to menu with 4-6 items
   - **Expected**: Buttons arranged in 2 rows with up to 3 per row
   - **Command**: Navigate to products menu (if 4-6 products exist)

3. **7-9 Items**: Navigate to menu with 7-9 items
   - **Expected**: Buttons arranged in 3 rows with up to 3 per row
   - **Command**: Navigate to menu with 7-9 items

4. **10+ Items**: Navigate to menu with 10+ items
   - **Expected**: Pagination implemented with "more" button, 9 items per page
   - **Command**: Navigate to products menu (if 10+ products exist)

### Test Fixed Navigation Controls

**Test Case**: Verify fixed navigation buttons (Home/Help/Back).

1. **Home Button**: Click Home button from any menu
   - **Expected**: Returns to main menu
   - **Command**: Navigate to any submenu → Click "🏠 Home"

2. **Help Button**: Click Help button from any menu
   - **Expected**: Shows help information relevant to current context
   - **Command**: Navigate to any menu → Click "❓ Help"

3. **Back Button**: Click Back button from submenu
   - **Expected**: Returns to previous menu level
   - **Command**: Navigate to submenu → Click "◀️ Back"

4. **Back Button at Main Menu**: Click Back button at main menu
   - **Expected**: Back button disabled or shows appropriate feedback
   - **Command**: At main menu → Click "◀️ Back" (should be disabled)

### Test Role-Based Access Control

**Test Case**: Verify role-based button visibility.

1. **Admin User**: Login as admin user
   - **Expected**: See admin-only buttons (e.g., "Admin Panel", "Stock Management")
   - **Setup**: Add your Telegram user ID to `ADMIN_TELEGRAM_IDS` in `.env`

2. **Regular User**: Login as regular user
   - **Expected**: See only user-facing options, admin buttons hidden or disabled
   - **Command**: Open bot with non-admin Telegram user ID

3. **Admin Button for Regular User**: Regular user encounters admin button
   - **Expected**: Button appears grayed out or disabled (e.g., "🔒 Admin Panel")
   - **Command**: Regular user tries to access admin menu

4. **Access Denied**: Regular user clicks disabled admin button
   - **Expected**: Receive "Access denied" message in Indonesian
   - **Command**: Regular user clicks disabled admin button

### Test Visual Enhancements

**Test Case**: Verify visual feedback (emojis, colors, loading states).

1. **Button Emojis**: View menu buttons
   - **Expected**: Buttons include emojis or icons indicating their function
   - **Command**: Open bot → View menu buttons

2. **Color Coding**: View different button types
   - **Expected**: Primary, secondary, and danger buttons use color coding (emojis)
   - **Command**: Navigate to menus with different button types

3. **Loading State**: Click button that triggers processing
   - **Expected**: Button disabled, shows loading indicator (e.g., "⏳ Processing...")
   - **Command**: Click any button that requires processing (e.g., product view)

4. **Button Feedback**: Click button, wait for completion
   - **Expected**: Loading indicator disappears, success/error feedback shown
   - **Command**: Click button → Wait for action to complete

### Test Pagination

**Test Case**: Verify pagination for large menus (10+ items).

1. **Pagination at 10+ Items**: Navigate to menu with 10+ items
   - **Expected**: First 9 items displayed with "▶️ Next" button
   - **Command**: Navigate to products menu (if 10+ products exist)

2. **Next Page**: Click "▶️ Next" button
   - **Expected**: Next 9 items replace current keyboard inline (same message)
   - **Command**: At paginated menu → Click "▶️ Next"

3. **Previous Page**: Click "◀️ Prev" button
   - **Expected**: Previous 9 items replace current keyboard inline
   - **Command**: At page 2+ → Click "◀️ Prev"

4. **First Page**: Click "◀️ Prev" at first page
   - **Expected**: Shows "Already on first page" feedback
   - **Command**: At first page → Click "◀️ Prev"

5. **Last Page**: Click "▶️ Next" at last page
   - **Expected**: Shows "No more items" feedback
   - **Command**: At last page → Click "▶️ Next"

6. **Pagination at 9 Items**: Navigate to menu with exactly 9 items
   - **Expected**: No pagination controls (all 9 items fit in 3x3 grid)
   - **Command**: Navigate to menu with exactly 9 items

### Test Button State Management

**Test Case**: Verify button disabling during processing.

1. **Rapid Clicks**: Click button rapidly multiple times
   - **Expected**: Only first click processed, subsequent clicks ignored (button disabled)
   - **Command**: Click any processing button rapidly (e.g., "Buy Now")

2. **Processing State**: Button shows loading state
   - **Expected**: Button disabled with loading indicator (e.g., "⏳ Processing...")
   - **Command**: Click button → Observe button state change

3. **Completion State**: Action completes
   - **Expected**: Button re-enabled with result indicator (e.g., "✅ Complete")
   - **Command**: Wait for action to complete → Observe button state change

### Test Long Button Labels

**Test Case**: Verify label truncation for long button text.

1. **Long Label**: View button with long label (>20 characters)
   - **Expected**: Label truncated with ellipsis ("..."), full text on hover/long press
   - **Command**: Navigate to menu with long button labels

2. **Truncation**: Verify truncation maintains 3-column grid
   - **Expected**: Labels fit within 3-column grid layout
   - **Command**: View menu with multiple long labels

### Test Role Detection Fail-Safe

**Test Case**: Verify fail-safe role detection.

1. **Database Failure**: Simulate database query failure
   - **Expected**: System defaults to regular user (limited access)
   - **Setup**: Temporarily stop database or cause query error
   - **Command**: Open bot → Verify limited access

2. **Redis Failure**: Simulate Redis cache failure
   - **Expected**: Falls back to database lookup, still works correctly
   - **Setup**: Temporarily stop Redis server
   - **Command**: Open bot → Verify menu still works

3. **Cache Invalidation**: Change user role in database
   - **Expected**: Next interaction fetches fresh role, menu updates
   - **Setup**: Update user role in database (admin → regular or vice versa)
   - **Command**: Next user interaction → Verify menu updates

### Test Interaction Logging

**Test Case**: Verify interaction logging for monitoring.

1. **Log Creation**: Click buttons, check interaction logs
   - **Expected**: All button clicks logged in `interaction_logs` table
   - **Command**: Click various buttons → Check database

2. **Response Time**: Verify response time tracking
   - **Expected**: Response time recorded in logs
   - **Command**: Click button → Check `response_time_ms` in logs

3. **Log Retention**: Verify log retention (90 days default)
   - **Expected**: Old logs (>90 days) automatically deleted
   - **Command**: Check `interaction_logs` table → Verify old records removed

## Performance Testing

### Test Menu Loading Performance

**Test Case**: Verify menu loading time meets performance goals.

1. **Menu Display**: Measure menu display time
   - **Target**: < 1 second (SC-002)
   - **Command**: Open bot → Measure time to menu display
   - **Tool**: Browser DevTools Network tab or logging

2. **Role Detection**: Measure role detection overhead
   - **Target**: < 200ms added to menu loading (SC-008)
   - **Command**: Open bot → Check cache hit vs cache miss times
   - **Setup**: Compare cached vs uncached role lookups

3. **Pagination**: Measure pagination navigation time
   - **Target**: < 1 second for menus up to 50 items (SC-006)
   - **Command**: Navigate through paginated menu → Measure page load time

4. **Visual Feedback**: Measure visual feedback latency
   - **Target**: < 100ms after user interaction (SC-007)
   - **Command**: Click button → Measure time to loading indicator

### Test Scalability

**Test Case**: Verify system handles 1000+ concurrent interactions.

1. **Concurrent Users**: Simulate 1000+ concurrent menu requests
   - **Expected**: All requests respond within performance targets
   - **Tool**: Load testing tool (e.g., Apache Bench, k6)

2. **Database Connection Pool**: Verify connection pooling works
   - **Expected**: No connection pool exhaustion errors
   - **Command**: Monitor database connection pool during load test

3. **Redis Caching**: Verify Redis caching reduces database load
   - **Expected**: Most role lookups use cache (high cache hit rate)
   - **Command**: Monitor Redis cache hit rate during load test

## Troubleshooting

### Issue: Menu buttons not showing correctly

**Symptoms**: Buttons not arranged in expected layout (1-3: 1 row, 4-6: 2 rows, etc.)

**Solution**:
1. Check `keyboard-builder.js` layout balancing logic
2. Verify menu items array is valid
3. Check Redis cache for corrupted keyboard layouts (clear cache if needed)

### Issue: Admin buttons visible to regular users

**Symptoms**: Regular users can see admin-only buttons

**Solution**:
1. Check role detection (verify `getUserRole()` returns correct role)
2. Verify role filtering logic in `filterMenuItemsByRole()`
3. Clear role cache if role changed in database: `redis-cli DEL "role:user:{telegramUserId}"`

### Issue: Pagination not working

**Symptoms**: Menus with 10+ items don't show pagination

**Solution**:
1. Verify menu has >9 items (pagination only shows at 10+ items)
2. Check `createPaginatedKeyboard()` function
3. Verify "▶️ Next" button callback data is correct

### Issue: Buttons not disabling during processing

**Symptoms**: Buttons remain clickable during processing, duplicate actions occur

**Solution**:
1. Check `button-state-manager.js` disable logic
2. Verify Redis connection for state storage
3. Check button state timeout (default: 30 seconds)

### Issue: Interaction logs not being created

**Symptoms**: No records in `interaction_logs` table

**Solution**:
1. Verify database migration ran successfully: `npm run migrate`
2. Check database connection
3. Verify interaction logger is called after button actions
4. Check error logs for database insert failures

### Issue: Role detection always returns 'regular'

**Symptoms**: Admin users see regular user menu

**Solution**:
1. Verify admin user ID is in `admins` table: `SELECT * FROM admins WHERE telegram_user_id = {your_id}`
2. Check role detection fail-safe (verify database query succeeds)
3. Clear role cache: `redis-cli DEL "role:user:{telegramUserId}"`
4. Check database connection and indexes

### Issue: Performance issues (slow menu loading)

**Symptoms**: Menu loading takes >1 second

**Solution**:
1. Check Redis cache hit rate (should be >80% after warm-up)
2. Verify database query indexes (especially on `telegram_user_id`)
3. Monitor database connection pool (should not be exhausted)
4. Check network latency to Redis and database
5. Profile role detection function (should be <200ms with cache)

## Next Steps

After successful testing:

1. **Integration**: Integrate enhanced keyboard builder into existing bot commands
2. **Monitoring**: Set up monitoring for interaction logs and performance metrics
3. **Documentation**: Update API documentation with new keyboard features
4. **Tasks**: Break down implementation into tasks (use `/speckit.tasks` command)

## Related Documentation

- [Specification](./spec.md) - Feature requirements and acceptance criteria
- [Implementation Plan](./plan.md) - Technical implementation details
- [Data Model](./data-model.md) - Database schema and entities
- [API Contracts](./contracts/) - API documentation
- [Research](./research.md) - Technology research and best practices

