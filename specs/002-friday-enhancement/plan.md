# Implementation Plan: FRIDAY Bot Enhancement

**Branch**: `002-friday-enhancement` | **Date**: 2025-11-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-friday-enhancement/spec.md`

## Summary

This plan implements the FRIDAY persona enhancement for the Telegram bot, adding time-based personalized greetings, responsive inline keyboard layouts with auto-balancing, dynamic payment method configuration, hierarchical admin commands, and enhanced UI/UX patterns. The implementation follows the existing modular library architecture and integrates seamlessly with current payment, admin, and product management systems.

## Technical Context

**Language/Version**: Node.js 20.0.0+ (ES2022)  
**Primary Dependencies**:

- Telegraf 4.15.0 (Telegram Bot API framework)
- Express 4.18.2 (Webhook server)
- Knex.js 3.0.1 (Database query builder with PostgreSQL/MySQL support)
- ioredis 5.3.2 (Redis client for session management and caching)
- pg 8.11.3 (PostgreSQL driver)
- mysql2 3.6.5 (MySQL driver)

**Storage**:

- PostgreSQL 14+ (primary) or MySQL 8.0+ (supported via Knex abstraction)
- Redis 7.0+ (session management, caching, real-time updates)

**Testing**: Jest 29.7.0 (unit, integration, contract tests with real Telegram API)

**Target Platform**: Linux server (Node.js runtime)

**Project Type**: Single project (Telegram bot with webhook server)

**Performance Goals**:

- Bot response time: < 2 seconds for menu operations
- Stock update reflection: < 2 seconds in customer catalog
- Payment selection: < 10 seconds completion time
- Support 1000+ concurrent interactions

**Constraints**:

- Must maintain backward compatibility with existing bot functionality
- Must use existing database schema (extend if needed, don't break)
- Must comply with Telegram Bot API rate limits
- Must support both PostgreSQL and MySQL via Knex abstraction
- Indonesian language interface only (Article XIII)

**Scale/Scope**:

- 6 user stories (P1: 3, P2: 3)
- 24 functional requirements
- 5 new library modules (FRIDAY persona, responsive UI, payment config, admin hierarchy, stock real-time)
- Extends existing 10+ library modules

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### Article I: Library-First Principle ✅

- **Status**: COMPLIANT
- **Rationale**: All new features will be implemented as modular libraries:
  - `src/lib/friday/` - FRIDAY persona and greeting system
  - `src/lib/ui/` - Responsive keyboard layout engine
  - `src/lib/payment/config/` - Dynamic payment configuration
  - `src/lib/admin/hierarchy/` - Hierarchical command system
  - `src/lib/product/realtime/` - Real-time stock update notifications
- **Existing modules**: Current codebase already follows library-first architecture with 10+ modules

### Article III: Test-First Imperative ✅

- **Status**: COMPLIANT
- **Rationale**: All features have acceptance scenarios defined in spec. Tests will be written before implementation following TDD cycle:
  - Integration tests for FRIDAY greetings (time-based)
  - Integration tests for responsive keyboard layouts
  - Integration tests for dynamic payment method display
  - Integration tests for hierarchical admin commands
  - Integration tests for real-time stock updates

### Article VII: Simplicity ⚠️

- **Status**: JUSTIFIED VIOLATION
- **Rationale**: Adding 5 new library modules exceeds the 4-module limit. However:
  - Each module has a clear, specific purpose (not organizational-only)
  - Modules are independently testable and deployable
  - Required by feature specification (FR-001 through FR-024)
  - Cannot be consolidated without losing modularity benefits
- **Documentation**: See Complexity Tracking section below

### Article VIII: Anti-Abstraction ✅

- **Status**: COMPLIANT
- **Rationale**:
  - Using Telegraf directly (no wrapper libraries)
  - Using Telegram Bot API inline keyboard methods directly
  - Using Express for webhooks (essential HTTP server, not abstraction)
  - Using Knex.js (database abstraction required for PostgreSQL/MySQL support per constitution)
  - Using ioredis directly (essential Redis client, not abstraction)

### Article IX: Integration-First Testing ✅

- **Status**: COMPLIANT
- **Rationale**: All tests will use real Telegram Bot API:
  - Time-based greeting tests will verify actual Telegram message delivery
  - Keyboard layout tests will verify actual inline keyboard rendering
  - Payment method tests will verify actual button display
  - Admin command tests will verify actual command execution
  - Stock update tests will verify real-time catalog changes

### Article X: Code Quality Standards ✅

- **Status**: COMPLIANT
- **Rationale**:
  - Comprehensive error handling for all new modules
  - Structured logging using existing logger infrastructure
  - Unit tests for core logic (keyboard balancing algorithm, time-based greeting logic)
  - Integration tests for Telegram API interactions
  - Public APIs documented in code comments

### Article XI: Performance and Efficiency ✅

- **Status**: COMPLIANT
- **Rationale**:
  - Keyboard layout algorithm optimized for O(n) complexity
  - Redis caching for payment method configuration (avoid repeated env reads)
  - Database connection pooling already configured (Knex)
  - Async operations for all bot interactions
  - Performance goals defined in Technical Context

### Article XII: Security First ✅

- **Status**: COMPLIANT
- **Rationale**:
  - Payment credentials remain in environment variables (not exposed)
  - Admin authentication enforced for hierarchical commands
  - Input validation for all admin commands
  - HMAC verification for payment webhooks (existing)
  - Secure credential delivery (existing encryption service)

### Article XIII: User Experience ✅

- **Status**: COMPLIANT
- **Rationale**:
  - FRIDAY persona provides engaging, consistent experience
  - Responsive layouts ensure usability across devices
  - Fixed navigation (Home/Back) prevents user confusion
  - Indonesian language interface maintained
  - Rich media UI/UX patterns preserved

**GATE RESULT**: ✅ PASS (with justified Article VII violation)

## Project Structure

### Documentation (this feature)

```text
specs/002-friday-enhancement/
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
│   ├── friday/                    # NEW: FRIDAY persona module
│   │   ├── persona-service.js     # Time-based greeting logic
│   │   ├── greeting-templates.js  # Greeting message templates
│   │   └── persona-formatter.js   # FRIDAY message formatting
│   ├── ui/                        # NEW: Responsive UI module
│   │   ├── keyboard-builder.js    # Responsive keyboard layout engine
│   │   ├── layout-balancer.js    # Auto-balance algorithm
│   │   └── navigation-handler.js # Home/Back button management
│   ├── payment/
│   │   ├── config/                # NEW: Payment configuration module
│   │   │   ├── payment-config.js  # Dynamic payment method loader
│   │   │   └── method-validator.js # Payment method validation
│   │   ├── qris-handler.js       # Existing
│   │   └── manual-verification.js # Existing
│   ├── admin/
│   │   ├── hierarchy/            # NEW: Hierarchical command module
│   │   │   ├── command-router.js  # Command hierarchy router
│   │   │   ├── command-registry.js # Command registration system
│   │   │   └── command-help.js   # Command discovery and help
│   │   ├── admin-commands.js     # Existing (extend)
│   │   └── admin-interface.js    # Existing
│   ├── product/
│   │   ├── realtime/              # NEW: Real-time stock module
│   │   │   ├── stock-notifier.js  # Real-time stock update notifications
│   │   │   └── catalog-sync.js    # Catalog synchronization
│   │   ├── stock-manager.js       # Existing (extend)
│   │   └── product-service.js     # Existing
│   ├── telegram/
│   │   └── api-client.js          # Existing
│   ├── shared/
│   │   └── [existing shared modules]
│   └── [other existing modules]
├── models/
│   └── [existing models, extend if needed]
└── bot.js                          # Main entry (extend for FRIDAY)

tests/
├── integration/
│   ├── friday-greetings.test.js   # NEW: FRIDAY greeting tests
│   ├── responsive-keyboard.test.js # NEW: Keyboard layout tests
│   ├── payment-config.test.js     # NEW: Payment method tests
│   ├── admin-hierarchy.test.js    # NEW: Command hierarchy tests
│   └── stock-realtime.test.js     # NEW: Real-time stock tests
├── unit/
│   ├── friday/
│   │   └── persona-service.test.js
│   ├── ui/
│   │   └── layout-balancer.test.js
│   └── [other unit tests]
└── [existing test structure]
```

**Structure Decision**: Single project structure maintained. New modules added to `src/lib/` following existing patterns. Tests organized by feature in `tests/integration/` and `tests/unit/`.

## Complexity Tracking

| Violation                                                  | Why Needed                                                                                                                                                                                                                           | Simpler Alternative Rejected Because                                                                                                                                                                                                                                                     |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 5 new library modules (exceeds Article VII 4-module limit) | Feature specification requires 5 distinct functional areas: FRIDAY persona, responsive UI, payment config, admin hierarchy, stock real-time. Each has independent responsibilities and must be independently testable per Article I. | Consolidating into fewer modules would violate Article I (library-first with clear purpose) and create organizational-only modules. Each module serves a specific, testable purpose: persona management, UI layout, payment configuration, command routing, and real-time notifications. |
