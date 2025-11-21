# Admin Command Hierarchy API Contract

**Module**: `src/lib/admin/hierarchy/command-router.js`  
**Version**: 1.0.0

## routeCommand(path, telegramUserId, args?)

Routes a hierarchical command to the appropriate handler.

**Parameters**:
- `path` (String, required): Command path (e.g., 'admin product add')
- `telegramUserId` (Number, required): Telegram user ID for permission checking
- `args` (String, optional): Command arguments

**Returns**: `Promise<CommandResult>`

**CommandResult**:
```typescript
{
  success: boolean,
  handler?: Function,
  error?: string,
  suggestions?: string[]
}
```

**Example**:
```javascript
const result = await commandRouter.routeCommand('admin product add', 123456789, 'GitHub Copilot|Description|50000|10|GitHub');
if (result.success) {
  await result.handler(telegramUserId, args);
}
```

**Errors**:
- Returns `{ success: false, error: 'Command not found', suggestions: [...] }` if path invalid
- Returns `{ success: false, error: 'Permission denied' }` if user lacks required permissions

---

## registerCommand(path, handler, options?)

Registers a new command in the hierarchy.

**Parameters**:
- `path` (String, required): Command path (e.g., 'admin.product.add')
- `handler` (Function, required): Command handler function
- `options` (Object, optional):
  - `permissions` (Array<String>): Required permissions
  - `description` (String): Command description
  - `usage` (String): Usage example

**Returns**: `void`

**Example**:
```javascript
commandRegistry.registerCommand('admin.product.add', handleAddProduct, {
  permissions: ['stock_manage'],
  description: 'Add new product',
  usage: '/admin product add name|description|price|stock|category'
});
```

---

## getHelp(path?, telegramUserId?)

Returns help information for commands at the specified path level.

**Parameters**:
- `path` (String, optional): Command path (default: root)
- `telegramUserId` (Number, optional): Filter by user permissions

**Returns**: `Promise<HelpInfo>`

**HelpInfo**:
```typescript
{
  path: string,
  description?: string,
  commands: Array<{
    path: string,
    description: string,
    usage?: string
  }>
}
```

**Example**:
```javascript
const help = await commandRouter.getHelp('admin.product', 123456789);
// Returns available commands under admin.product that user has access to
```

---

## getSuggestions(path)

Returns command suggestions for partial paths.

**Parameters**:
- `path` (String, required): Partial command path

**Returns**: `Array<String>` - Array of suggested command paths

**Example**:
```javascript
const suggestions = commandRouter.getSuggestions('admin prod');
// Returns: ['admin.product', 'admin.product.add', 'admin.product.update']
```

