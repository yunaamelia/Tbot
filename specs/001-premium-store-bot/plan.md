# Implementation Plan: Premium Account Store Telegram Bot

**Branch**: `001-premium-store-bot` | **Date**: 2025-11-19 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-premium-store-bot/spec.md`

## Summary

Telegram bot assistant for premium account store enabling customers to browse, purchase, and receive premium digital products (GitHub Copilot, GitHub Student, cloud panel accounts) through a rich media interface. The bot integrates with QRIS payment gateway for automated payments with manual bank transfer fallback, provides real-time order tracking, and includes admin controls for stock management and store operations. All interactions use Indonesian language with security-first approach for credential delivery.

## Technical Context

**Language/Version**: Node.js LTS 20.x+ (see research.md for rationale)  
**Primary Dependencies**: Telegraf.js (Telegram bot), Knex.js (database abstraction), Duitku SDK (QRIS payment), Express.js (webhook server), ioredis (Redis client), Jest (testing)  
**Storage**: PostgreSQL (primary) with MySQL support via Knex.js abstraction layer  
**Testing**: Jest for unit and integration tests, all integration tests use real Telegram Bot API (Article IX)  
**Target Platform**: Linux server (production), local development environment  
**Project Type**: single (Telegram bot backend service)  
**Performance Goals**: Handle 1000 concurrent customer interactions, process QRIS payments within 30 seconds, deliver notifications within 10 seconds of status change  
**Constraints**: Indonesian language only, real Telegram API for testing (no mocks), maximum 4 main modules per Article VII (6 modules proposed - requires justification), direct Telegram Bot API usage (minimal wrappers), encrypted credential storage and delivery  
**Scale/Scope**: 10,000+ customers, 1000+ concurrent interactions, multiple premium account product types, real-time stock management, automated and manual payment processing

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Article I: Library-First Principle ✅
- **Status**: PASS
- **Rationale**: Architecture designed with modular libraries (Product Management, Order Processing, Payment, Customer Service, Admin Panel, Security). Each module will be self-contained and independently testable.

### Article III: Test-First Imperative ✅
- **Status**: PASS
- **Rationale**: Comprehensive test scenarios defined in spec.md for all 6 user stories. TDD cycle will be enforced: tests written → approved → fail → implement → refactor.

### Article VII: Simplicity ⚠️
- **Status**: VIOLATION - Requires justification
- **Issue**: 6 modules proposed (Product Management, Order Processing, Payment, Customer Service, Admin Panel, Security) exceeds 4-module limit
- **Action**: Documented in Complexity Tracking section below with justification

### Article VIII: Anti-Abstraction ✅
- **Status**: PASS
- **Rationale**: Will use Telegram Bot API directly with minimal wrapper library (only for essential HTTP/WebSocket handling). Database abstraction layer required for MySQL/PostgreSQL support (per constitution constraint).

### Article IX: Integration-First Testing ✅
- **Status**: PASS
- **Rationale**: All tests will use real Telegram Bot API endpoints. Integration tests mandatory for all bot interactions. Unit tests supplement but do not replace integration tests.

### Additional Constraints Compliance ✅
- **Indonesian Language**: All user-facing content in Bahasa Indonesia
- **Database Integration**: PostgreSQL primary with MySQL support via abstraction
- **QRIS Payment**: Integration with automatic verification + manual fallback
- **Rich Media UI/UX**: Inline keyboards, media groups, interactive elements
- **Security-First**: Encrypted credentials, access controls, audit logging

**GATE RESULT**: ⚠️ **CONDITIONAL PASS** - Article VII violation documented and justified in Complexity Tracking. Proceeding to Phase 0 research.

## Project Structure

### Documentation (this feature)

```text
specs/001-premium-store-bot/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── lib/
│   ├── product/         # Product Management Module (Article I library)
│   │   ├── product-service.js
│   │   ├── stock-manager.js
│   │   └── product-repository.js
│   ├── order/           # Order Processing Module (Article I library)
│   │   ├── order-service.js
│   │   ├── checkout-handler.js
│   │   └── order-repository.js
│   ├── payment/         # Payment Module (Article I library)
│   │   ├── payment-service.js
│   │   ├── qris-handler.js
│   │   ├── manual-verification.js
│   │   └── payment-repository.js
│   ├── customer-service/ # Customer Service Module (Article I library)
│   │   ├── faq-handler.js
│   │   ├── chat-handler.js
│   │   └── ticket-service.js
│   ├── admin/           # Admin Panel Module (Article I library)
│   │   ├── admin-commands.js
│   │   ├── notification-service.js
│   │   └── reporting-service.js
│   ├── security/        # Security Module (Article I library)
│   │   ├── encryption-service.js
│   │   ├── credential-delivery.js
│   │   ├── access-control.js
│   │   └── audit-logger.js
│   ├── database/        # Database abstraction layer
│   │   ├── db-connection.js
│   │   ├── query-builder.js
│   │   └── migrations/
│   ├── telegram/        # Direct Telegram Bot API integration (Article VIII)
│   │   ├── api-client.js
│   │   ├── webhook-handler.js
│   │   └── message-builder.js
│   └── shared/          # Shared utilities
│       ├── i18n.js      # Indonesian language handler
│       ├── logger.js
│       └── config.js
├── models/              # Data models (shared across libraries)
│   ├── product.js
│   ├── order.js
│   ├── customer.js
│   ├── payment.js
│   ├── admin.js
│   └── notification.js
├── bot.js               # Main bot entry point
└── server.js            # Webhook server

tests/
├── contract/            # API contract tests
├── integration/          # Real Telegram API integration tests (Article IX)
│   ├── product-browsing.test.js
│   ├── checkout-flow.test.js
│   ├── payment-verification.test.js
│   └── admin-commands.test.js
└── unit/                # Unit tests (supplement integration tests)
    ├── lib/
    └── models/

migrations/              # Database migrations
├── 001_initial_schema.sql
└── 002_add_indexes.sql

scripts/
├── backup.js           # Automatic backup system
└── recovery.js         # Recovery system
```

**Structure Decision**: Single project structure with modular libraries in `src/lib/` directory. Each module (Product, Order, Payment, Customer Service, Admin, Security) is a self-contained library per Article I. Main bot logic in `bot.js` orchestrates library interactions. Database abstraction in `src/lib/database/` supports both MySQL and PostgreSQL. Direct Telegram API integration in `src/lib/telegram/` per Article VIII. Tests organized by type with integration tests using real Telegram API per Article IX.

## Constitution Check (Post-Phase 1 Design)

*Re-evaluated after Phase 1 design completion*

### Article I: Library-First Principle ✅
- **Status**: PASS
- **Rationale**: All 6 modules designed as independent libraries in `src/lib/` with clear boundaries. Each library has its own service layer, repository pattern, and can be tested independently.

### Article III: Test-First Imperative ✅
- **Status**: PASS
- **Rationale**: Test scenarios defined in quickstart.md for all user stories. Integration test structure in place using real Telegram API.

### Article VII: Simplicity ⚠️
- **Status**: VIOLATION - Justified and documented
- **Issue**: 6 modules exceed 4-module limit
- **Post-Design Assessment**: After Phase 1 design, the 6-module structure is confirmed necessary. Each module has distinct data models, business logic, and integration requirements that cannot be consolidated without violating Article I.

### Article VIII: Anti-Abstraction ✅
- **Status**: PASS
- **Rationale**: `src/lib/telegram/` uses Telegraf.js (minimal wrapper) with direct API client access. Database abstraction via Knex.js is required per constitution constraint for dual database support.

### Article IX: Integration-First Testing ✅
- **Status**: PASS
- **Rationale**: Integration test structure defined in quickstart.md. All tests use real Telegram Bot API. Test files organized in `tests/integration/` with real API calls.

**GATE RESULT**: ✅ **PASS** - All principles validated. Article VII violation justified and necessary for proper architecture.

---

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| 6 modules instead of 4 (Article VII) | The feature requires distinct, independently testable libraries for: (1) Product Management - stock, pricing, categories with real-time updates, (2) Order Processing - cart, checkout, status tracking with complex state machine, (3) Payment - QRIS automatic + manual verification with different workflows, (4) Customer Service - FAQ system + live chat requiring separate conversation management, (5) Admin Panel - commands, notifications, reporting with different access patterns, (6) Security - encryption, credential delivery, access control, audit logging with specialized security requirements. Each module has distinct responsibilities, data models, and integration points that would create tight coupling if consolidated. | Consolidating modules (e.g., merging Admin into Product/Order, or Security into other modules) would violate Article I (Library-First) by creating organizational-only libraries without clear purpose. Security module separation is critical for audit and compliance - mixing security logic with business logic would reduce maintainability and increase risk. Customer Service requires separate conversation state management that doesn't fit in other modules. The 6 modules represent core business domains that must remain independent for proper testing, deployment, and maintenance. |
