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
10. [Shared Utilities](#shared-utilities)
11. [Webhook Endpoints](#webhook-endpoints)

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

Update product stock.

**Parameters**:
- `productId` (number): Product ID
- `quantity` (number): New stock quantity
- `adminTelegramId` (number): Admin Telegram ID

**Returns**: `Promise<Stock>`

**Throws**: `ValidationError` if quantity is invalid

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

