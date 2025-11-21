# Implementation Plan: Premium Store Bot Inline Keyboard System Refactor

**Branch**: `005-keyboard-refactor` | **Date**: 2025-01-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-keyboard-refactor/spec.md`

## Summary

This plan refactors the Premium Store Bot inline keyboard system to provide a comprehensive, high-performance keyboard experience with FRIDAY AI persona integration. The refactor includes: (1) Complete UI/UX overhaul with FRIDAY-themed styling using emoji-based color indicators, (2) Advanced 3-column grid layout engine with intelligent auto-balancing, (3) Enhanced navigation system with breadcrumbs and 20-level history tracking, (4) Refactored role-based access control with granular permissions, (5) Performance optimizations targeting <1 second response times with Redis caching, and (6) Real-time stock integration with push-based keyboard updates. The implementation maintains backward compatibility while delivering 40% navigation time reduction and 95% user satisfaction targets.

## Technical Context

**Language/Version**: Node.js 20+ with ES2022 features  
**Primary Dependencies**: Telegraf 4.15+, Express.js 4.18+, Knex.js 3.0+, ioredis 5.3+  
**Storage**: PostgreSQL/MySQL via Knex.js, Redis 7.0+ for caching and state management  
**Testing**: Jest 29.7+ with comprehensive unit, integration, and contract tests  
**Target Platform**: Linux server (Node.js runtime)  
**Project Type**: single (Telegram bot application)  
**Performance Goals**: <1 second keyboard response time (95th percentile), <200ms cache hit response, support 100 concurrent users without degradation  
**Constraints**: Telegram Bot API limits (64 bytes per button, 100 buttons max per keyboard), backward compatibility with existing flows, Indonesian language only  
**Scale/Scope**: 100+ concurrent users, 1000+ menu items with pagination, 20-level navigation history, real-time stock updates for all active keyboards

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### Article I: Library-First Principle ✅

- **Status**: COMPLIANT
- **Rationale**:
  - Keyboard engine, layout manager, navigation engine, and persona integration are implemented as modular, self-contained libraries
  - Each library has clear, specific purpose (keyboard generation, layout calculation, navigation management, persona styling)
  - Libraries are independently testable and documented
  - No organizational-only libraries; all serve functional purposes

### Article III: Test-First Imperative ✅

- **Status**: COMPLIANT
- **Rationale**:
  - Comprehensive test scenarios will be written before implementation (TDD cycle enforced)
  - Tests organized by feature modules (keyboard-engine, layout-manager, navigation-engine, etc.)
  - Integration tests required for Telegram API interactions (real API, not mocks)
  - Unit tests for core algorithms (layout balancing, pagination, caching)
  - Contract tests for keyboard generation APIs
  - Test isolation: each test creates own data, cleanup in afterEach/afterAll

### Article VII: Simplicity ⚠️

- **Status**: VIOLATION (justified)
- **Rationale**:
  - Refactor introduces 6 new modules: keyboard-engine, layout-manager, keyboard-persona, keyboard-access, navigation-engine, performance-optimizer
  - These modules are required for comprehensive refactor scope (UI/UX, layout, persona, access control, navigation, performance)
  - Simpler alternative (extending existing keyboard-builder.js) rejected because:
    - Single file would exceed 2000+ lines, violating maintainability
    - Multiple concerns (layout, persona, navigation, performance) need separation
    - Modular approach enables independent testing and future enhancements
- **Justification**: Documented in Complexity Tracking below

### Article VIII: Anti-Abstraction ✅

- **Status**: COMPLIANT
- **Rationale**:
  - Uses Telegraf framework directly (well-established, minimal abstraction)
  - Direct Telegram Bot API usage via Telegraf (no unnecessary wrappers)
  - Redis client (ioredis) is essential infrastructure library
  - Knex.js for database abstraction (required for MySQL/PostgreSQL support)
  - No custom abstraction layers; direct API interactions

### Article IX: Integration-First Testing ✅

- **Status**: COMPLIANT
- **Rationale**:
  - Integration tests use real Telegram Bot API (not mocks)
  - Keyboard generation tests interact with actual Telegram endpoints
  - Real-time stock update tests use actual Redis pub/sub
  - Webhook tests use real Express server
  - Unit tests supplement but don't replace integration tests

### Article X: Code Quality Standards ✅

- **Status**: COMPLIANT
- **Rationale**:
  - ESLint configured with Node.js and security plugins
  - Prettier for code formatting (pre-commit hooks)
  - Naming conventions: PascalCase classes, camelCase methods, UPPER_SNAKE_CASE constants
  - Comprehensive error handling for all async operations
  - Structured logging for debugging and monitoring
  - Public APIs documented (JSDoc comments)

### Article XI: Performance and Efficiency ✅

- **Status**: COMPLIANT
- **Rationale**:
  - Performance goals: <1 second response (95th percentile), <200ms cache hits
  - Redis caching with TTL for keyboard layouts (50% reduction target)
  - Database queries optimized with proper indexing
  - Connection pooling for database and Redis
  - Algorithm complexity documented (O(n) for layout algorithms)
  - Memory footprint reduction target: 30% compared to current
  - Async operations for all I/O (non-blocking)

### Article XII: Security First ✅

- **Status**: COMPLIANT
- **Rationale**:
  - Role-based access control with fail-safe defaults (regular user on failure)
  - Audit trail logging for admin actions
  - Input validation for all keyboard inputs
  - Rate limiting considerations for keyboard generation
  - Secure credential storage (no hard-coded secrets)
  - HTTPS/TLS for all external communications

### Article XIII: User Experience ✅

- **Status**: COMPLIANT
- **Rationale**:
  - FRIDAY persona consistency across all keyboards
  - Responsive 3-column grid layouts
  - Breadcrumb navigation for deep menus
  - Contextual help and guidance
  - Indonesian language for all text
  - Mobile-responsive button sizing
  - Clear error messages (user-friendly, in Indonesian)
  - Consistent navigation patterns (Home/Back/Help)

### Article XIV: Technical Decision Governance ✅

- **Status**: COMPLIANT
- **Rationale**:
  - All technical decisions align with constitutional principles
  - Library-first: Modular, testable libraries
  - Test-first: Tests before implementation
  - Performance: Redis caching, optimized algorithms
  - Security: Role-based access, audit trails
  - UX: FRIDAY persona, responsive layouts
  - Documentation: All decisions documented in plan

**GATE RESULT**: ✅ PASS (with justified Article VII violation - 6 new modules required for comprehensive refactor)

## Project Structure

### Documentation (this feature)

```text
specs/005-keyboard-refactor/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── keyboard-engine-api.md
│   ├── layout-manager-api.md
│   ├── navigation-engine-api.md
│   ├── keyboard-persona-api.md
│   └── keyboard-access-api.md
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── lib/
│   ├── ui/                              # UI Components Module (REFACTOR)
│   │   ├── keyboard-engine.js          # NEW: Core keyboard generation engine
│   │   ├── keyboard-builder.js          # REFACTOR: Extend existing with new engine
│   │   ├── layout-manager.js           # NEW: Advanced 3-column grid layout system
│   │   ├── layout-balancer.js          # EXTEND: Enhance existing balancer
│   │   ├── navigation-engine.js        # NEW: Breadcrumb and history management
│   │   ├── navigation-handler.js       # EXTEND: Enhance existing handler
│   │   ├── performance-optimizer.js    # NEW: Caching and lazy loading
│   │   └── button-state-manager.js     # EXTEND: Enhance existing state manager
│   ├── friday/                          # FRIDAY Persona Module (EXTEND)
│   │   ├── persona-service.js          # Existing (extend)
│   │   ├── greeting-templates.js       # Existing
│   │   ├── persona-formatter.js        # Existing
│   │   └── keyboard-persona.js         # NEW: FRIDAY keyboard styling and theming
│   ├── security/                        # Security Module (EXTEND)
│   │   ├── role-filter.js              # Existing (extend)
│   │   ├── access-control.js           # Existing (extend)
│   │   └── keyboard-access.js          # NEW: Granular keyboard permission system
│   ├── product/                         # Product Module (EXTEND)
│   │   ├── realtime/
│   │   │   ├── stock-notifier.js       # Existing (extend for keyboard updates)
│   │   │   └── catalog-sync.js         # Existing
│   │   └── [existing product files]
│   ├── order/                           # Order Module (EXTEND)
│   │   ├── checkout-handler.js         # Existing (extend keyboard integration)
│   │   └── [existing order files]
│   └── [other existing modules]
├── models/
│   └── [existing models, extend if needed]
└── bot.js                               # Main entry (extend for new keyboard system)

tests/
├── integration/
│   ├── keyboard-engine.test.js         # NEW: Keyboard generation integration tests
│   ├── layout-manager.test.js          # NEW: Layout algorithm integration tests
│   ├── navigation-engine.test.js       # NEW: Navigation and breadcrumb tests
│   ├── keyboard-persona.test.js         # NEW: FRIDAY persona integration tests
│   ├── keyboard-access.test.js         # NEW: Role-based access integration tests
│   ├── performance-optimizer.test.js   # NEW: Caching and performance tests
│   └── stock-keyboard-updates.test.js   # NEW: Real-time stock keyboard updates
├── unit/
│   ├── ui/
│   │   ├── keyboard-engine.test.js
│   │   ├── layout-manager.test.js
│   │   └── navigation-engine.test.js
│   ├── friday/
│   │   └── keyboard-persona.test.js
│   ├── security/
│   │   └── keyboard-access.test.js
│   └── [other unit tests]
└── contract/
    └── keyboard-api-contract.test.js    # NEW: API contract tests
```

**Structure Decision**: Single project structure maintained. New modules added to `src/lib/ui/` (keyboard-engine, layout-manager, navigation-engine, performance-optimizer), `src/lib/friday/` (keyboard-persona), and `src/lib/security/` (keyboard-access). Existing modules extended rather than replaced to maintain backward compatibility. Tests organized by feature in `tests/integration/` and `tests/unit/` following existing patterns.

## Complexity Tracking

| Violation                                                                                                                    | Why Needed                                                                                                                                                                                                                                                  | Simpler Alternative Rejected Because                                                                                                                                                                                                                                                                                                                     |
| ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 6 new modules (keyboard-engine, layout-manager, navigation-engine, keyboard-persona, keyboard-access, performance-optimizer) | Comprehensive refactor requires separation of concerns: (1) Core keyboard generation logic, (2) Advanced layout algorithms, (3) Navigation and breadcrumb management, (4) FRIDAY persona styling, (5) Granular access control, (6) Performance optimization | Extending single keyboard-builder.js file rejected because: (1) Would exceed 2000+ lines violating maintainability, (2) Multiple concerns need separation for testability, (3) Modular approach enables independent development and future enhancements, (4) Each module has distinct responsibility (SRP), (5) Enables parallel development and testing |
