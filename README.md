# Premium Account Store Telegram Bot

Telegram bot assistant for premium account store selling GitHub Copilot, GitHub Student, cloud panel accounts, and similar premium digital products.

## Features

- **Product Browsing**: Interactive card-style product display with inline keyboard navigation
- **Product Details**: Comprehensive product information with media groups
- **Checkout Process**: Step-by-step checkout with QRIS automatic payment or manual bank transfer
- **Real-Time Notifications**: Order status updates with rich media messages
- **Admin Controls**: Stock management and store open/close commands
- **Admin Notifications**: Real-time alerts for orders and payments
- **Security-First**: Encrypted credential storage and secure delivery
- **Customer Service**: FAQ system and live admin chat
- **Personalization**: Behavior-based product recommendations

## Tech Stack

- **Runtime**: Node.js LTS 20.x+
- **Bot Framework**: Telegraf.js (minimal wrapper for Telegram Bot API)
- **Database**: PostgreSQL (primary) with MySQL support via Knex.js
- **Cache/Session**: Redis (ioredis)
- **Payment**: Duitku QRIS payment gateway
- **Web Server**: Express.js for webhook handling
- **Testing**: Jest with real Telegram Bot API integration tests

## Prerequisites

- Node.js 20.x or later
- PostgreSQL 12+ or MySQL 8+
- Redis 6+
- Telegram Bot Token (from [@BotFather](https://t.me/BotFather))
- Duitku merchant account (for QRIS payments)

## Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd TBot
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Setup database**:
   ```bash
   # Run migrations
   npm run migrate
   ```

5. **Start the bot**:
   ```bash
   # Development mode
   npm start

   # Or start webhook server
   npm run server
   ```

## Configuration

See `.env.example` for all required environment variables:

- `TELEGRAM_BOT_TOKEN`: Your Telegram bot token
- `DB_TYPE`: Database type (`postgresql` or `mysql`)
- `DB_HOST`, `DB_PORT`, `DB_NAME`: Database connection details
- `REDIS_HOST`, `REDIS_PORT`: Redis connection details
- `DUITKU_MERCHANT_CODE`, `DUITKU_API_KEY`: Duitku payment gateway credentials
- `ENCRYPTION_KEY`: 32+ character key for credential encryption
- `ADMIN_TELEGRAM_IDS`: Comma-separated list of admin Telegram user IDs

## Project Structure

```
src/
├── lib/              # Modular libraries (Article I)
│   ├── product/     # Product Management
│   ├── order/        # Order Processing
│   ├── payment/      # Payment Processing
│   ├── admin/        # Admin Panel
│   ├── security/     # Security & Encryption
│   ├── database/     # Database abstraction
│   ├── telegram/     # Telegram API integration
│   └── shared/       # Shared utilities
├── models/           # Data models
├── bot.js            # Main bot entry point
└── server.js         # Webhook server

tests/
├── integration/      # Real Telegram API tests (Article IX)
├── unit/             # Unit tests
└── contract/         # API contract tests

migrations/            # Database migrations
scripts/               # Backup and recovery scripts
```

## Development

### Running Tests

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests (uses real Telegram API)
npm run test:integration

# Contract tests
npm run test:contract
```

### Code Quality

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

### Database Migrations

```bash
# Run migrations
npm run migrate

# Rollback last migration
npm run migrate:rollback

# Create new migration
npm run migrate:make migration_name
```

## Constitution Compliance

This project follows the Storebot Constitution principles:

- **Article I**: Library-First - All functionality in modular libraries
- **Article III**: Test-First - Tests written before implementation
- **Article VII**: Simplicity - 6 modules (justified and documented)
- **Article VIII**: Anti-Abstraction - Direct Telegram Bot API usage
- **Article IX**: Integration-First Testing - Real Telegram API for all integration tests

## Language

All user-facing content is in **Indonesian (Bahasa Indonesia)**.

## Security

- Premium account credentials are encrypted at rest (AES-256) and in transit
- HMAC verification for payment webhook callbacks
- Admin authentication via Telegram user ID whitelist
- Audit logging for all credential access operations

## License

ISC
