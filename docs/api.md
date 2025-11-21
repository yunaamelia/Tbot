# API Documentation

**Task: T153**  
**Requirement: FR-038, Article X**

This document provides comprehensive documentation for all public library interfaces and APIs in the Premium Account Store Telegram Bot.

## Table of Contents

1. [Product Module](#product-module)
2. [Order Module](#order-module)
3. [Payment Module](#payment-module)
4. [Customer Module](#customer-module)
5. [Admin Module](#admin-module)
6. [Customer Service Module](#customer-service-module)
7. [Security Module](#security-module)
8. [Database Module](#database-module)
9. [Telegram Module](#telegram-module)
10. [FRIDAY Persona Module](#friday-persona-module)
11. [UI Module](#ui-module)
12. [Shared Utilities](#shared-utilities)
13. [Webhook Endpoints](#webhook-endpoints)

---

## Product Module

### ProductService

**Location**: `src/lib/product/product-service.js`

#### `getAllProducts(options = {})`

Get all available products.

**Parameters**:
- `options` (Object, optional):
  - `includeInactive` (boolean): Include inactive products
  - `category` (string): Filter by category

**Returns**: `Promise<Array<Product>>`

**Example**:
```javascript
const productService = require('./src/lib/product/product-service');
const products = await productService.getAllProducts({ includeInactive: false });
```

#### `getProductById(productId)`

Get product by ID.

**Parameters**:
- `productId` (number): Product ID

**Returns**: `Promise<Product>`

**Throws**: `NotFoundError` if product not found

**Example**:
```javascript
const product = await productService.getProductById(1);
```

#### `getProductBySlug(slug)`

Get product by slug.

**Parameters**:
- `slug` (string): Product slug

**Returns**: `Promise<Product>`

**Throws**: `NotFoundError` if product not found

### ProductCardFormatter

**Location**: `src/lib/product/product-card-formatter.js`

#### `formatCard(product, options = {})`

Format product as card-style display.

**Parameters**:
- `product` (Product): Product object
- `options` (Object, optional):
  - `showStock` (boolean): Show stock status
  - `showPrice` (boolean): Show price

**Returns**: `Object` with `text` and `parse_mode` properties

### ProductDetailsFormatter

**Location**: `src/lib/product/product-details-formatter.js`

#### `formatDetails(product, options = {})`

Format product details with media group.

**Parameters**:
- `product` (Product): Product object
- `options` (Object, optional):
  - `includeMedia` (boolean): Include media files

**Returns**: `Object` with `text`, `parse_mode`, and `media` properties

### StockManager

**Location**: `src/lib/product/stock-manager.js`

#### `updateStock(productId, quantity, adminTelegramId)`

Update product stock with real-time synchronization.

**Parameters**:
- `productId` (number): Product ID
- `quantity` (number): New stock quantity
- `adminTelegramId` (number): Admin Telegram ID

**Returns**: `Promise<Stock>`

**Throws**: `ValidationError` if quantity is invalid

**Features**:
- Publishes Redis pub/sub notification for real-time catalog updates
- Updates `last_updated_by` and `update_history` tracking
- Automatically updates product availability status (available ↔ out_of_stock)
- Uses database transactions to prevent race conditions

### StockNotifier (Real-Time Updates)

**Location**: `src/lib/product/realtime/stock-notifier.js`

#### `notifyStockUpdate(productId, previousQuantity, newQuantity, adminId)`

Publish stock update notification to Redis channel.

**Parameters**:
- `productId` (number): Product ID
- `previousQuantity` (number): Quantity before update
- `newQuantity` (number): Quantity after update
- `adminId` (number): Admin ID who made the update

**Returns**: `Promise<void>`

**Channel**: `stock:updated`

#### `subscribeToUpdates(callback)`

Subscribe to stock update notifications.

**Parameters**:
- `callback` (Function): Callback function `(update) => void`

**Returns**: `Promise<Object|null>` Redis subscriber client or null if Redis unavailable

### CatalogSync (Real-Time Synchronization)

**Location**: `src/lib/product/realtime/catalog-sync.js`

#### `syncCatalog(productId, quantity)`

Synchronize catalog after stock update.

**Parameters**:
- `productId` (number): Product ID
- `quantity` (number): New stock quantity

**Returns**: `Promise<void>`

**Features**:
- Invalidates product cache in Redis
- Updates product availability status automatically
- Handles errors gracefully (doesn't block operations)

#### `startListening()`

Start listening to stock update notifications.

**Returns**: `Promise<void>`

**Note**: Should be called once at application startup.

---

## Order Module

### OrderService

**Location**: `src/lib/order/order-service.js`

#### `createOrder(orderData, trx = null)`

Create a new order with transaction support.

**Parameters**:
- `orderData` (Object):
  - `customer_id` (number): Customer ID
  - `product_id` (number): Product ID
  - `quantity` (number): Order quantity
  - `total_amount` (number): Total amount
- `trx` (Transaction, optional): Database transaction

**Returns**: `Promise<Order>`

**Throws**: `ValidationError` if order data is invalid

#### `getOrderById(orderId)`

Get order by ID.

**Parameters**:
- `orderId` (number): Order ID

**Returns**: `Promise<Order>`

**Throws**: `NotFoundError` if order not found

#### `updateOrderStatus(orderId, status)`

Update order status.

**Parameters**:
- `orderId` (number): Order ID
- `status` (string): New status

**Returns**: `Promise<Order>`

**Throws**: `ValidationError` if status is invalid

### CheckoutHandler

**Location**: `src/lib/order/checkout-handler.js`

#### `startCheckout(userId, productId, quantity = 1)`

Start checkout process.

**Parameters**:
- `userId` (number): User Telegram ID
- `productId` (number): Product ID
- `quantity` (number): Quantity

**Returns**: `Promise<Object>` with checkout session data

**Throws**: `ConflictError` if store is closed or product out of stock

---

## Payment Module

### PaymentService

**Location**: `src/lib/payment/payment-service.js`

#### `createPayment(paymentData)`

Create a new payment.

**Parameters**:
- `paymentData` (Object):
  - `order_id` (number): Order ID
  - `amount` (number): Payment amount
  - `method` (string): Payment method ('qris' or 'manual')

**Returns**: `Promise<Payment>`

#### `verifyQRISPayment(orderId, transactionId)`

Verify QRIS payment.

**Parameters**:
- `orderId` (number): Order ID
- `transactionId` (string): Transaction ID from payment gateway

**Returns**: `Promise<Payment>`

**Throws**: `NotFoundError` if order not found

#### `verifyManualPayment(paymentId, adminTelegramId)`

Verify manual payment by admin.

**Parameters**:
- `paymentId` (number): Payment ID
- `adminTelegramId` (number): Admin Telegram ID

**Returns**: `Promise<Payment>`

**Throws**: `UnauthorizedError` if admin not authorized

### PaymentConfig (Dynamic Payment Methods)

**Location**: `src/lib/payment/config/payment-config.js`

#### `getAvailableMethods(forceRefresh = false)`

Get all available payment methods based on environment configuration.

**Parameters**:
- `forceRefresh` (boolean): If true, bypass cache and reload from environment

**Returns**: `Promise<Array<PaymentMethod>>` Array of available payment methods

**Note**: Methods are cached in Redis for 1 hour to reduce environment variable reads.

**Example**:
```javascript
const paymentConfig = require('./src/lib/payment/config/payment-config');
const methods = await paymentConfig.getAvailableMethods();
// Returns: [{ type: 'qris', name: 'QRIS', enabled: true, ... }, ...]
```

#### `isMethodEnabled(type)`

Check if a specific payment method is enabled.

**Parameters**:
- `type` (string): Payment method type ('qris', 'ewallet', 'bank')

**Returns**: `Promise<boolean>` True if method is enabled

#### `refreshCache()`

Force refresh of payment method cache from environment variables.

**Returns**: `Promise<void>`

### QRISHandler

**Location**: `src/lib/payment/qris-handler.js`

#### `generateQRIS(orderId, amount)`

Generate QRIS payment code.

**Parameters**:
- `orderId` (number): Order ID
- `amount` (number): Payment amount

**Returns**: `Promise<Object>` with QRIS data

---

## Customer Module

### CustomerService

**Location**: `src/lib/customer/customer-service.js`

#### `getOrCreateCustomer(telegramId, customerData)`

Get or create customer by Telegram ID.

**Parameters**:
- `telegramId` (number): Telegram user ID
- `customerData` (Object):
  - `name` (string): Customer name
  - `username` (string, optional): Telegram username

**Returns**: `Promise<Customer>`

#### `getCustomerById(customerId)`

Get customer by ID.

**Parameters**:
- `customerId` (number): Customer ID

**Returns**: `Promise<Customer>`

**Throws**: `NotFoundError` if customer not found

---

## Admin Module

### AdminCommands

**Location**: `src/lib/admin/admin-commands.js`

#### `handleStockCommand(adminTelegramId, commandArgs)`

Handle stock management command.

**Parameters**:
- `adminTelegramId` (number): Admin Telegram ID
- `commandArgs` (string): Command arguments

**Returns**: `Promise<Object>` with response text and parse_mode

**Throws**: `UnauthorizedError` if admin not authorized

### CommandRouter (Hierarchical Commands)

**Location**: `src/lib/admin/hierarchy/command-router.js`

#### `routeCommand(path, telegramUserId, args = '')`

Route a hierarchical command to the appropriate handler.

**Parameters**:
- `path` (string): Command path (e.g., 'admin product add')
- `telegramUserId` (number): Telegram user ID for permission checking
- `args` (string, optional): Command arguments

**Returns**: `Promise<CommandResult>` Routing result with handler or error

**Example**:
```javascript
const commandRouter = require('./src/lib/admin/hierarchy/command-router');
const result = await commandRouter.routeCommand('admin product add', 123456789, 'Product Name 100000');
if (result.success) {
  const response = await result.handler(123456789, 'Product Name 100000');
}
```

### CommandRegistry

**Location**: `src/lib/admin/hierarchy/command-registry.js`

#### `registerCommand(path, handler, options = {})`

Register a hierarchical command.

**Parameters**:
- `path` (string): Command path (e.g., 'admin.product.add')
- `handler` (Function): Command handler function
- `options` (Object, optional):
  - `description` (string): Command description
  - `usage` (string): Usage example
  - `permissions` (Array<string>): Required permissions

#### `getCommand(path)`

Get registered command by path.

**Parameters**:
- `path` (string): Command path

**Returns**: `Command|null` Registered command or null

### CommandHelp

**Location**: `src/lib/admin/hierarchy/command-help.js`

#### `getHelp(path = 'admin', telegramUserId)`

Get help information for commands.

**Parameters**:
- `path` (string): Command path (optional)
- `telegramUserId` (number): Telegram user ID (optional, for permission filtering)

**Returns**: `Promise<HelpInfo>` Help information with available commands

### AdminInterface

**Location**: `src/lib/admin/admin-interface.js`

#### `getOrderHistory(page = 1, limit = 10)`

Get order history with pagination.

**Parameters**:
- `page` (number): Page number
- `limit` (number): Items per page

**Returns**: `Promise<Object>` with orders and pagination info

#### `getCustomerInfo(customerId)`

Get customer information.

**Parameters**:
- `customerId` (number): Customer ID

**Returns**: `Promise<Object>` with customer info and order history

### AdminNotificationDispatcher

**Location**: `src/lib/admin/admin-notification-dispatcher.js`

#### `sendToAllAdmins(notificationType, data, options = {})`

Send notification to all admins.

**Parameters**:
- `notificationType` (string): Notification type
- `data` (Object): Notification data
- `options` (Object, optional): Additional options

**Returns**: `Promise<void>`

---

## Customer Service Module

### FAQHandler

**Location**: `src/lib/customer-service/faq-handler.js`

#### `handleFAQQuery(query)`

Handle FAQ query.

**Parameters**:
- `query` (string): User query

**Returns**: `Promise<Object>` with FAQ response

### ChatHandler

**Location**: `src/lib/customer-service/chat-handler.js`

#### `startChatSession(customerId, initialMessage)`

Start a new chat session.

**Parameters**:
- `customerId` (number): Customer ID
- `initialMessage` (string): Initial message

**Returns**: `Promise<Object>` with session data

#### `sendCustomerMessage(sessionId, message)`

Send customer message to chat session.

**Parameters**:
- `sessionId` (number): Chat session ID
- `message` (string): Message text

**Returns**: `Promise<void>`

### TicketService

**Location**: `src/lib/customer-service/ticket-service.js`

#### `createTicket(customerTelegramId, subject, description, orderId = null)`

Create a support ticket.

**Parameters**:
- `customerTelegramId` (number): Customer Telegram ID
- `subject` (string): Ticket subject
- `description` (string): Ticket description
- `orderId` (number, optional): Related order ID

**Returns**: `Promise<Object>` with ticket data

---

## Security Module

### EncryptionService

**Location**: `src/lib/security/encryption-service.js`

#### `encrypt(plaintext)`

Encrypt sensitive data.

**Parameters**:
- `plaintext` (string): Data to encrypt

**Returns**: `string` Encrypted data (base64)

**Throws**: `Error` if encryption fails

#### `decrypt(encryptedText)`

Decrypt encrypted data.

**Parameters**:
- `encryptedText` (string): Encrypted data (base64)

**Returns**: `string` Decrypted data

**Throws**: `Error` if decryption fails

### CredentialDeliveryService

**Location**: `src/lib/security/credential-delivery.js`

#### `deliverCredentials(orderId, credentials)`

Deliver premium account credentials securely.

**Parameters**:
- `orderId` (number): Order ID
- `credentials` (string): Account credentials

**Returns**: `Promise<void>`

**Throws**: `ValidationError` if order status is invalid

### AccessControl

**Location**: `src/lib/security/access-control.js`

#### `isAdmin(telegramId)`

Check if user is admin.

**Parameters**:
- `telegramId` (number): Telegram user ID

**Returns**: `Promise<boolean>`

#### `hasPermission(telegramId, permission)`

Check if admin has specific permission.

**Parameters**:
- `telegramId` (number): Admin Telegram ID
- `permission` (string): Permission name

**Returns**: `Promise<boolean>`

---

## Database Module

### Database Connection

**Location**: `src/lib/database/db-connection.js`

#### `getDb()`

Get database connection instance.

**Returns**: `Knex` Database instance

#### `closeDb()`

Close database connection pool.

**Returns**: `Promise<void>`

#### `testConnection()`

Test database connection with retry logic.

**Returns**: `Promise<boolean>`

### Query Builder

**Location**: `src/lib/database/query-builder.js`

#### `table(tableName)`

Get query builder for table.

**Parameters**:
- `tableName` (string): Table name

**Returns**: `Knex.QueryBuilder`

---

## Telegram Module

### API Client

**Location**: `src/lib/telegram/api-client.js`

#### `getBot()`

Get Telegram bot instance.

**Returns**: `Telegraf` Bot instance

### Message Builder

**Location**: `src/lib/telegram/message-builder.js`

#### `buildInlineKeyboard(buttons)`

Build inline keyboard markup.

**Parameters**:
- `buttons` (Array): Array of button rows

**Returns**: `Object` Telegram keyboard markup

---

## FRIDAY Persona Module

**Task: T101**  
**Requirements: FR-001, FR-002**  
**Feature: 002-friday-enhancement**

### PersonaService

**Location**: `src/lib/friday/persona-service.js`

#### `getGreeting(telegramUserId, timeOfDay = null)`

Get personalized FRIDAY greeting based on time of day.

**Parameters**:
- `telegramUserId` (number): Telegram user ID
- `timeOfDay` (string, optional): Override time of day ('morning', 'afternoon', 'evening', 'night')

**Returns**: `Promise<string>` Personalized greeting message

**Throws**: `ValidationError` if telegramUserId is invalid

**Time Ranges**:
- Morning: 6:00 - 11:59
- Afternoon: 12:00 - 17:59
- Evening: 18:00 - 23:59
- Night: 0:00 - 5:59

**Example**:
```javascript
const personaService = require('./src/lib/friday/persona-service');
const greeting = await personaService.getGreeting(123456789);
// Returns: "Selamat pagi! Saya FRIDAY, asisten AI Anda. Siap membantu Anda menemukan akun premium terbaik..."
```

#### `getTimeOfDay()`

Determine current time of day based on server time.

**Returns**: `string` One of: 'morning', 'afternoon', 'evening', 'night'

**Example**:
```javascript
const timeOfDay = personaService.getTimeOfDay();
// Returns: 'afternoon'
```

#### `formatMessage(text, options = {})`

Format a message with FRIDAY persona style.

**Parameters**:
- `text` (string): Message text to format
- `options` (Object, optional):
  - `includeGreeting` (boolean): Include time-based greeting (default: false)
  - `tone` (string): Override tone ('professional', 'friendly', 'assistant')

**Returns**: `string` Formatted message

**Example**:
```javascript
const message = personaService.formatMessage('Produk tersedia', { includeGreeting: true });
// Returns formatted message with FRIDAY persona
```

---

## UI Module

**Task: T101**  
**Requirements: FR-003, FR-004, FR-005**  
**Feature: 002-friday-enhancement**

### KeyboardBuilder

**Location**: `src/lib/ui/keyboard-builder.js`

#### `createKeyboard(items, options = {})`

Create responsive inline keyboard with auto-balanced layout.

**Parameters**:
- `items` (Array<Object>): Array of button objects
  - `text` (string): Button text
  - `callback_data` (string): Callback data
  - `url` (string, optional): URL for URL buttons
- `options` (Object, optional):
  - `includeNavigation` (boolean): Include Home/Back buttons (default: true)
  - `maxItemsPerRow` (number): Maximum items per row (default: 3)
  - `pattern` (string): Override pattern (optional)

**Returns**: `Promise<Object>` Telegraf inline keyboard markup

**Layout Patterns**:
- 9 items → 3x3x2 (3 rows × 3, 1 row × 2 nav)
- 6 items → 3x2x2 (3 rows × 2, 1 row × 2 nav)
- 4 items → 3x2x1 (2 rows × 2, 1 row × 1 nav)
- 2 items → 3x1x1 (1 row × 2, 1 row × 1 nav)
- >9 items → Pagination with navigation

**Example**:
```javascript
const keyboardBuilder = require('./src/lib/ui/keyboard-builder');
const items = [
  { text: 'Product 1', callback_data: 'product_1' },
  { text: 'Product 2', callback_data: 'product_2' },
  { text: 'Product 3', callback_data: 'product_3' }
];
const keyboard = await keyboardBuilder.createKeyboard(items);
// Returns: Markup.inlineKeyboard with balanced layout + Home/Back
```

#### `createPaginatedKeyboard(items, options = {})`

Create paginated keyboard for items >9.

**Parameters**:
- `items` (Array<Object>): Array of button objects
- `options` (Object, optional): Same as `createKeyboard`

**Returns**: `Promise<Object>` Telegraf inline keyboard markup with pagination controls

### LayoutBalancer

**Location**: `src/lib/ui/layout-balancer.js`

#### `balanceLayout(items, maxItemsPerRow = 3)`

Auto-balance incomplete rows to distribute items evenly.

**Parameters**:
- `items` (Array): Items to balance
- `maxItemsPerRow` (number): Maximum items per row (default: 3)

**Returns**: `Array<Array>` Array of rows, each row is array of items

**Time Complexity**: O(n) where n is the number of items

**Example**:
```javascript
const { balanceLayout } = require('./src/lib/ui/layout-balancer');
const items = [1, 2, 3, 4, 5, 6, 7]; // 7 items
const rows = balanceLayout(items, 3);
// Returns: [[1, 2, 3], [4, 5], [6, 7]]
// Balanced: 3 items, 2 items, 2 items (difference ≤ 1)
```

### NavigationHandler

**Location**: `src/lib/ui/navigation-handler.js`

#### `createNavigationRow()`

Create fixed navigation row with Home and Back buttons.

**Returns**: `Array<Markup.button>` Array with Home and Back buttons

**Example**:
```javascript
const { createNavigationRow } = require('./src/lib/ui/navigation-handler');
const navRow = createNavigationRow();
// Returns: [Markup.button.callback('🏠 Home', 'nav_home'), 
//           Markup.button.callback('◀️ Back', 'nav_back')]
```

#### `addNavigationHistory(userId, screen)`

Add navigation history entry.

**Parameters**:
- `userId` (number): User Telegram ID
- `screen` (string): Screen identifier

#### `getPreviousScreen(userId)`

Get previous screen from navigation history.

**Parameters**:
- `userId` (number): User Telegram ID

**Returns**: `string|null` Previous screen identifier or null

---

## Shared Utilities

### Configuration

**Location**: `src/lib/shared/config.js`

#### `get(key, defaultValue)`

Get configuration value.

**Parameters**:
- `key` (string): Configuration key
- `defaultValue` (any, optional): Default value

**Returns**: `any` Configuration value

#### `require(key)`

Get required configuration value.

**Parameters**:
- `key` (string): Configuration key

**Returns**: `any` Configuration value

**Throws**: `Error` if key is missing

### Logger

**Location**: `src/lib/shared/logger.js`

#### `info(message, meta = {})`

Log info message.

**Parameters**:
- `message` (string): Log message
- `meta` (Object, optional): Additional metadata

#### `error(message, error, meta = {})`

Log error message.

**Parameters**:
- `message` (string): Log message
- `error` (Error): Error object
- `meta` (Object, optional): Additional metadata

### i18n

**Location**: `src/lib/shared/i18n.js`

#### `t(key, params = {})`

Get translated message in Indonesian.

**Parameters**:
- `key` (string): Message key
- `params` (Object, optional): Parameters to replace

**Returns**: `string` Translated message

### Performance Monitor

**Location**: `src/lib/shared/performance-monitor.js`

#### `startOperation(operationName)`

Start timing an operation.

**Parameters**:
- `operationName` (string): Operation name

**Returns**: `Function` Function to call when operation completes

**Example**:
```javascript
const performanceMonitor = require('./src/lib/shared/performance-monitor');
const endOperation = performanceMonitor.startOperation('getProduct');
// ... perform operation ...
endOperation(true, { productId: 1 });
```

---

## Webhook Endpoints

### Health Check

**Endpoint**: `GET /health`

**Description**: Check system health status.

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:00:00.000Z",
  "services": {
    "database": "ok",
    "redis": "ok"
  }
}
```

**Status Codes**:
- `200`: All services healthy
- `503`: One or more services unhealthy

### Telegram Webhook

**Endpoint**: `POST /webhook/telegram`

**Description**: Receive Telegram Bot API updates.

**Rate Limit**: 100 requests per minute per IP

**Request Body**: Telegram Update object

**Response**: `200 OK`

### Payment Callback (QRIS)

**Endpoint**: `POST /api/payment/callback/qris`

**Description**: Receive payment verification callbacks from Duitku.

**Authentication**: HMAC signature verification

**Rate Limit**: 100 requests per minute per IP

**Request Body**:
```json
{
  "transactionId": "string",
  "orderId": "string",
  "status": "paid",
  "amount": 100000
}
```

**Response**: `200 OK`

### Payment Status Polling

**Endpoint**: `GET /api/payment/callback/status?transaction_id=xxx`

**Description**: Poll payment status.

**Rate Limit**: 100 requests per minute per IP

**Response**:
```json
{
  "transactionId": "string",
  "orderId": "string",
  "status": "paid",
  "amount": 100000
}
```

---

## Error Handling

All errors follow a consistent structure:

```javascript
{
  error: {
    message: "Error message in Indonesian",
    code: "ERROR_CODE",
    details: {} // Additional error details (development only)
  }
}
```

### Error Codes

- `VALIDATION_ERROR`: Input validation failed
- `NOT_FOUND`: Resource not found
- `UNAUTHORIZED`: Unauthorized access
- `DATABASE_ERROR`: Database operation failed
- `PAYMENT_GATEWAY_ERROR`: Payment gateway error
- `INTERNAL_ERROR`: Internal server error

---

## Rate Limiting

All webhook endpoints are rate-limited to 100 requests per minute per IP address.

Rate limit headers are included in responses:
- `RateLimit-Limit`: Maximum requests allowed
- `RateLimit-Remaining`: Remaining requests
- `RateLimit-Reset`: Reset time (Unix timestamp)

---

## Versioning

Current API version: **1.0.0**

All breaking changes will be documented and versioned appropriately.

---

## Support

For API issues or questions:
1. Check error messages and codes
2. Review logs for detailed error information
3. Contact system administrator

---

**Last Updated**: 2024-01-15  
**Maintained By**: Development Team

