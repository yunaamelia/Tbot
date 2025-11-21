# 📋 SPESIFIKASI LENGKAP BOT PREMIUM STORE

**Nama Bot**: Premium Store Bot (FRIDAY AI Assistant)  
**Versi**: 1.0.0  
**Platform**: Telegram Bot API  
**Bahasa**: Node.js 20+  
**Tanggal**: 2025-11-21

---

## 📌 RINGKASAN EKSEKUTIF

Premium Store Bot adalah Telegram bot assistant yang dirancang untuk toko akun premium yang menjual:

- GitHub Copilot
- GitHub Student Pack
- Cloud Panel Accounts
- VCC Premium

Bot ini menggunakan persona **FRIDAY** (Iron Man-style AI assistant) dengan fitur-fitur canggih untuk manajemen produk, pemrosesan pembayaran, dan pengalaman pengguna yang responsif.

---

## 🏗️ ARSITEKTUR SISTEM

### Stack Teknologi

**Runtime & Framework:**

- **Node.js**: LTS 20.x atau lebih baru
- **Telegraf**: ^4.15.0 (Telegram Bot API framework)
- **Express.js**: ^4.18.2 (Webhook server)

**Database:**

- **PostgreSQL**: 14+ atau **MySQL**: 8.0+
- **Knex.js**: ^3.0.1 (SQL query builder)
- **pg**: ^8.11.3 (PostgreSQL driver)
- **mysql2**: ^3.6.5 (MySQL driver)

**Cache & Real-time:**

- **Redis**: 7.0+
- **ioredis**: ^5.3.2 (Redis client)
- **Redis Pub/Sub**: Untuk real-time stock updates

**Payment Gateway:**

- **Duitku**: ^0.0.7 (QRIS payment integration)

**Utilities:**

- **dotenv**: ^16.3.1 (Environment configuration)
- **node-cron**: ^3.0.3 (Scheduled tasks)
- **express-rate-limit**: ^7.1.5 (Rate limiting)

**Testing & Quality:**

- **Jest**: ^29.7.0 (Testing framework)
- **ESLint**: ^8.56.0 (Code linting)
- **Prettier**: ^3.1.1 (Code formatting)
- **Husky**: ^9.1.7 (Git hooks)
- **supertest**: ^6.3.3 (HTTP testing)

---

## 🎯 FITUR UTAMA

### 1. FRIDAY AI Persona (Feature Branch: 002-friday-enhancement)

**Deskripsi**: Personalized time-based greetings dengan persona AI assistant bergaya Iron Man.

**Waktu Greeting:**

- **Morning** (06:00-11:59): "Selamat pagi! Saya FRIDAY, asisten AI Anda..."
- **Afternoon** (12:00-17:59): "Selamat siang! Saya FRIDAY, asisten AI Anda..."
- **Evening** (18:00-23:59): "Selamat malam! Saya FRIDAY, asisten AI Anda..."
- **Night** (00:00-05:59): "Halo! Saya FRIDAY, asisten AI Anda..."

**Implementasi:**

- File: `src/lib/friday/persona-service.js`
- File: `src/lib/friday/greeting-templates.js`
- File: `src/lib/friday/persona-formatter.js`

**User Story**: US1 - FRIDAY Personalized Welcome Experience (Priority: P1)

---

### 2. Responsive Inline Keyboard System (Feature Branch: 003-enhanced-keyboard)

**Deskripsi**: Auto-balancing inline keyboard layouts dengan pagination support.

**Layout Patterns:**

- **1-3 items**: Single row layout (1 row)
- **4-6 items**: 2 rows dengan maksimal 3 buttons per row
- **7-9 items**: 3 rows dengan maksimal 3 buttons per row
- **10+ items**: Pagination dengan "more" button (9 items per page)

**Fitur:**

- Auto-balancing untuk incomplete rows
- Pagination navigation (Prev/Next)
- Fixed navigation buttons (Home, Help, Back)
- Button label truncation (max 20 karakter)
- Color coding dan emojis/icons
- Interactive feedback (loading states, click animations)

**Implementasi:**

- File: `src/lib/ui/keyboard-builder.js`
- File: `src/lib/ui/layout-balancer.js`
- File: `src/lib/ui/button-state-manager.js`
- File: `src/lib/ui/navigation-handler.js`

**User Stories:**

- US1: Responsive Dynamic Layout for Menu Items (Priority: P1)
- US2: Fixed Navigation Controls (Priority: P1)
- US4: Visual Enhancements and Interactive Feedback (Priority: P2)
- US5: Pagination for Large Menus (Priority: P2)

---

### 3. Role-Based Access Control

**Deskripsi**: Sistem akses berbasis peran dengan admin/user roles.

**Roles:**

- **Admin**: Akses penuh ke fitur manajemen
- **Regular User**: Akses terbatas ke fitur customer

**Fitur:**

- Role detection via Telegram User ID
- Redis caching untuk performa (<200ms target)
- Menu filtering berdasarkan role
- Disabled buttons untuk akses terbatas
- Fail-safe: Default ke regular user jika detection gagal

**Implementasi:**

- File: `src/lib/security/role-filter.js`
- File: `src/lib/security/access-control.js`
- File: `src/lib/admin/admin-repository.js`

**User Story**: US3 - Role-Based Menu Access (Priority: P1)

---

### 4. Dynamic Payment Method Configuration

**Deskripsi**: Konfigurasi metode pembayaran via environment variables.

**Payment Methods:**

1. **QRIS** (Quick Response Indonesian Standard)
   - Duitku integration
   - Automatic verification dengan manual fallback
   - 5-minute timeout untuk automatic verification

2. **E-Wallet**
   - Configurable via environment variables
   - Manual verification

3. **Bank Transfer**
   - Configurable via environment variables
   - Manual verification dengan payment proof upload

**Configuration:**

```bash
# QRIS Configuration
QRIS_MERCHANT_CODE=your_merchant_code
QRIS_API_KEY=your_api_key
QRIS_CALLBACK_URL=https://your-domain.com/api/payment/callback/qris

# E-Wallet Configuration
EWALLET_NAME=GoPay
EWALLET_NUMBER=081234567890
EWALLET_HOLDER=Your Name

# Bank Transfer Configuration
BANK_NAME=BCA
BANK_ACCOUNT_NUMBER=1234567890
BANK_ACCOUNT_HOLDER=Your Name
```

**Implementasi:**

- File: `src/lib/payment/config/payment-config.js`
- File: `src/lib/payment/config/method-validator.js`
- File: `src/lib/payment/qris-handler.js`
- File: `src/lib/payment/manual-verification.js`
- File: `src/lib/order/checkout-handler.js`

**User Stories:**

- US3: Dynamic Payment Method Selection (Priority: P1)
- US6: Hybrid Payment Processing (Priority: P2)

---

### 5. Hierarchical Admin Command System

**Deskripsi**: Sistem perintah admin berhierarki dengan permission-based access control.

**Command Structure:**

```
/admin                           # Top-level menu
/admin product                   # Product category
/admin product add               # Add product
/admin product stock update      # Update stock
/admin store open                # Open store
/admin store close               # Close store
/admin help                      # Command help
```

**Fitur:**

- Command registry dengan path-based routing
- Permission checking per command
- Help system dengan suggestions
- Inline keyboard untuk command navigation
- Command discovery dan autocomplete

**Implementasi:**

- File: `src/lib/admin/hierarchy/command-registry.js`
- File: `src/lib/admin/hierarchy/command-router.js`
- File: `src/lib/admin/hierarchy/command-help.js`
- File: `src/lib/admin/admin-commands.js`
- File: `src/lib/admin/wizard/product-add-wizard.js`

**User Story**: US4 - Hierarchical Admin Command System (Priority: P2)

**Product Add Wizard:**

- Multi-step wizard untuk menambah produk
- Steps: name, description, price, stock, category, confirm
- Redis-based session management
- Validation per step
- Inline keyboard untuk navigation (Back, Skip, Cancel, Next, Confirm)

---

### 6. Real-Time Stock Management

**Deskripsi**: Update stok real-time dengan immediate reflection di catalog.

**Fitur:**

- Redis Pub/Sub untuk real-time notifications (`stock:updated` channel)
- Automatic catalog sync pada stock changes
- Cache invalidation untuk immediate updates
- Audit tracking: `last_updated_by` dan `update_history`
- Race condition prevention via database transactions
- Automatic availability status update:
  - Stock = 0 → `availability_status = 'out_of_stock'`
  - Stock > 0 (dari 0) → `availability_status = 'available'`

**Implementasi:**

- File: `src/lib/product/realtime/stock-notifier.js`
- File: `src/lib/product/realtime/catalog-sync.js`
- File: `src/lib/product/stock-manager.js`
- File: `src/lib/product/stock-repository.js`

**User Story**: US5 - Real-Time Stock Management (Priority: P2)

---

### 7. Hybrid Payment Processing

**Deskripsi**: Automatic QRIS verification dengan manual fallback untuk reliability.

**Flow:**

1. Customer completes QRIS payment
2. System attempts automatic verification (5-minute timeout)
3. If automatic fails/timeout → Manual verification workflow
4. Admin reviews payment proof
5. Admin verifies/rejects payment
6. Customer receives confirmation

**Fitur:**

- Automatic verification via Duitku webhook
- Manual fallback dengan admin review
- Payment proof upload untuk manual verification
- Real-time status updates untuk customer
- Notification system untuk admin

**Implementasi:**

- File: `src/lib/payment/qris-handler.js`
- File: `src/lib/payment/manual-verification.js`
- File: `src/lib/payment/payment-service.js`
- File: `src/lib/payment/webhook-verifier.js`
- File: `server.js` (webhook endpoints)

**User Story**: US6 - Hybrid Payment Processing (Priority: P2)

---

### 8. Product Management

**Deskripsi**: Sistem manajemen produk dengan card-style display dan media groups.

**Fitur:**

- Product browsing dengan card-style display
- Product details dengan media groups (images, documents)
- Category filtering
- Stock status display
- Availability status (available, out_of_stock, discontinued)
- Inline keyboard navigation (Next/Previous buttons)
- Product carousel

**Implementasi:**

- File: `src/lib/product/product-service.js`
- File: `src/lib/product/product-repository.js`
- File: `src/lib/product/product-card-formatter.js`
- File: `src/lib/product/product-details-handler.js`
- File: `src/lib/product/product-carousel-handler.js`
- File: `src/models/product.js`

---

### 9. Order Management

**Deskripsi**: Sistem pemrosesan pesanan dengan checkout flow dan order tracking.

**Order Flow:**

1. **Order Summary**: Product, price, quantity
2. **Payment Method Selection**: QRIS, E-Wallet, Bank Transfer
3. **Payment Processing**: Automatic atau manual verification
4. **Order Confirmation**: Status update dan notification

**Order Statuses:**

- `pending_payment`: Menunggu pembayaran
- `payment_received`: Pembayaran diterima
- `processing`: Memproses pesanan
- `account_delivered`: Akun dikirim
- `completed`: Pesanan selesai
- `cancelled`: Pesanan dibatalkan

**Payment Statuses:**

- `pending`: Menunggu verifikasi
- `verified`: Terverifikasi
- `failed`: Gagal
- `refunded`: Dikembalikan

**Implementasi:**

- File: `src/lib/order/order-service.js`
- File: `src/lib/order/order-repository.js`
- File: `src/lib/order/checkout-handler.js`
- File: `src/lib/order/checkout-session.js`
- File: `src/lib/order/checkout-timeout.js`
- File: `src/models/order.js`

---

### 10. Security Features

**Deskripsi**: Security-first approach untuk premium account delivery.

**Fitur:**

- **Encryption at Rest**: AES-256-GCM untuk premium account credentials
- **Secure Delivery**: Credentials hanya dikirim setelah payment verification
- **Audit Logging**: Tracking untuk semua credential access dan delivery
- **HMAC Verification**: Untuk payment webhooks
- **Admin Authentication**: Telegram User ID whitelist
- **Rate Limiting**: Untuk webhook endpoints
- **Input Validation**: Sanitization dan validation untuk semua inputs

**Implementasi:**

- File: `src/lib/security/encryption-service.js`
- File: `src/lib/security/credential-delivery.js`
- File: `src/lib/security/audit-logger.js`
- File: `src/lib/security/tls-verifier.js`
- File: `src/lib/security/access-control.js`
- File: `src/lib/shared/input-validator.js`
- File: `src/lib/payment/webhook-verifier.js`

---

### 11. Notification System

**Deskripsi**: Sistem notifikasi untuk customer dan admin.

**Notification Types:**

- **Order Status**: Update status pesanan
- **Payment**: Konfirmasi pembayaran
- **Admin Alert**: Alert untuk admin (new orders, stock low, etc.)
- **System**: System notifications

**Fitur:**

- Rich media notifications (images, documents)
- Real-time delivery
- Retry mechanism untuk failed notifications
- Notification preferences per admin
- Read status tracking

**Implementasi:**

- File: `src/lib/admin/notification-service.js`
- File: `src/lib/admin/notification-dispatcher.js`
- File: `src/lib/admin/notification-sender.js`
- File: `src/lib/admin/notification-retry-scheduler.js`
- File: `src/lib/shared/notification-templates.js`
- File: `src/models/notification.js`

---

### 12. Customer Service Features

**Deskripsi**: Sistem customer service dengan FAQ, chat, dan ticket service.

**Fitur:**

- **FAQ Handler**: Automated responses untuk frequently asked questions
- **Chat Handler**: Direct chat dengan customer service
- **Ticket Service**: Ticket creation dan management
- **Personalization Engine**: Behavior-based recommendations
- **Customer Service Router**: Routing berdasarkan message content

**Implementasi:**

- File: `src/lib/customer-service/faq-handler.js`
- File: `src/lib/customer-service/chat-handler.js`
- File: `src/lib/customer-service/ticket-service.js`
- File: `src/lib/customer-service/personalization-engine.js`
- File: `src/lib/customer-service/customer-service-router.js`

---

### 13. Monitoring & Logging

**Deskripsi**: Sistem monitoring dan logging untuk performance tracking.

**Fitur:**

- **Interaction Logging**: Log semua user interactions (who clicked what, when)
- **Response Time Tracking**: Track response times untuk button actions
- **Error Logging**: Record errors dan exceptions untuk debugging
- **Performance Monitoring**: Monitor system performance metrics

**Database Tables:**

- `interaction_logs`: Log semua interactions dengan metadata

**Implementasi:**

- File: `src/lib/monitoring/interaction-logger.js`
- File: `src/lib/shared/performance-monitor.js`
- File: `src/lib/shared/logger.js`

---

### 14. Store Configuration

**Deskripsi**: Konfigurasi toko (buka/tutup, settings).

**Fitur:**

- Store open/close status
- Store closed message customization
- Configuration via database (`store_config` table)

**Implementasi:**

- File: `src/lib/shared/store-config.js`
- File: `src/lib/admin/admin-commands.js` (store open/close commands)

---

## 🗄️ DATABASE SCHEMA

### Tables

1. **products**
   - `id` (BIGINT PRIMARY KEY)
   - `name` (VARCHAR 255)
   - `description` (TEXT)
   - `price` (DECIMAL 10,2)
   - `stock_quantity` (INTEGER)
   - `category` (VARCHAR 100)
   - `features` (JSON)
   - `media_files` (JSON)
   - `availability_status` (ENUM: available, out_of_stock, discontinued)
   - `created_at`, `updated_at` (TIMESTAMP)

2. **customers**
   - `id` (BIGINT PRIMARY KEY)
   - `telegram_user_id` (BIGINT UNIQUE)
   - `name` (VARCHAR 255)
   - `username` (VARCHAR 100)
   - `purchase_history` (JSON)
   - `behavior_patterns` (JSON)
   - `preferences` (JSON)
   - `registration_timestamp`, `last_activity_timestamp` (TIMESTAMP)

3. **admins**
   - `id` (BIGINT PRIMARY KEY)
   - `telegram_user_id` (BIGINT UNIQUE)
   - `name` (VARCHAR 255)
   - `username` (VARCHAR 100)
   - `permissions` (JSON)
   - `notification_preferences` (JSON)
   - `last_activity_timestamp`, `created_timestamp` (TIMESTAMP)

4. **orders**
   - `id` (BIGINT PRIMARY KEY)
   - `customer_id` (BIGINT FK → customers)
   - `product_id` (BIGINT FK → products)
   - `quantity` (INTEGER)
   - `total_amount` (DECIMAL 10,2)
   - `payment_method` (ENUM: qris, manual_bank_transfer)
   - `payment_status` (ENUM: pending, verified, failed, refunded)
   - `order_status` (ENUM: pending_payment, payment_received, processing, account_delivered, completed, cancelled)
   - `created_timestamp`, `payment_verification_timestamp`, `completed_timestamp` (TIMESTAMP)
   - `account_credentials` (TEXT, encrypted at rest)

5. **payments**
   - `id` (BIGINT PRIMARY KEY)
   - `order_id` (BIGINT FK → orders, UNIQUE)
   - `payment_method` (ENUM: qris, manual_bank_transfer)
   - `amount` (DECIMAL 10,2)
   - `status` (ENUM: pending, verified, failed, refunded)
   - `verification_method` (ENUM: automatic, manual)
   - `payment_proof` (TEXT)
   - `payment_gateway_transaction_id` (VARCHAR 255)
   - `verification_timestamp` (TIMESTAMP)
   - `admin_id` (BIGINT FK → admins)
   - `created_timestamp` (TIMESTAMP)

6. **stock**
   - `id` (BIGINT PRIMARY KEY)
   - `product_id` (BIGINT FK → products, UNIQUE)
   - `current_quantity` (INTEGER)
   - `reserved_quantity` (INTEGER)
   - `last_updated_timestamp` (TIMESTAMP)
   - `last_updated_by` (BIGINT FK → admins)
   - `update_history` (JSON, via migration 005)

7. **notifications**
   - `id` (BIGINT PRIMARY KEY)
   - `recipient_id` (BIGINT)
   - `recipient_type` (ENUM: customer, admin)
   - `type` (ENUM: order_status, payment, admin_alert, system)
   - `content` (TEXT)
   - `rich_media_attachments` (JSON)
   - `order_id` (BIGINT FK → orders)
   - `sent_timestamp`, `read_timestamp` (TIMESTAMP)
   - `read_status` (ENUM: unread, read)

8. **store_config**
   - `key` (VARCHAR 100 PRIMARY KEY)
   - `value` (TEXT)
   - `updated_at` (TIMESTAMP)

9. **audit_logs**
   - `id` (BIGINT PRIMARY KEY)
   - `admin_id` (BIGINT FK → admins)
   - `action_type` (VARCHAR 100)
   - `entity_type` (VARCHAR 100)
   - `entity_id` (BIGINT)
   - `details` (JSON)
   - `ip_address` (VARCHAR 45)
   - `timestamp` (TIMESTAMP)

10. **support_tickets** (via migration 003)
    - Ticket management untuk customer service

11. **chat_messages** (via migration 004)
    - Chat history untuk customer service

12. **interaction_logs** (via migration 006)
    - Log semua user interactions untuk monitoring

### Indexes (via migration 002)

- Performance indexes untuk queries yang sering digunakan

---

## 🔧 KONFIGURASI ENVIRONMENT

### Required Environment Variables

```bash
# Telegram Bot
TELEGRAM_BOT_TOKEN=your_telegram_bot_token

# Database
DB_CLIENT=pg                    # 'pg' untuk PostgreSQL, 'mysql2' untuk MySQL
DB_HOST=localhost
DB_PORT=5432                    # 3306 untuk MySQL
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_DATABASE=your_database_name

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=                 # Optional
REDIS_DB=0

# Payment - QRIS (Duitku)
QRIS_MERCHANT_CODE=your_merchant_code
QRIS_API_KEY=your_api_key
QRIS_CALLBACK_URL=https://your-domain.com/api/payment/callback/qris

# Payment - E-Wallet (Optional)
EWALLET_NAME=GoPay
EWALLET_NUMBER=081234567890
EWALLET_HOLDER=Your Name

# Payment - Bank Transfer (Optional)
BANK_NAME=BCA
BANK_ACCOUNT_NUMBER=1234567890
BANK_ACCOUNT_HOLDER=Your Name

# Security
ENCRYPTION_KEY=your_encryption_key_32_bytes    # Generate dengan: npm run generate:encryption-key
JWT_SECRET=your_jwt_secret                     # Generate dengan: npm run generate:secrets

# Server (untuk webhook)
SERVER_PORT=3000
SERVER_HOST=0.0.0.0

# Environment
NODE_ENV=production                            # development, production, test
```

### Generating Secrets

```bash
# Generate ENCRYPTION_KEY dan JWT_SECRET
npm run generate:secrets

# Atau hanya ENCRYPTION_KEY
npm run generate:encryption-key
```

---

## 📦 INSTALASI & SETUP

### Prerequisites

- **Node.js**: LTS 20.x atau lebih baru
- **PostgreSQL**: 14+ atau **MySQL**: 8.0+
- **Redis**: 7.0+
- **Telegram Bot Token**: Dapatkan dari @BotFather
- **Duitku API credentials**: Untuk QRIS payment

### Installation Steps

1. **Clone Repository & Install Dependencies**

```bash
git clone <repository-url>
cd Storebot
npm install
npm run prepare  # Setup Husky git hooks
```

2. **Setup Environment**

```bash
# Automatic setup (recommended)
npm run setup

# Atau manual setup
cp env.example .env
npm run generate:secrets
# Edit .env dengan konfigurasi Anda
```

3. **Setup Database**

```bash
# Run migrations dan seeds dengan verification
npm run migrate:verify  # Run migrations dan verify schema
npm run seed:verify     # Run seeds dan verify data

# Atau gunakan command combined
npm run setup:db        # Run both migrations dan seeds
```

4. **Start Bot**

```bash
# Start bot (polling mode)
npm start

# Start webhook server (production)
npm run server
```

---

## 🚀 COMMANDS & SCRIPTS

### Bot Commands

**Customer Commands:**

- `/start` - Mulai bot, dapatkan greeting dari FRIDAY
- `/help` - Bantuan dan informasi

**Admin Commands:**

- `/admin` - Menu admin (inline keyboard)
- `/admin product add` - Tambah produk (wizard)
- `/admin product stock update <id> <qty>` - Update stock
- `/admin store open` - Buka toko
- `/admin store close` - Tutup toko
- `/admin help` - Bantuan admin commands

### NPM Scripts

**Development:**

```bash
npm start              # Start bot
npm run restart        # Full restart bot (graceful)
npm run restart:force  # Force restart bot
npm run server         # Start webhook server
```

**Testing:**

```bash
npm test                    # Run all tests
npm run test:unit           # Unit tests only
npm run test:integration    # Integration tests only
npm run test:contract       # Contract tests only
npm run test:watch          # Watch mode
npm run test:all            # All test suites
```

**Database:**

```bash
npm run migrate             # Run migrations
npm run migrate:rollback    # Rollback last migration
npm run migrate:make        # Create new migration
npm run migrate:verify      # Run migrations with verification
npm run seed                # Run seeds
npm run seed:verify         # Run seeds with verification
npm run setup:db            # Run migrations + seeds with verification
```

**Code Quality:**

```bash
npm run lint                # Run ESLint
npm run lint:fix            # Fix ESLint errors
npm run format              # Format code dengan Prettier
npm run format:check        # Check formatting
```

**Utilities:**

```bash
npm run setup               # Automatic setup
npm run backup              # Backup database
npm run recovery            # Recovery from backup
npm run generate:secrets    # Generate ENCRYPTION_KEY dan JWT_SECRET
npm run generate:encryption-key  # Generate ENCRYPTION_KEY only
npm run update:env          # Update environment variables
```

---

## 🧪 TESTING

### Test Structure

```
tests/
├── unit/              # Unit tests (isolated components)
├── integration/       # Integration tests (real Telegram API)
└── contract/          # Contract tests (API contracts)
```

### Test Coverage

- **Unit Tests**: 217 tests passed
- **Integration Tests**: 139 tests passed
- **Contract Tests**: 5 tests passed
- **Total**: 361 tests passed

### Running Tests

```bash
# All tests dengan open handles detection
npm test

# Specific test suites
npm run test:unit
npm run test:integration
npm run test:contract

# Watch mode
npm run test:watch
```

**Note**: Tests menggunakan `--detectOpenHandles` flag untuk mendeteksi open handles yang menyebabkan Jest tidak exit cleanly.

---

## 📊 PERFORMANCE METRICS

### Success Criteria

- **SC-001**: Users receive personalized FRIDAY greetings yang match waktu hari (100%)
- **SC-002**: Menu layouts maintain balanced button distribution (95%)
- **SC-003**: Customers dapat complete payment selection dalam <10 detik
- **SC-004**: Admins dapat update stock dan melihat changes dalam <2 detik
- **SC-005**: Payment verification completes automatically untuk 90% QRIS transactions dalam 5 menit
- **SC-006**: Manual verification fallback activates dalam <30 detik
- **SC-007**: Admin command discovery <3 interactions on average
- **SC-008**: FRIDAY persona consistency (100%)
- **SC-009**: Customers dapat navigate 5 menu levels tanpa tersesat (95%)
- **SC-010**: Premium account credentials delivered securely (100%)

### Performance Targets

- **Menu Loading**: <1 second
- **Role Detection**: <200ms
- **Button Response**: <100ms visual feedback
- **Pagination**: Handle up to 50 items tanpa performance degradation
- **Response Time**: <1 second untuk semua user interactions

---

## 🔒 SECURITY

### Security Features

1. **Encryption at Rest**: AES-256-GCM untuk premium account credentials
2. **Secure Delivery**: Credentials hanya dikirim setelah payment verification
3. **Audit Logging**: Tracking untuk semua credential access dan delivery
4. **HMAC Verification**: Untuk payment webhooks
5. **Admin Authentication**: Telegram User ID whitelist
6. **Rate Limiting**: Untuk webhook endpoints
7. **Input Validation**: Sanitization dan validation untuk semua inputs
8. **Role-Based Access Control**: Permission checking untuk admin commands

### Best Practices

- Environment variables untuk sensitive data
- Database transactions untuk atomic operations
- Redis connection security
- Webhook signature verification
- Error handling tanpa exposing sensitive information

---

## 📝 CONSTITUTION COMPLIANCE

Proyek ini mengikuti **Storebot Constitution v1.1.0**:

- **Article I**: Library-First Principle
- **Article III**: Test-First Imperative
- **Article VIII**: Anti-Abstraction (direct Telegram API)
- **Article IX**: Integration-First Testing (real API, no mocks)
- **Article X**: Code Quality Standards
- **Article XI**: Performance and Efficiency
- **Article XII**: Security First
- **Article XIII**: User Experience

---

## 🌐 WEBHOOK ENDPOINTS

### Payment Webhooks

**POST `/api/payment/callback/qris`**

- QRIS payment callback dari Duitku
- HMAC signature verification
- Automatic payment verification

**GET `/api/payment/callback/status`**

- Check payment status by transaction ID

---

## 🔄 GRACEFUL SHUTDOWN

Bot mendukung graceful shutdown dengan:

- Closing Redis connections
- Closing database connections
- Stopping cron jobs/schedulers
- Proper cleanup untuk mencegah open handles

---

## 📚 DOCUMENTATION

### API Documentation

- **Location**: `docs/api.md`
- **Content**: Comprehensive API documentation untuk semua public library interfaces

### Feature Specifications

- **002-friday-enhancement**: `specs/002-friday-enhancement/spec.md`
- **003-enhanced-keyboard**: `specs/003-enhanced-keyboard/spec.md`

### Code Documentation

- Inline comments dan JSDoc
- Architecture documentation dalam plan.md files
- Research documentation dalam research.md files

---

## 🐛 DEBUGGING & TROUBLESHOOTING

### Common Issues

1. **Tests Stuck / Open Handles**
   - Solution: Gunakan `--detectOpenHandles` flag
   - Ensure proper cleanup di `afterAll` hooks
   - Check Redis connections di test environment

2. **Redis Connection Errors**
   - Check Redis server running
   - Verify REDIS_HOST, REDIS_PORT di .env
   - Check Redis password (jika ada)

3. **Database Connection Errors**
   - Verify database credentials di .env
   - Check database server running
   - Verify database exists

4. **Payment Webhook Errors**
   - Verify QRIS_CALLBACK_URL accessible
   - Check HMAC signature verification
   - Verify Duitku credentials

### Logs

- Bot logs: Check console output atau log files
- Database logs: Check database server logs
- Redis logs: Check Redis server logs

---

## 🚀 DEPLOYMENT

### Production Checklist

- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] Redis server running
- [ ] Webhook URL configured
- [ ] SSL certificate untuk webhook endpoint
- [ ] Rate limiting configured
- [ ] Monitoring setup
- [ ] Backup strategy in place

### Deployment Options

1. **Polling Mode** (Development)

   ```bash
   npm start
   ```

2. **Webhook Mode** (Production)
   ```bash
   npm run server
   ```

---

## 📞 SUPPORT & CONTRIBUTING

### Project Structure

```
src/
├── lib/              # Modular libraries
│   ├── product/      # Product Management
│   ├── order/        # Order Processing
│   ├── payment/      # Payment Processing
│   ├── admin/        # Admin Panel
│   ├── friday/       # FRIDAY Persona
│   ├── ui/           # UI Components
│   ├── security/     # Security Features
│   ├── customer-service/  # Customer Service
│   ├── monitoring/   # Monitoring & Logging
│   └── shared/       # Shared Utilities
├── models/           # Data Models
├── bot.js            # Main Bot Entry Point
└── server.js         # Webhook Server
```

---

## 📜 LICENSE

ISC

---

## 📅 VERSION HISTORY

- **v1.0.0** (2025-11-21): Initial release dengan semua fitur utama

---

**Dokumen ini di-generate pada**: 2025-11-21  
**Status**: ✅ Complete  
**Last Updated**: 2025-11-21
