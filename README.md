# Premium Store Bot

Telegram bot assistant for premium account store selling GitHub Copilot, GitHub Student, and cloud panel accounts.

## Features

- **FRIDAY AI Persona**: Personalized time-based greetings with Iron Man-style AI assistant persona
- **Responsive UI**: Auto-balancing inline keyboard layouts with pagination support
- **Dynamic Payment Methods**: Configure payment methods (QRIS, E-Wallet, Bank Transfer) via environment variables
- **Hierarchical Admin Commands**: Structured admin command system with permission-based access control
- **Real-Time Stock Management**: Admin stock updates reflect immediately in customer catalog via Redis pub/sub
- **Hybrid Payment Processing**: Automatic QRIS verification with manual fallback for reliability
- Product browsing with card-style display
- Inline keyboard navigation
- QRIS payment integration
- Real-time order tracking
- Admin stock management
- Rich media UI/UX

## Prerequisites

- Node.js LTS 20.x or later
- PostgreSQL 14+ or MySQL 8.0+
- Redis 7.0+
- Telegram Bot Token
- Duitku API credentials (for QRIS payment)

## Installation

```bash
# Install dependencies
npm install

# Setup Husky git hooks
npm run prepare

# Automatic setup (recommended for first-time setup)
# This will create .env from env.example and generate secrets automatically
npm run setup

# Or manual setup:
# 1. Copy environment file
cp env.example .env

# 2. Generate secure ENCRYPTION_KEY and JWT_SECRET
npm run generate:secrets
# Or generate only ENCRYPTION_KEY:
# npm run generate:encryption-key

# 3. Edit .env with your configuration (TELEGRAM_BOT_TOKEN, database, etc.)

# 4. Setup database
npm run migrate
npm run seed

# Or use verification scripts (recommended)
npm run migrate:verify  # Run migrations and verify schema
npm run seed:verify     # Run seeds and verify data
npm run setup:db        # Run both migrations and seeds with verification
```

## Development

```bash
# Start bot
npm start

# Start webhook server
npm run server

# Run tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:contract

# Linting and formatting
npm run lint
npm run lint:fix
npm run format
```

## Pre-commit Hooks

This project uses Husky for Git hooks. Before each commit, the following checks run automatically:

1. **ESLint** - Code linting
2. **Prettier** - Code formatting check
3. **Comprehensive Tests** - All unit, integration, and contract tests

**⚠️ Strict Mode**: All checks MUST pass before commit is allowed. Commits are blocked until all tests pass. Fix errors before attempting to commit.

## Project Structure

```
src/
├── lib/              # Modular libraries (Article I)
│   ├── product/      # Product Management Module
│   │   └── realtime/ # Real-time stock synchronization
│   ├── order/        # Order Processing Module
│   ├── payment/      # Payment Module
│   │   └── config/   # Dynamic payment method configuration
│   ├── admin/        # Admin Panel Module
│   │   └── hierarchy/# Hierarchical command system
│   ├── friday/       # FRIDAY AI Persona Module
│   ├── ui/           # UI Components (responsive keyboards)
│   ├── security/     # Security Module
│   └── shared/       # Shared utilities
├── models/           # Data models
└── bot.js            # Main bot entry point

tests/
├── unit/             # Unit tests
├── integration/      # Integration tests (real Telegram API)
└── contract/         # Contract tests
```

## New Features (002-friday-enhancement)

### FRIDAY Persona

Time-based personalized greetings with Iron Man-style AI assistant persona:

- **Morning** (6:00-11:59): "Selamat pagi! Saya FRIDAY, asisten AI Anda..."
- **Afternoon** (12:00-17:59): "Selamat siang! Saya FRIDAY, asisten AI Anda..."
- **Evening** (18:00-23:59): "Selamat malam! Saya FRIDAY, asisten AI Anda..."
- **Night** (0:00-5:59): "Halo! Saya FRIDAY, asisten AI Anda..."

### Responsive UI

Auto-balancing inline keyboards with smart layout:

- **Auto-balancing**: Items distributed evenly across rows
- **Pagination**: Automatic pagination for menus with >9 items
- **Navigation**: Fixed Home/Back buttons on all screens
- **Performance**: O(n) time complexity layout algorithm

### Dynamic Payment Configuration

Configure payment methods via environment variables:

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

Methods are cached in Redis for optimal performance (reduces env reads).

### Hierarchical Admin Commands

Structured admin command system:

```bash
# Top-level menu
/admin

# Hierarchical commands
/admin product add <name> <price>
/admin product stock update <product_id> <quantity>
/admin store open
/admin store close

# Help system with suggestions
/admin help
/admin product help
```

All commands support permission-based access control.

### Real-Time Stock Management

Stock updates reflect immediately in customer catalog:

- **Redis Pub/Sub**: Real-time notifications via `stock:updated` channel
- **Automatic Sync**: Catalog automatically syncs on stock changes
- **Cache Invalidation**: Product cache invalidated for immediate updates
- **Audit Tracking**: `last_updated_by` and `update_history` for all changes
- **Race Condition Prevention**: Database transactions ensure data consistency

### Hybrid Payment Processing

Automatic QRIS verification with manual fallback:

- **Automatic Verification**: Attempts automatic verification first
- **5-Minute Timeout**: Falls back to manual if timeout
- **Manual Fallback**: Seamless transition to admin review
- **Customer Notifications**: Real-time payment status updates

## Constitution Compliance

This project follows the Storebot Constitution v1.1.0:

- **Article I**: Library-First Principle
- **Article III**: Test-First Imperative
- **Article VIII**: Anti-Abstraction (direct Telegram API)
- **Article IX**: Integration-First Testing (real API, no mocks)
- **Article X**: Code Quality Standards
- **Article XI**: Performance and Efficiency
- **Article XII**: Security First
- **Article XIII**: User Experience

## License

ISC
