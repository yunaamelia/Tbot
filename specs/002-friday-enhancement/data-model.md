# Data Model: FRIDAY Bot Enhancement

**Feature**: FRIDAY Bot Enhancement  
**Date**: 2025-11-21  
**Database**: PostgreSQL (primary) / MySQL (supported via Knex.js abstraction)

## New Entities

### FRIDAY Persona Configuration

Stores time-based greeting templates, personality traits, and interaction style preferences that define the FRIDAY assistant character.

**Storage**: In-memory configuration (no database table required)

**Attributes**:
- `timeRanges` (Object): Time-of-day ranges for greetings
  - `morning`: { start: 6, end: 11 }
  - `afternoon`: { start: 12, end: 17 }
  - `evening`: { start: 18, end: 23 }
  - `night`: { start: 0, end: 5 }
- `greetingTemplates` (Object): Greeting messages by time of day
  - `morning` (String): Morning greeting template
  - `afternoon` (String): Afternoon greeting template
  - `evening` (String): Evening greeting template
  - `night` (String): Night greeting template
- `personaTraits` (Object): Personality characteristics
  - `tone` (String): "professional yet friendly"
  - `style` (String): "Iron Man AI assistant"
  - `language` (String): "Indonesian"

**Validation Rules**:
- All time ranges must be valid (0-23 hours)
- All greeting templates must be non-empty strings
- Greeting templates must maintain FRIDAY persona consistency

**State Transitions**: N/A (static configuration)

---

### Menu Layout Configuration

Defines button arrangement patterns, navigation structure, and layout rules for responsive keyboard generation.

**Storage**: In-memory configuration with Redis caching

**Attributes**:
- `patterns` (Object): Layout patterns by item count
  - `9`: { rows: 3, cols: 3, navRow: 2 } // 3x3x2
  - `6`: { rows: 3, cols: 2, navRow: 2 } // 3x2x2
  - `4`: { rows: 2, cols: 2, navRow: 1 } // 3x2x1
  - `2`: { rows: 1, cols: 2, navRow: 1 } // 3x1x1
- `navigationButtons` (Object): Fixed navigation buttons
  - `home` (Object): { text: "🏠 Home", callback: "nav_home" }
  - `back` (Object): { text: "◀️ Back", callback: "nav_back" }
- `maxItemsPerRow` (Number): Maximum buttons per row (default: 3)
- `maxItemsPerScreen` (Number): Maximum items before pagination (default: 9)

**Validation Rules**:
- Max items per row must be between 1 and 8 (Telegram API limit)
- Navigation buttons must always be included in last row
- Layout must auto-balance incomplete rows

**State Transitions**: N/A (static configuration)

**Caching**: Redis key `menu:layout:${itemCount}` with 1-hour TTL

---

### Payment Method Configuration

Stores payment method settings from environment variables including credentials, account details, and enabled/disabled status.

**Storage**: Environment variables + Redis cache

**Attributes**:
- `type` (String): Payment method type ('qris', 'ewallet', 'bank')
- `name` (String): Display name for payment method
- `enabled` (Boolean): Whether method is properly configured
- `credentials` (Object): Method-specific credentials (encrypted in memory)
  - For QRIS: `merchantCode`, `apiKey`, `callbackUrl`
  - For E-Wallet: `walletName`, `walletNumber`, `walletHolder`
  - For Bank: `bankName`, `accountNumber`, `accountHolder`

**Validation Rules**:
- `enabled` is true only if all required credentials are present
- Credentials must never be logged or exposed
- Method name must be non-empty if enabled

**State Transitions**:
- `disabled` → `enabled` (when all required env vars are set)
- `enabled` → `disabled` (when required env vars are removed)

**Caching**: Redis key `payment:methods` with 1-hour TTL, invalidated on bot restart

---

### Admin Command Hierarchy

Defines the hierarchical structure of admin commands including categories, sub-commands, permissions, and command paths.

**Storage**: In-memory registry (no database table required)

**Attributes**:
- `path` (String): Command path (e.g., "admin.product.add")
- `handler` (Function): Command handler function
- `permissions` (Array<String>): Required permissions (e.g., ['stock_manage'])
- `children` (Object): Sub-commands (nested hierarchy)
- `description` (String): Command description for help system
- `usage` (String): Usage example

**Validation Rules**:
- Path must be unique within hierarchy
- Permissions must be valid permission names
- Handler must be a function
- Maximum hierarchy depth: 3 levels

**State Transitions**: N/A (static registry, loaded at startup)

**Example Structure**:
```javascript
{
  'admin': {
    path: 'admin',
    handler: showAdminMenu,
    children: {
      'product': {
        path: 'admin.product',
        handler: showProductMenu,
        children: {
          'add': {
            path: 'admin.product.add',
            handler: handleAddProduct,
            permissions: ['stock_manage'],
            description: 'Add new product',
            usage: '/admin product add name|description|price|stock|category'
          }
        }
      }
    }
  }
}
```

---

### Stock Update Transaction

Records real-time stock changes including product ID, previous quantity, new quantity, admin who made the change, and timestamp.

**Storage**: Existing `stock` table (extend if needed) + Redis pub/sub

**Attributes** (extend existing stock table):
- `product_id` (BIGINT): Product identifier (existing)
- `current_quantity` (INT): Current stock quantity (existing)
- `reserved_quantity` (INT): Reserved stock (existing)
- `updated_at` (TIMESTAMP): Last update timestamp (existing)
- **NEW**: `last_updated_by` (BIGINT): Admin ID who made last update
- **NEW**: `update_history` (JSON): Array of update records
  - `admin_id` (BIGINT): Admin who made change
  - `previous_quantity` (INT): Quantity before update
  - `new_quantity` (INT): Quantity after update
  - `timestamp` (TIMESTAMP): When update occurred

**Validation Rules**:
- `current_quantity` must be non-negative
- `last_updated_by` must reference valid admin ID
- Update history limited to last 10 updates per product

**State Transitions**:
- Stock update triggers availability status change:
  - `current_quantity > 0` → `availability_status = 'available'`
  - `current_quantity = 0` → `availability_status = 'out_of_stock'`

**Real-Time Sync**: Redis pub/sub channel `stock:updated` publishes:
```json
{
  "productId": 1,
  "previousQuantity": 10,
  "newQuantity": 5,
  "adminId": 1,
  "timestamp": "2025-11-21T10:00:00Z"
}
```

---

## Extended Entities

### Product (existing, extend)

**New Attributes**:
- No schema changes required
- Real-time update notifications via Redis pub/sub

**New Behaviors**:
- Stock changes trigger immediate cache invalidation
- Catalog sync listens to `stock:updated` channel

---

### Admin (existing, no changes)

**Usage**: 
- `telegram_user_id` used for permission checking in hierarchical commands
- `permissions` JSON field used for command access control

---

## Relationships

```
Admin ──> Stock Update Transaction ──> Product
  │              │
  │              └──> Redis Pub/Sub ──> Catalog Sync
  │
  └──> Admin Command Hierarchy ──> Command Execution

Payment Method Configuration ──> Payment Selection UI
  │
  └──> Environment Variables

Menu Layout Configuration ──> Responsive Keyboard
  │
  └──> Redis Cache

FRIDAY Persona Configuration ──> Greeting Messages
```

## Data Flow

### Stock Update Flow

1. Admin updates stock via `/stock update <id> <quantity>`
2. `stock-manager.js` updates database
3. `stock-notifier.js` publishes to Redis `stock:updated` channel
4. `catalog-sync.js` subscribes and invalidates product cache
5. Customer sees updated availability on next catalog view

### Payment Method Flow

1. Bot startup: `payment-config.js` loads from environment variables
2. Validates each method's required credentials
3. Caches enabled methods in Redis (`payment:methods`)
4. Checkout handler reads from cache (not env directly)
5. Displays only enabled methods in payment selection

### Command Hierarchy Flow

1. Admin sends `/admin product add ...`
2. `command-router.js` parses path: `['admin', 'product', 'add']`
3. Traverses hierarchy: `admin` → `product` → `add`
4. Checks permissions at each level
5. Executes handler: `handleAddProduct`

### FRIDAY Greeting Flow

1. Customer sends `/start`
2. `persona-service.js` determines time of day
3. Selects appropriate greeting template
4. `persona-formatter.js` formats message with FRIDAY style
5. Bot sends personalized greeting

## Indexes

No new database indexes required. Existing indexes on `products.id`, `stock.product_id` are sufficient.

## Migrations

**Migration**: `005_add_stock_update_history.js`

```javascript
exports.up = async function(knex) {
  await knex.schema.table('stock', (table) => {
    table.bigInteger('last_updated_by').nullable()
      .references('id').inTable('admins').onDelete('SET NULL');
    table.json('update_history').nullable();
  });
};

exports.down = async function(knex) {
  await knex.schema.table('stock', (table) => {
    table.dropColumn('last_updated_by');
    table.dropColumn('update_history');
  });
};
```

## Caching Strategy

1. **Payment Methods**: Redis key `payment:methods`, TTL 1 hour
2. **Menu Layouts**: Redis key `menu:layout:${itemCount}`, TTL 1 hour
3. **Product Catalog**: Existing cache, invalidated on stock update
4. **Command Registry**: In-memory (no cache needed, loaded at startup)

## Security Considerations

1. **Payment Credentials**: Never stored in database, only in environment variables
2. **Stock Update History**: Audit log of all stock changes with admin ID
3. **Command Permissions**: Validated at hierarchy traversal time
4. **Cache Keys**: Use namespaced keys to prevent collisions

