# Premium Store Bot

Telegram bot assistant for premium account store selling GitHub Copilot, GitHub Student, and cloud panel accounts.

## Features

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

# Configure environment
cp .env.example .env
# Edit .env with your configuration

# Generate secure ENCRYPTION_KEY (required for credential encryption)
node scripts/generate-encryption-key.js

# Setup database
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
│   ├── order/        # Order Processing Module
│   ├── payment/      # Payment Module
│   ├── admin/        # Admin Panel Module
│   ├── security/     # Security Module
│   └── shared/       # Shared utilities
├── models/           # Data models
└── bot.js            # Main bot entry point

tests/
├── unit/             # Unit tests
├── integration/      # Integration tests (real Telegram API)
└── contract/         # Contract tests
```

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
