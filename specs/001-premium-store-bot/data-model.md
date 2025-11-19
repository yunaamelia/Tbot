# Data Model: Premium Account Store Telegram Bot

**Feature**: Premium Account Store Telegram Bot  
**Date**: 2025-11-19  
**Database**: PostgreSQL (primary) / MySQL (supported via Knex.js abstraction)

## Entity Relationships

```
Customer ──< Order ──> Product
  │           │
  │           └──> Payment
  │
  └──> Notification

Admin ──> Stock (updates)
Admin ──> Payment (manual verification)
Admin ──> Notification (receives)
```

## Entities

### Product

Represents a premium account product for sale (GitHub Copilot, GitHub Student, cloud panel accounts, etc.).

**Table**: `products`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT | PRIMARY KEY, AUTO_INCREMENT | Unique product identifier |
| name | VARCHAR(255) | NOT NULL | Product name (e.g., "GitHub Copilot Individual") |
| description | TEXT | | Product description in Indonesian |
| price | DECIMAL(10,2) | NOT NULL, >= 0 | Product price in IDR |
| stock_quantity | INT | NOT NULL, >= 0 | Current available stock |
| category | VARCHAR(100) | | Product category (e.g., "GitHub", "Cloud Panel") |
| features | JSON | | Array of product features in Indonesian |
| media_files | JSON | | Array of media file IDs (Telegram file_ids) |
| availability_status | ENUM | NOT NULL | 'available', 'out_of_stock', 'discontinued' |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Indexes**:
- `idx_products_category` on `category`
- `idx_products_availability` on `availability_status`
- `idx_products_created` on `created_at`

**Validation Rules**:
- `price` must be positive
- `stock_quantity` cannot be negative
- `name` must be unique
- `availability_status` automatically set to 'out_of_stock' when `stock_quantity` = 0

**State Transitions**:
- `available` → `out_of_stock` (when stock reaches 0)
- `out_of_stock` → `available` (when stock added)
- `available`/`out_of_stock` → `discontinued` (admin action)

---

### Customer

Represents a user who interacts with the bot.

**Table**: `customers`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT | PRIMARY KEY, AUTO_INCREMENT | Unique customer identifier |
| telegram_user_id | BIGINT | NOT NULL, UNIQUE | Telegram user ID (from Telegram API) |
| name | VARCHAR(255) | | Customer name from Telegram profile |
| username | VARCHAR(100) | | Telegram username (nullable) |
| purchase_history | JSON | | Array of order IDs for personalization |
| behavior_patterns | JSON | | Behavior data (browsed products, preferences) |
| preferences | JSON | | Customer preferences (language, notifications) |
| registration_timestamp | TIMESTAMP | NOT NULL, DEFAULT NOW() | First interaction timestamp |
| last_activity_timestamp | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last interaction timestamp |

**Indexes**:
- `idx_customers_telegram_id` on `telegram_user_id` (UNIQUE)
- `idx_customers_username` on `username`
- `idx_customers_last_activity` on `last_activity_timestamp`

**Validation Rules**:
- `telegram_user_id` must be unique (one customer per Telegram account)
- `purchase_history` JSON array contains valid order IDs
- `last_activity_timestamp` updated on every interaction

---

### Order

Represents a customer purchase transaction.

**Table**: `orders`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT | PRIMARY KEY, AUTO_INCREMENT | Unique order identifier |
| customer_id | BIGINT | NOT NULL, FOREIGN KEY | References customers.id |
| product_id | BIGINT | NOT NULL, FOREIGN KEY | References products.id |
| quantity | INT | NOT NULL, > 0 | Quantity purchased |
| total_amount | DECIMAL(10,2) | NOT NULL, > 0 | Total order amount (product.price * quantity) |
| payment_method | ENUM | NOT NULL | 'qris', 'manual_bank_transfer' |
| payment_status | ENUM | NOT NULL, DEFAULT 'pending' | 'pending', 'verified', 'failed', 'refunded' |
| order_status | ENUM | NOT NULL, DEFAULT 'pending_payment' | 'pending_payment', 'payment_received', 'processing', 'account_delivered', 'completed', 'cancelled' |
| created_timestamp | TIMESTAMP | NOT NULL, DEFAULT NOW() | Order creation timestamp |
| payment_verification_timestamp | TIMESTAMP | | When payment was verified |
| completed_timestamp | TIMESTAMP | | When order was completed |
| account_credentials | TEXT | | Encrypted account credentials (encrypted at rest) |

**Indexes**:
- `idx_orders_customer` on `customer_id`
- `idx_orders_product` on `product_id`
- `idx_orders_status` on `order_status`
- `idx_orders_payment_status` on `payment_status`
- `idx_orders_created` on `created_timestamp`

**Foreign Keys**:
- `fk_orders_customer` → `customers.id` ON DELETE RESTRICT
- `fk_orders_product` → `products.id` ON DELETE RESTRICT

**Validation Rules**:
- `quantity` must be positive
- `total_amount` = `product.price * quantity` (validated in application)
- `order_status` transitions follow defined state machine
- `account_credentials` encrypted using AES-256 before storage

**State Transitions**:
```
pending_payment → payment_received (when payment verified)
payment_received → processing (automatic)
processing → account_delivered (when credentials sent)
account_delivered → completed (automatic after delivery confirmation)
[any] → cancelled (admin action or timeout)
```

---

### Payment

Represents payment transaction records.

**Table**: `payments`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT | PRIMARY KEY, AUTO_INCREMENT | Unique payment identifier |
| order_id | BIGINT | NOT NULL, FOREIGN KEY, UNIQUE | References orders.id (one payment per order) |
| payment_method | ENUM | NOT NULL | 'qris', 'manual_bank_transfer' |
| amount | DECIMAL(10,2) | NOT NULL, > 0 | Payment amount |
| status | ENUM | NOT NULL, DEFAULT 'pending' | 'pending', 'verified', 'failed', 'refunded' |
| verification_method | ENUM | | 'automatic', 'manual' |
| payment_proof | TEXT | | Payment proof (image/document) for manual verification |
| payment_gateway_transaction_id | VARCHAR(255) | | QRIS gateway transaction ID |
| verification_timestamp | TIMESTAMP | | When payment was verified |
| admin_id | BIGINT | FOREIGN KEY | References admins.id (for manual verification) |
| created_timestamp | TIMESTAMP | NOT NULL, DEFAULT NOW() | Payment creation timestamp |

**Indexes**:
- `idx_payments_order` on `order_id` (UNIQUE)
- `idx_payments_status` on `status`
- `idx_payments_gateway_id` on `payment_gateway_transaction_id`
- `idx_payments_created` on `created_timestamp`

**Foreign Keys**:
- `fk_payments_order` → `orders.id` ON DELETE CASCADE
- `fk_payments_admin` → `admins.id` ON DELETE SET NULL

**Validation Rules**:
- `amount` must match `order.total_amount`
- `verification_method` = 'automatic' for QRIS, 'manual' for bank transfer
- `admin_id` required when `verification_method` = 'manual'
- `payment_gateway_transaction_id` required when `payment_method` = 'qris'

---

### Stock

Represents inventory levels and update history for products.

**Table**: `stock`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT | PRIMARY KEY, AUTO_INCREMENT | Unique stock record identifier |
| product_id | BIGINT | NOT NULL, FOREIGN KEY, UNIQUE | References products.id (one stock record per product) |
| current_quantity | INT | NOT NULL, >= 0 | Current available stock |
| reserved_quantity | INT | NOT NULL, DEFAULT 0, >= 0 | Quantity reserved for pending orders |
| last_updated_timestamp | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last update timestamp |
| last_updated_by | BIGINT | FOREIGN KEY | References admins.id |

**Indexes**:
- `idx_stock_product` on `product_id` (UNIQUE)
- `idx_stock_updated` on `last_updated_timestamp`

**Foreign Keys**:
- `fk_stock_product` → `products.id` ON DELETE CASCADE
- `fk_stock_admin` → `admins.id` ON DELETE SET NULL

**Validation Rules**:
- `current_quantity` cannot be negative
- `reserved_quantity` cannot exceed `current_quantity`
- `current_quantity` + `reserved_quantity` = total stock
- Stock updates trigger product availability_status update

---

### Admin

Represents store administrators with management privileges.

**Table**: `admins`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT | PRIMARY KEY, AUTO_INCREMENT | Unique admin identifier |
| telegram_user_id | BIGINT | NOT NULL, UNIQUE | Telegram user ID (from Telegram API) |
| name | VARCHAR(255) | | Admin name |
| username | VARCHAR(100) | | Telegram username |
| permissions | JSON | NOT NULL | Array of permission strings (e.g., ["stock_manage", "payment_verify", "store_control"]) |
| notification_preferences | JSON | | Notification settings (email, telegram, etc.) |
| last_activity_timestamp | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last activity timestamp |
| created_timestamp | TIMESTAMP | NOT NULL, DEFAULT NOW() | Admin creation timestamp |

**Indexes**:
- `idx_admins_telegram_id` on `telegram_user_id` (UNIQUE)
- `idx_admins_username` on `username`

**Validation Rules**:
- `telegram_user_id` must be unique
- `permissions` JSON array contains valid permission strings
- At least one admin must have 'store_control' permission

---

### Notification

Represents system notifications sent to customers or admins.

**Table**: `notifications`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT | PRIMARY KEY, AUTO_INCREMENT | Unique notification identifier |
| recipient_id | BIGINT | NOT NULL | Telegram user ID (customer or admin) |
| recipient_type | ENUM | NOT NULL | 'customer', 'admin' |
| type | ENUM | NOT NULL | 'order_status', 'payment', 'admin_alert', 'system' |
| content | TEXT | NOT NULL | Notification content in Indonesian |
| rich_media_attachments | JSON | | Array of media file IDs or inline keyboard data |
| order_id | BIGINT | FOREIGN KEY | References orders.id (if notification related to order) |
| sent_timestamp | TIMESTAMP | NOT NULL, DEFAULT NOW() | When notification was sent |
| read_timestamp | TIMESTAMP | | When notification was read (nullable) |
| read_status | ENUM | NOT NULL, DEFAULT 'unread' | 'unread', 'read' |

**Indexes**:
- `idx_notifications_recipient` on `recipient_id`, `recipient_type`
- `idx_notifications_type` on `type`
- `idx_notifications_order` on `order_id`
- `idx_notifications_sent` on `sent_timestamp`
- `idx_notifications_read_status` on `read_status`

**Foreign Keys**:
- `fk_notifications_order` → `orders.id` ON DELETE SET NULL

**Validation Rules**:
- `content` must be in Indonesian language
- `rich_media_attachments` JSON contains valid Telegram media format
- `read_timestamp` set when `read_status` = 'read'

---

## Store Configuration

**Table**: `store_config`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| key | VARCHAR(100) | PRIMARY KEY | Configuration key |
| value | TEXT | NOT NULL | Configuration value (JSON for complex values) |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Configuration Keys**:
- `store_status`: 'open' or 'closed' (controlled by /open, /close commands)
- `backup_schedule`: Backup configuration (JSON)
- `payment_settings`: Payment gateway settings (JSON, encrypted)

---

## Audit Log

**Table**: `audit_logs`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT | PRIMARY KEY, AUTO_INCREMENT | Unique log identifier |
| admin_id | BIGINT | FOREIGN KEY | References admins.id (who performed action) |
| action_type | VARCHAR(100) | NOT NULL | Action type (e.g., 'credential_access', 'stock_update', 'payment_verify') |
| entity_type | VARCHAR(100) | | Entity type (e.g., 'order', 'product', 'customer') |
| entity_id | BIGINT | | Entity ID |
| details | JSON | | Action details (encrypted if sensitive) |
| ip_address | VARCHAR(45) | | IP address of action (if available) |
| timestamp | TIMESTAMP | NOT NULL, DEFAULT NOW() | Action timestamp |

**Indexes**:
- `idx_audit_admin` on `admin_id`
- `idx_audit_action` on `action_type`
- `idx_audit_entity` on `entity_type`, `entity_id`
- `idx_audit_timestamp` on `timestamp`

**Foreign Keys**:
- `fk_audit_admin` → `admins.id` ON DELETE SET NULL

**Validation Rules**:
- All premium account credential access MUST be logged
- All payment verifications MUST be logged
- Sensitive data in `details` encrypted before storage

---

## Database Constraints & Business Rules

### Stock Management
- When order created: `stock.reserved_quantity` increases
- When payment verified: `stock.current_quantity` decreases, `reserved_quantity` decreases
- When order cancelled: `reserved_quantity` decreases
- Stock updates must be atomic (use database transactions)

### Order Processing
- Order can only transition to next status if current status allows it
- Payment verification required before order can proceed to 'processing'
- Account credentials encrypted before storage in `orders.account_credentials`
- Order completion triggers customer notification

### Payment Verification
- QRIS payments verified automatically via webhook
- Manual bank transfer requires admin verification
- Payment amount must match order total amount
- Duplicate payment verifications prevented (status check)

### Security
- All premium account credentials encrypted at rest (AES-256)
- Access to credentials logged in audit_logs
- Admin actions logged with timestamp and details
- Database credentials stored in environment variables (not in code)

---

## Migration Strategy

1. **Initial Schema**: Create all tables with indexes and foreign keys
2. **Data Seeding**: Insert initial admin user, store configuration
3. **Index Optimization**: Add indexes based on query patterns after initial deployment
4. **Backward Compatibility**: All migrations reversible for rollback support

---

## Backup & Recovery

- Daily full database backups (pg_dump/mysqldump)
- Transaction log backups for point-in-time recovery
- Encrypted backup storage
- Recovery tested monthly
- Backup retention: 30 days minimum

