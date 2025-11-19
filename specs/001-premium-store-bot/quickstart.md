# Quickstart Guide: Premium Account Store Telegram Bot

**Feature**: Premium Account Store Telegram Bot  
**Date**: 2025-11-19  
**Purpose**: Step-by-step guide to set up and test the bot locally

## Prerequisites

- Node.js LTS 20.x or later installed
- PostgreSQL 14+ or MySQL 8.0+ installed and running
- Redis 7.0+ installed and running
- Telegram Bot Token (from [@BotFather](https://t.me/BotFather))
- Duitku API credentials (for QRIS payment testing)
- ngrok or similar tool for webhook testing (local development)

## Initial Setup

### 1. Install Dependencies

```bash
npm install
```

**Key Dependencies**:
- `telegraf` - Telegram bot framework
- `knex` - Database query builder
- `pg` / `mysql2` - Database drivers
- `ioredis` - Redis client
- `express` - Webhook server
- `duitku` - Duitku payment gateway SDK
- `jest` - Testing framework

### 2. Database Setup

**PostgreSQL**:
```bash
createdb storebot
psql storebot < migrations/001_initial_schema.sql
```

**MySQL**:
```bash
mysql -u root -p
CREATE DATABASE storebot;
USE storebot;
SOURCE migrations/001_initial_schema.sql;
```

### 3. Environment Configuration

Create `.env` file:

```env
# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_WEBHOOK_SECRET=your_webhook_secret

# Database
DB_TYPE=postgresql  # or 'mysql'
DB_HOST=localhost
DB_PORT=5432  # 3306 for MySQL
DB_NAME=storebot
DB_USER=your_db_user
DB_PASSWORD=your_db_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Payment Gateway
DUITKU_MERCHANT_CODE=your_merchant_code
DUITKU_API_KEY=your_api_key
DUITKU_CALLBACK_URL=https://your-domain.com/api/payment/callback/qris

# Security
ENCRYPTION_KEY=your_32_character_encryption_key
JWT_SECRET=your_jwt_secret

# Server
PORT=3000
NODE_ENV=development
```

### 4. Run Database Migrations

```bash
npm run migrate
```

## Testing Scenarios

### Scenario 1: Product Browsing (User Story 1)

**Objective**: Test customer can browse products with card-style display

**Steps**:
1. Start the bot: `npm start`
2. Open Telegram and find your bot
3. Send `/start` command
4. **Expected**: Bot responds with welcome message in Indonesian and shows first product card with inline keyboard (Next/Previous buttons)
5. Click "Next" button on inline keyboard
6. **Expected**: Next product card displayed with updated product information
7. Click "Previous" button
8. **Expected**: Previous product card displayed

**Validation**:
- ✅ Product cards show name, price, stock status
- ✅ Navigation buttons work correctly
- ✅ All text in Indonesian language
- ✅ Inline keyboard displayed properly

---

### Scenario 2: View Product Details (User Story 2)

**Objective**: Test customer can view detailed product information with media group

**Steps**:
1. From product browsing, click "Lihat Detail" (View Details) button
2. **Expected**: Detailed product view displayed with:
   - Media group (multiple images/documents if available)
   - Product description in Indonesian
   - Price and features
   - Stock status
3. If product has no media, verify text information still displays

**Validation**:
- ✅ Media group displays multiple items together
- ✅ All information in Indonesian
- ✅ Product details complete and accurate

---

### Scenario 3: Complete Purchase (User Story 3)

**Objective**: Test full checkout process with QRIS payment

**Steps**:
1. View product details and click "Beli" (Buy) button
2. **Expected**: Checkout wizard starts with order summary
3. Confirm product selection
4. **Expected**: Prompt to select payment method (QRIS or Bank Transfer)
5. Select "QRIS" payment method
6. **Expected**: Receive QRIS payment code/image and instructions
7. Complete payment via QRIS (use test payment if available)
8. **Expected**: Payment automatically verified, order status updates
9. **Expected**: Receive premium account credentials securely

**Validation**:
- ✅ Step-by-step process clear and in Indonesian
- ✅ QRIS payment code displayed correctly
- ✅ Payment verification automatic
- ✅ Credentials delivered securely

---

### Scenario 4: Manual Bank Transfer (User Story 3)

**Objective**: Test manual bank transfer payment flow

**Steps**:
1. Start checkout and select "Transfer Bank" payment method
2. **Expected**: Receive bank account details and upload instructions
3. Upload payment proof (image/document)
4. **Expected**: Admin receives notification with payment proof
5. Admin verifies payment via admin command
6. **Expected**: Order proceeds to processing, customer receives status update
7. **Expected**: Account credentials delivered

**Validation**:
- ✅ Bank transfer instructions clear
- ✅ Payment proof upload works
- ✅ Admin notification received
- ✅ Manual verification process works

---

### Scenario 5: Order Status Updates (User Story 4)

**Objective**: Test real-time order status notifications

**Steps**:
1. Create an order (from Scenario 3 or 4)
2. **Expected**: Receive notification "Payment Received - Processing"
3. Wait for account preparation (or trigger manually)
4. **Expected**: Receive notification "Preparing Your Account"
5. When credentials sent
6. **Expected**: Receive secure delivery notification with credentials
7. **Expected**: Receive final completion notification

**Validation**:
- ✅ Notifications sent within 10 seconds of status change
- ✅ Rich media notifications with progress indicators
- ✅ All notifications in Indonesian
- ✅ Status updates accurate

---

### Scenario 6: Admin Stock Management (User Story 5)

**Objective**: Test admin can manage stock and control store

**Steps**:
1. Admin sends `/stock update <product_id> <quantity>` command
2. **Expected**: Stock updated, confirmation message
3. Verify product display shows updated stock
4. Admin sends `/close` command
5. **Expected**: Store status set to closed
6. Customer tries to browse
7. **Expected**: Message "Toko sedang tutup" (Store is closed)
8. Admin sends `/open` command
9. **Expected**: Store reopened, customers can browse again

**Validation**:
- ✅ Stock updates reflected immediately
- ✅ Store open/close commands work
- ✅ Customer access blocked when closed
- ✅ Store reopens correctly

---

### Scenario 7: Admin Notifications (User Story 6)

**Objective**: Test admin receives real-time notifications

**Steps**:
1. Customer places new order
2. **Expected**: Admin receives notification with order details
3. Customer uploads payment proof (manual transfer)
4. **Expected**: Admin receives notification with payment proof and action buttons
5. Admin clicks "Verify Payment" button
6. **Expected**: Payment verified, order proceeds, customer notified

**Validation**:
- ✅ Admin notifications received within 5 seconds
- ✅ Notifications include all relevant details
- ✅ Action buttons work correctly
- ✅ Customer notified after admin action

---

## Integration Testing with Real Telegram API

**Important**: Per Article IX, all integration tests MUST use real Telegram Bot API.

### Setup Test Bot

1. Create test bot via [@BotFather](https://t.me/BotFather)
2. Get test bot token
3. Set test bot token in `.env.test`
4. Use ngrok to expose local server: `ngrok http 3000`
5. Set webhook: `curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://your-ngrok-url.ngrok.io/webhook"`

### Run Integration Tests

```bash
npm run test:integration
```

**Test Files**:
- `tests/integration/product-browsing.test.js` - Tests User Story 1
- `tests/integration/checkout-flow.test.js` - Tests User Story 3
- `tests/integration/payment-verification.test.js` - Tests payment flows
- `tests/integration/admin-commands.test.js` - Tests User Stories 5 & 6

**Test Requirements**:
- All tests use real Telegram Bot API (no mocks)
- Tests verify actual bot responses
- Tests validate Indonesian language content
- Tests check rich media elements (inline keyboards, media groups)

---

## Development Workflow

### 1. Start Development Server

```bash
npm run dev
```

### 2. Test Locally with ngrok

```bash
ngrok http 3000
# Use ngrok URL for webhook
```

### 3. Run Tests

```bash
# Unit tests
npm run test:unit

# Integration tests (real Telegram API)
npm run test:integration

# All tests
npm run test
```

### 4. Database Migrations

```bash
# Create new migration
npm run migrate:create <migration_name>

# Run migrations
npm run migrate

# Rollback last migration
npm run migrate:rollback
```

---

## Common Issues & Solutions

### Issue: Webhook not receiving updates
**Solution**: Verify webhook URL is HTTPS, check ngrok tunnel, verify bot token

### Issue: Database connection fails
**Solution**: Check database is running, verify credentials in `.env`, test connection with `psql`/`mysql`

### Issue: Payment callback not working
**Solution**: Verify Duitku webhook URL is accessible, check HMAC signature validation, verify callback endpoint

### Issue: Redis connection fails
**Solution**: Check Redis is running (`redis-cli ping`), verify Redis host/port in `.env`

---

## Next Steps

After completing quickstart scenarios:

1. Review implementation plan: `plan.md`
2. Check data model: `data-model.md`
3. Review API contracts: `contracts/`
4. Proceed to task breakdown: `/speckit.tasks`

