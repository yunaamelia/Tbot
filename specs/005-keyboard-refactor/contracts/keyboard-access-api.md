# API Contract: Keyboard Access Control

**Module**: `src/lib/security/keyboard-access.js`  
**Version**: 1.0.0  
**Feature**: 005-keyboard-refactor

## Overview

The Keyboard Access Control module provides granular permission checking for individual keyboard buttons, role-specific themes, and audit trail logging for admin actions.

## filterItemsByPermissions(items, userRole, userPermissions)

Filters menu items based on user role and permissions.

**Parameters**:

- `items` (Array<MenuItem>, required): Items to filter
- `userRole` (string, required): User role ('admin' or 'regular')
- `userPermissions` (Array<string>, optional): User permissions array

**Returns**: `Array<MenuItem>` - Filtered items (only visible items)

**Behavior**:

1. For each item, check role and permission requirements
2. If item has `roles` array, check if user role matches
3. If item has `permissions` array, check if user has required permissions
4. Return only items that pass checks

**Errors**:

- `ValidationError`: Invalid parameters

---

## hasPermission(userRole, userPermissions, requiredPermissions)

Checks if user has required permissions.

**Parameters**:

- `userRole` (string, required): User role
- `userPermissions` (Array<string>, required): User permissions
- `requiredPermissions` (Array<string>, required): Required permissions

**Returns**: `boolean` - True if user has all required permissions

**Behavior**:

1. Check if user role is 'admin' (admins have all permissions)
2. Check if user permissions include all required permissions
3. Return result

---

## logAdminAction(userId, action, context)

Logs admin action for audit trail.

**Parameters**:

- `userId` (number, required): Admin user ID
- `action` (string, required): Action performed
- `context` (Object, optional): Action context

**Returns**: `Promise<void>`

**Behavior**:

1. Create audit log entry:
   - userId, action, context, timestamp
2. Store in database (audit_logs table) or structured logs
3. Log asynchronously (non-blocking)

**Errors**:

- `DatabaseError`: Database write failure (logged, doesn't throw)

---

## getRoleTheme(role)

Gets role-specific keyboard theme.

**Parameters**:

- `role` (string, required): User role ('admin' or 'regular')

**Returns**: `Object` - Theme configuration

- `colorScheme` (string): Color scheme
- `emojiPattern` (string): Emoji pattern
- `quickActions` (Array<QuickAction>, admin only): Quick action buttons

---

## Integration Points

- **Role Filter**: Extends existing role-filter.js
- **Access Control**: Uses existing access-control.js
- **Audit Logger**: Uses existing audit-logger.js
