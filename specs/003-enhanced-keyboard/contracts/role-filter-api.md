# API Contract: Role-Based Filtering

**Feature**: 003-enhanced-keyboard  
**Date**: 2025-11-21  
**Purpose**: Define API contracts for role-based menu item filtering

## Role Detection API

### `getUserRole(telegramUserId)`

Detects user role (admin or regular) with caching and fail-safe mechanism.

**Endpoint**: Internal library function  
**Parameters**:
- `telegramUserId` (number, required): Telegram user ID

**Returns**: `Promise<{role: string, cached: boolean, source: string}>`

**Response Structure**:
```javascript
{
  role: 'admin' | 'regular',
  cached: true | false,
  source: 'cache' | 'database' | 'fail-safe'
}
```

**Behavior**:
1. **Cache Lookup**: Check Redis cache (`role:user:{telegramUserId}`)
   - If found: Return cached role, `cached: true`, `source: 'cache'`
2. **Database Lookup**: Query `admins` table for `telegram_user_id`
   - If found: Cache result, return `role: 'admin'`, `cached: false`, `source: 'database'`
   - If not found: Check `customers` table (optional), return `role: 'regular'`, `cached: false`, `source: 'database'`
3. **Fail-Safe**: On any error, default to `role: 'regular'`, `cached: false`, `source: 'fail-safe'`

**Cache Strategy**:
- Cache key: `role:user:{telegram_user_id}`
- TTL: 1 hour (3600 seconds, configurable via `ROLE_CACHE_TTL` env var)
- Cache invalidation: On role changes in database

**Error Handling**:
- Redis errors: Log warning, fall back to database
- Database errors: Log error, return fail-safe (regular user)
- Never throws errors (always returns valid role)

**Example**:
```javascript
const { role, cached, source } = await getUserRole(123456789);
// { role: 'admin', cached: true, source: 'cache' }
// or { role: 'regular', cached: false, source: 'fail-safe' }
```

**Performance Targets**:
- Cache hit: < 10ms (Redis lookup)
- Cache miss (database): < 100ms (database query)
- Total (including fail-safe): < 200ms (SC-008 target)

## Role Filtering API

### `filterMenuItemsByRole(items, userRole)`

Filters menu items based on role visibility rules.

**Endpoint**: Internal library function  
**Parameters**:
- `items` (Array<MenuItem>): Menu items to filter
- `userRole` (string, required): User role ('admin' or 'regular')

**Returns**: `Array<MenuItem>` - Filtered menu items (only visible items)

**Filtering Rules**:
1. **Items with empty `roles` array**: Visible to all users (include)
2. **Items with `roles: ['admin']`**: Only visible to admin users
   - Include if `userRole === 'admin'`
   - Exclude if `userRole === 'regular'`
3. **Items with `roles: ['regular']`**: Only visible to regular users
   - Include if `userRole === 'regular'`
   - Exclude if `userRole === 'admin'`
4. **Items with multiple roles**: Visible if user role matches any role
   - Include if `roles.includes(userRole)`
   - Exclude otherwise

**Example**:
```javascript
const items = [
  { id: '1', label: 'Public Item', roles: [] },
  { id: '2', label: 'Admin Panel', roles: ['admin'] },
  { id: '3', label: 'User Settings', roles: ['regular'] },
  { id: '4', label: 'Dashboard', roles: ['admin', 'regular'] }
];

// Admin user
const adminItems = filterMenuItemsByRole(items, 'admin');
// Returns: [{ id: '1' }, { id: '2' }, { id: '4' }]

// Regular user
const regularItems = filterMenuItemsByRole(items, 'regular');
// Returns: [{ id: '1' }, { id: '3' }, { id: '4' }]
```

**Performance**: O(n) where n is number of items (single pass through items)

### `markDisabledButtons(items, userRole)`

Marks admin-only buttons as disabled for regular users (instead of hiding them).

**Endpoint**: Internal library function  
**Parameters**:
- `items` (Array<MenuItem>): Menu items to process
- `userRole` (string, required): User role ('admin' or 'regular')

**Returns**: `Array<MenuItem>` - Items with `disabled` flag set appropriately

**Behavior**:
1. Filter items by role (hide completely if not visible)
2. For items visible but restricted (admin-only shown to regular user):
   - Set `disabled: true`
   - Add lock emoji to label (e.g., "🔒 Admin Panel")
   - Keep item visible (grayed out)

**Example**:
```javascript
const items = [
  { id: '1', label: 'Public Item', roles: [] },
  { id: '2', label: 'Admin Panel', roles: ['admin'] }
];

// Regular user sees disabled admin button
const marked = markDisabledButtons(items, 'regular');
// Returns: [
//   { id: '1', label: 'Public Item', disabled: false },
//   { id: '2', label: '🔒 Admin Panel', disabled: true }
// ]
```

## Cache Management API

### `invalidateRoleCache(telegramUserId)`

Invalidates role cache for a specific user.

**Endpoint**: Internal library function  
**Parameters**:
- `telegramUserId` (number, required): Telegram user ID

**Returns**: `Promise<void>`

**Behavior**:
1. Delete Redis cache key (`role:user:{telegramUserId}`)
2. Log cache invalidation
3. Handle errors gracefully (log but don't throw)

**Use Cases**:
- User role changes in database
- Admin manually refreshes user permissions
- Cache corruption detected

**Example**:
```javascript
// After admin updates user role
await adminRepository.updateRole(telegramUserId, 'admin');
await invalidateRoleCache(telegramUserId);
// Next user interaction will fetch fresh role from database
```

### `refreshRoleCache(telegramUserId)`

Forces refresh of role cache from database.

**Endpoint**: Internal library function  
**Parameters**:
- `telegramUserId` (number, required): Telegram user ID

**Returns**: `Promise<{role: string}>` - Refreshed role

**Behavior**:
1. Invalidate existing cache
2. Fetch fresh role from database
3. Cache new role with TTL
4. Return refreshed role

**Example**:
```javascript
const { role } = await refreshRoleCache(telegramUserId);
// Cache refreshed with latest role from database
```

## Security Considerations

### Fail-Safe Mechanism

**Rule**: Always default to 'regular' user on role detection failure.

**Rationale**:
- Principle of least privilege
- Prevents unauthorized admin access
- Matches clarified requirement (from spec clarifications)

**Implementation**:
```javascript
try {
  const role = await getUserRole(telegramUserId);
  return role;
} catch (error) {
  logger.warn('Role detection failed, defaulting to regular user', error);
  return { role: 'regular', cached: false, source: 'fail-safe' };
}
```

### Access Control

**Rule**: Admin-only buttons must be filtered or disabled for regular users.

**Implementation**:
```javascript
const userRole = await getUserRole(telegramUserId);
const visibleItems = filterMenuItemsByRole(items, userRole.role);

// Alternative: Show disabled buttons instead of hiding
const markedItems = markDisabledButtons(items, userRole.role);
```

### Cache Security

**Rule**: Role cache must not be shared between users.

**Cache Key Format**: `role:user:{telegram_user_id}` (includes user ID to prevent collision)

**TTL**: 1 hour (prevents stale role data)

**Invalidation**: On role changes in database

