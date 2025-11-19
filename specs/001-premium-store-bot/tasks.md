# Tasks: Premium Account Store Telegram Bot

**Input**: Design documents from `/specs/001-premium-store-bot/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are REQUIRED per Article III (Test-First Imperative). All integration tests MUST use real Telegram Bot API per Article IX.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- Paths follow plan.md structure: `src/lib/` for modules, `src/models/` for entities

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Create project structure per implementation plan (src/lib/, src/models/, tests/, migrations/, scripts/)
- [X] T002 Initialize Node.js project with package.json and dependencies (telegraf, knex, pg, mysql2, ioredis, express, duitku, jest)
- [X] T003 [P] Configure ESLint and Prettier in .eslintrc.js and .prettierrc
- [X] T004 [P] Create .env.example template with all required environment variables
- [X] T005 [P] Setup .gitignore for Node.js project (node_modules, .env, logs, etc.)
- [X] T006 [P] Create README.md with setup instructions and project overview

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T007 Create database migration framework with Knex.js in src/lib/database/migrations/
- [X] T008 [P] Create initial database schema migration (001_initial_schema.js) with all tables from data-model.md
- [X] T009 [P] Create database indexes migration (002_add_indexes.js) per data-model.md for query optimization (FR-039, Article XI)
- [X] T010 [P] Implement database connection pool in src/lib/database/db-connection.js with PostgreSQL and MySQL support, including connection pooling configuration (FR-039, Article XI)
- [X] T011 [P] Implement database query builder wrapper in src/lib/database/query-builder.js using Knex.js with query optimization support (FR-039, Article XI)
- [X] T012 [P] Create environment configuration manager in src/lib/shared/config.js
- [X] T013 [P] Create logger utility in src/lib/shared/logger.js with structured logging for debugging and monitoring (FR-037, Article X)
- [X] T014 [P] Create Indonesian language handler in src/lib/shared/i18n.js for all user-facing messages
- [X] T015 [P] Implement Telegram Bot API client in src/lib/telegram/api-client.js using Telegraf.js with direct API access
- [X] T016 [P] Implement Telegram webhook handler in src/lib/telegram/webhook-handler.js
- [X] T017 [P] Create Telegram message builder utility in src/lib/telegram/message-builder.js for inline keyboards and media groups
- [X] T018 [P] Setup Express.js webhook server in server.js with HTTPS support (FR-045, Article XII)
- [X] T019 [P] Implement Redis connection and client in src/lib/shared/redis-client.js using ioredis
- [X] T020 [P] Create base error handling middleware and custom error classes with comprehensive error handling for all bot operations (FR-036, Article X)
- [X] T021 [P] Create store configuration service in src/lib/shared/store-config.js for /open and /close commands
- [X] T022 [P] Implement caching layer in src/lib/shared/cache.js for product catalog and store configuration (FR-040, Article XI)
- [X] T023 [P] Implement input validation and sanitization utility in src/lib/shared/input-validator.js for all external input (FR-043, Article XII)
- [ ] T024 Run database migrations and verify schema creation (requires database setup)
- [ ] T025 Seed initial admin user and store configuration in database (requires database setup)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Browse Products with Card-Style Display (Priority: P1) 🎯 MVP

**Goal**: Customers can browse available premium account products through an interactive card-style display interface with inline keyboard navigation

**Independent Test**: Can be fully tested by having a customer interact with the bot, view the product catalog, and navigate through products using inline keyboards. This delivers immediate value by enabling product discovery without requiring purchase functionality.

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T026 [P] [US1] Integration test for product browsing in tests/integration/product-browsing.test.js (real Telegram API)
- [X] T027 [P] [US1] Integration test for product carousel navigation in tests/integration/product-carousel.test.js (real Telegram API)

### Implementation for User Story 1

- [X] T028 [P] [US1] Create Product model in src/models/product.js with validation
- [X] T029 [P] [US1] Create Customer model in src/models/customer.js with Telegram user ID handling
- [X] T030 [P] [US1] Implement Product repository in src/lib/product/product-repository.js with database queries using caching layer (FR-040, Article XI)
- [X] T031 [P] [US1] Implement Product service in src/lib/product/product-service.js with business logic using async operations (FR-041, Article XI)
- [X] T032 [US1] Implement product card formatter in src/lib/product/product-card-formatter.js for card-style display with intuitive interface (FR-046, Article XIII)
- [X] T033 [US1] Implement product carousel handler in src/lib/product/product-carousel-handler.js with inline keyboard navigation
- [X] T034 [US1] Create /start command handler in bot.js that shows first product card
- [X] T035 [US1] Implement callback query handler for carousel navigation (next/previous buttons) in bot.js
- [X] T036 [US1] Add stock availability status display in product cards
- [X] T037 [US1] Implement empty product catalog message in Indonesian when no products available
- [X] T038 [US1] Add error handling for product browsing operations with structured logging (FR-036, Article X)

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - View Detailed Product Information with Media Group (Priority: P2)

**Goal**: Customers can view comprehensive product details including descriptions, pricing, features, and visual media using Telegram's media group functionality

**Independent Test**: Can be fully tested by having a customer select a product from the catalog and view its detailed information page with media groups. This delivers value by providing complete product transparency without requiring purchase functionality.

### Tests for User Story 2 ⚠️

- [X] T037 [P] [US2] Integration test for product details view in tests/integration/product-details.test.js (real Telegram API)
- [X] T038 [P] [US2] Integration test for media group display in tests/integration/media-group.test.js (real Telegram API)

### Implementation for User Story 2

- [X] T039 [US2] Implement product details formatter in src/lib/product/product-details-formatter.js
- [X] T040 [US2] Implement media group builder in src/lib/telegram/media-group-builder.js for multiple images/documents
- [X] T041 [US2] Add "Lihat Detail" (View Details) button to product cards in product-card-formatter.js
- [X] T042 [US2] Create callback query handler for product details view in bot.js
- [X] T043 [US2] Implement product details display with media group, description, price, features, and stock status
- [X] T044 [US2] Handle products with no media (display text-only information) in product-details-formatter.js
- [X] T045 [US2] Ensure all product detail text content is in Indonesian language
- [X] T046 [US2] Add "Kembali" (Back) button to return to product carousel from details view

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Purchase with Step-by-Step Checkout Process (Priority: P3)

**Goal**: Customers can complete a purchase through a guided, step-by-step checkout process with QRIS automatic payment or manual bank transfer

**Independent Test**: Can be fully tested by having a customer select a product, proceed through the checkout steps, and complete a purchase. This delivers complete transactional value as a standalone feature.

### Tests for User Story 3 ⚠️

- [X] T047 [P] [US3] Integration test for checkout flow in tests/integration/checkout-flow.test.js (real Telegram API)
- [X] T048 [P] [US3] Integration test for QRIS payment in tests/integration/qris-payment.test.js (real Telegram API)
- [X] T049 [P] [US3] Integration test for manual bank transfer in tests/integration/manual-payment.test.js (real Telegram API)
- [X] T050 [P] [US3] Contract test for payment callback endpoint in tests/contract/payment-callback.test.js

### Implementation for User Story 3

- [X] T051 [P] [US3] Create Order model in src/models/order.js with state machine validation
- [X] T052 [P] [US3] Create Payment model in src/models/payment.js with payment method and status
- [X] T053 [P] [US3] Create Stock model in src/models/stock.js with reserved quantity tracking
- [X] T054 [P] [US3] Implement Order repository in src/lib/order/order-repository.js
- [X] T055 [P] [US3] Implement Payment repository in src/lib/payment/payment-repository.js
- [X] T056 [P] [US3] Implement Stock repository in src/lib/product/stock-repository.js
- [X] T057 [US3] Implement Order service in src/lib/order/order-service.js with order creation and status management using database transactions (FR-033)
- [ ] T058 [US3] Implement Checkout handler in src/lib/order/checkout-handler.js with step-by-step wizard
- [ ] T059 [US3] Implement QRIS payment handler in src/lib/payment/qris-handler.js with Duitku SDK integration
- [ ] T060 [US3] Implement manual bank transfer handler in src/lib/payment/manual-verification.js with payment proof upload
- [X] T061 [US3] Implement Payment service in src/lib/payment/payment-service.js with payment verification logic
- [ ] T062 [US3] Create payment callback endpoint in server.js for Duitku webhook (POST /api/payment/callback/qris)
- [ ] T063 [US3] Implement payment status polling endpoint in server.js (GET /api/payment/callback/status)
- [ ] T064 [US3] Add "Beli" (Buy) button to product details view
- [ ] T065 [US3] Implement checkout wizard step 1: Order summary display with product confirmation
- [ ] T066 [US3] Implement checkout wizard step 2: Payment method selection (QRIS or Bank Transfer)
- [ ] T067 [US3] Implement QRIS payment flow: Generate QRIS code/image and display instructions
- [ ] T068 [US3] Implement manual bank transfer flow: Display bank account details and payment proof upload prompt
- [ ] T069 [US3] Implement automatic QRIS payment verification via webhook callback
- [X] T070 [US3] Implement stock reservation when order is created (reserve quantity) using database transactions with row-level locking (FR-033) - Implemented in order-service.js and stock-repository.js
- [X] T071 [US3] Implement stock deduction when payment is verified (decrease current quantity, decrease reserved) - Implemented in payment-service.js and stock-repository.js
- [X] T072 [US3] Implement out-of-stock validation: Prevent purchase when stock is zero - Implemented in checkout-handler.js startCheckout()
- [X] T073 [US3] Add checkout session management using Redis for multi-step checkout state - Implemented in checkout-session.js
- [X] T074 [US3] Implement checkout timeout handling (abandoned checkout cleanup) - Implemented in checkout-timeout.js
- [X] T075 [US3] Ensure all checkout instructions are in Indonesian language - All messages in i18n.js and checkout handlers use Indonesian

**Checkpoint**: At this point, User Stories 1, 2, AND 3 should all work independently

---

## Phase 6: User Story 4 - Receive Real-Time Order Status Updates (Priority: P4)

**Goal**: Customers receive automatic, real-time notifications about their order status changes with rich media messages

**Independent Test**: Can be fully tested by creating an order and verifying that status change notifications are sent automatically at each stage. This delivers value by keeping customers informed throughout their purchase journey.

### Tests for User Story 4 ⚠️

- [X] T076 [P] [US4] Integration test for order status notifications in tests/integration/order-notifications.test.js (real Telegram API)
- [X] T077 [P] [US4] Integration test for notification delivery timing in tests/integration/notification-timing.test.js (real Telegram API)

### Implementation for User Story 4

- [X] T078 [P] [US4] Create Notification model in src/models/notification.js
- [X] T079 [P] [US4] Implement Notification repository in src/lib/admin/notification-repository.js
- [X] T080 [US4] Implement Notification service in src/lib/admin/notification-service.js with rich media support
- [X] T081 [US4] Implement Redis pub/sub for real-time notification delivery in src/lib/admin/notification-pubsub.js
- [X] T082 [US4] Create order status notification templates in src/lib/shared/notification-templates.js (Indonesian)
- [X] T083 [US4] Implement notification sender in src/lib/admin/notification-sender.js using Telegram Bot API
- [X] T084 [US4] Add order status change listener: Trigger notification when payment verified - Integrated in order-service.js updatePaymentStatus()
- [X] T085 [US4] Add order status change listener: Trigger notification when order processing starts - Integrated in order-service.js updateOrderStatus()
- [X] T086 [US4] Add order status change listener: Trigger notification when account delivered - Integrated in order-service.js updateCredentials()
- [X] T087 [US4] Add order status change listener: Trigger notification when order completed - Integrated in order-service.js updateOrderStatus()
- [X] T088 [US4] Implement progress indicators in notification messages (visual status indicators) - Added progress bars in notification templates
- [X] T089 [US4] Implement payment failure notification with next steps in Indonesian - Integrated in payment-service.js markPaymentAsFailed()
- [X] T090 [US4] Ensure all notifications delivered within 10 seconds of status change - Implemented timeout in notification-service.js
- [X] T091 [US4] Add notification delivery retry logic for failed sends - Implemented in notification-sender.js and notification-retry-scheduler.js

**Checkpoint**: At this point, User Stories 1-4 should all work independently

---

## Phase 7: User Story 5 - Admin Stock Management and Store Control (Priority: P5)

**Goal**: Administrators can manage product stock levels and control store operations using /open and /close commands

**Independent Test**: Can be fully tested by having an admin use stock management commands and store control commands, verifying that stock changes are reflected immediately and store status affects customer access. This delivers operational value independently.

### Tests for User Story 5 ⚠️

- [X] T092 [P] [US5] Integration test for admin stock commands in tests/integration/admin-stock.test.js (real Telegram API)
- [X] T093 [P] [US5] Integration test for store open/close commands in tests/integration/store-control.test.js (real Telegram API)

### Implementation for User Story 5

- [X] T094 [P] [US5] Create Admin model in src/models/admin.js with permissions
- [X] T095 [P] [US5] Implement Admin repository in src/lib/admin/admin-repository.js
- [X] T096 [P] [US5] Implement access control service in src/lib/security/access-control.js for admin authentication
- [X] T097 [US5] Implement Stock manager in src/lib/product/stock-manager.js with stock update logic
- [X] T098 [US5] Create /stock command handler in src/lib/admin/admin-commands.js for stock updates
- [X] T099 [US5] Implement stock update command: /stock update <product_id> <quantity>
- [X] T100 [US5] Create /open command handler in src/lib/admin/admin-commands.js
- [X] T101 [US5] Create /close command handler in src/lib/admin/admin-commands.js
- [X] T102 [US5] Implement store status check in product browsing: Block access when store closed
- [X] T103 [US5] Implement store status check in checkout: Block purchase when store closed
- [X] T104 [US5] Implement automatic product availability update when stock reaches zero
- [X] T105 [US5] Implement automatic product availability update when stock added to out-of-stock product
- [X] T106 [US5] Add admin command registration in bot.js
- [X] T107 [US5] Implement admin permission validation for stock and store commands
- [X] T108 [US5] Add stock update confirmation message to admin after update
- [X] T109 [US5] Add store status change confirmation message to admin
- [X] T110 [US5] Implement admin interface for viewing order history in src/lib/admin/admin-interface.js (FR-029)
- [X] T111 [US5] Implement admin interface for viewing customer information in src/lib/admin/admin-interface.js (FR-029)

**Checkpoint**: At this point, User Stories 1-5 should all work independently

---

## Phase 8: User Story 6 - Admin Real-Time Order and Payment Notifications (Priority: P6)

**Goal**: Administrators receive real-time notifications for new orders, payment verifications, and critical events with action buttons

**Independent Test**: Can be fully tested by creating orders and payments, verifying that admins receive notifications with appropriate details and action prompts. This delivers operational efficiency value independently.

### Tests for User Story 6 ⚠️

- [X] T112 [P] [US6] Integration test for admin order notifications in tests/integration/admin-notifications.test.js (real Telegram API)
- [X] T113 [P] [US6] Integration test for admin payment verification in tests/integration/admin-payment-verify.test.js (real Telegram API)

### Implementation for User Story 6

- [X] T114 [US6] Implement admin notification dispatcher in src/lib/admin/admin-notification-dispatcher.js
- [X] T115 [US6] Add new order notification: Send to all admins when order created with order details
- [X] T116 [US6] Add payment proof notification: Send to admins when manual bank transfer proof uploaded
- [X] T117 [US6] Implement payment verification action buttons in admin notifications (Verify/Reject)
- [X] T118 [US6] Create callback query handler for admin payment verification actions in bot.js
- [X] T119 [US6] Implement payment verification handler: Verify payment and update order status
- [X] T120 [US6] Implement payment rejection handler: Reject payment and notify customer
- [X] T121 [US6] Add QRIS automatic verification notification: Notify admins when QRIS payment auto-verified
- [X] T122 [US6] Add payment failure alert: Notify admins when payment verification fails or requires attention
- [X] T123 [US6] Ensure all admin notifications delivered within 5 seconds of event
- [X] T124 [US6] Implement admin notification preferences: Respect admin notification settings
- [X] T125 [US6] Add notification read status tracking for admin notifications

**Checkpoint**: All user stories should now be independently functional

---

## Phase 9: Security & Account Delivery

**Purpose**: Implement security-first approach for premium account delivery (FR-019 through FR-022, FR-031, FR-032, FR-043, FR-044, FR-045)

- [X] T126 [P] Implement encryption service in src/lib/security/encryption-service.js using Node.js crypto (AES-256)
- [X] T127 [P] Implement credential delivery service in src/lib/security/credential-delivery.js with secure channel
- [X] T128 [P] Implement audit logger in src/lib/security/audit-logger.js for credential access logging
- [X] T129 Implement credential encryption before storage in orders.account_credentials field
- [X] T130 Implement secure credential delivery to customers via encrypted Telegram message
- [X] T131 Add audit log entry when credentials accessed or delivered
- [X] T132 Implement access control checks before credential delivery
- [X] T133 Add credential delivery validation: Verify order status and payment before delivery
- [X] T134 [P] Implement HMAC signature verification for payment gateway webhooks in src/lib/payment/webhook-verifier.js (FR-031)
- [X] T135 [P] Implement admin authentication using Telegram user ID whitelist validation in src/lib/security/access-control.js (FR-032)
- [X] T136 [P] Integrate input validation and sanitization in all webhook handlers and command processors using input-validator.js (FR-043, Article XII)
- [X] T137 [P] Implement credential protection: Ensure no credentials, API keys, or secrets are written to logs, error messages, or telemetry (FR-044, Article XII)
- [X] T138 [P] Verify and enforce HTTPS/TLS for all external service communications (Telegram API, payment gateways, databases) (FR-045, Article XII)

---

## Phase 10: Customer Service & Personalization

**Purpose**: Implement FAQ system, live chat, and personalization features

- [ ] T139 [P] Implement FAQ handler in src/lib/customer-service/faq-handler.js with common questions in Indonesian
- [ ] T140 [P] Implement chat handler in src/lib/customer-service/chat-handler.js for live admin chat
- [ ] T141 [P] Implement ticket service in src/lib/customer-service/ticket-service.js for support tickets
- [ ] T142 Implement personalization engine in src/lib/customer-service/personalization-engine.js
- [ ] T143 Add customer name personalization: Use customer name in messages
- [ ] T144 Add purchase history-based recommendations: Suggest products based on past purchases
- [ ] T145 Add behavior-based recommendations: Suggest products based on browsing patterns
- [ ] T146 Implement /help command with FAQ access
- [ ] T147 Implement customer service routing: Route to FAQ or live admin based on query type

---

## Phase 11: Backup & Recovery System

**Purpose**: Implement automatic backup and recovery system (FR-017)

- [ ] T143 [P] Create backup script in scripts/backup.js using pg_dump/mysqldump
- [ ] T144 [P] Create recovery script in scripts/recovery.js for data restoration
- [ ] T145 Implement automated backup scheduler using node-cron
- [ ] T146 Implement backup encryption for sensitive data
- [ ] T147 Implement backup retention policy (30 days minimum)
- [ ] T148 Add backup verification: Verify backup integrity after creation
- [ ] T149 Document recovery procedures in docs/recovery.md

---

## Phase 12: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T150 [P] Add comprehensive error messages in Indonesian for all error scenarios (FR-034)
- [ ] T151 [P] Implement request rate limiting for webhook endpoints using express-rate-limit (FR-035)
- [ ] T152 [P] Add performance monitoring and logging for all critical operations
- [ ] T153 [P] Create API documentation in docs/api.md documenting all public library interfaces and APIs, keeping in sync with implementation (FR-038, Article X)
- [ ] T154 [P] Add unit tests for all library modules in tests/unit/lib/
- [ ] T155 [P] Add unit tests for all models in tests/unit/models/
- [ ] T156 Implement connection retry logic for database and Redis
- [ ] T157 Implement graceful shutdown handling for webhook server
- [ ] T158 Add health check endpoint for monitoring
- [ ] T159 [P] Implement resource usage monitoring and optimization for scalability targets (1000+ concurrent interactions) (FR-042, Article XI)
- [ ] T160 Run quickstart.md validation: Verify all test scenarios pass
- [ ] T161 Code cleanup and refactoring: Remove unused code, optimize queries
- [ ] T162 Security audit: Review all security implementations
- [ ] T163 Performance optimization: Optimize database queries and Redis usage
- [ ] T164 [P] Ensure consistent rich media UI/UX across all user interactions (browsing, checkout, notifications) (FR-047, Article XIII)
- [ ] T165 [P] Implement UX regression detection and handling process: Treat UX regressions as defects and address before release (FR-048, Article XIII)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-8)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3 → P4 → P5 → P6)
- **Security & Account Delivery (Phase 9)**: Can start after User Story 3 (needs orders)
- **Customer Service (Phase 10)**: Can start after User Story 1 (needs products)
- **Backup & Recovery (Phase 11)**: Can start after Foundational (needs database)
- **Polish (Phase 12)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Depends on US1 (product browsing)
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Depends on US1 and US2 (needs products and details)
- **User Story 4 (P4)**: Can start after Foundational (Phase 2) - Depends on US3 (needs orders)
- **User Story 5 (P5)**: Can start after Foundational (Phase 2) - Depends on US1 (needs products for stock management)
- **User Story 6 (P6)**: Can start after Foundational (Phase 2) - Depends on US3 and US4 (needs orders and notifications)

### Within Each User Story

- Tests (REQUIRED) MUST be written and FAIL before implementation
- Models before repositories
- Repositories before services
- Services before handlers/endpoints
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, User Stories 1, 5 can start in parallel (no dependencies)
- All tests for a user story marked [P] can run in parallel
- Models within a story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members (with dependency awareness)

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task T024: "Integration test for product browsing in tests/integration/product-browsing.test.js"
Task T025: "Integration test for product carousel navigation in tests/integration/product-carousel.test.js"

# Launch all models for User Story 1 together:
Task T026: "Create Product model in src/models/product.js"
Task T027: "Create Customer model in src/models/customer.js"

# Launch all repositories/services together:
Task T028: "Implement Product repository in src/lib/product/product-repository.js"
Task T029: "Implement Product service in src/lib/product/product-service.js"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Product Browsing)
4. **STOP and VALIDATE**: Test User Story 1 independently with real Telegram API
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP - Product Browsing!)
3. Add User Story 2 → Test independently → Deploy/Demo (Product Details)
4. Add User Story 3 → Test independently → Deploy/Demo (Checkout & Payment)
5. Add User Story 4 → Test independently → Deploy/Demo (Order Notifications)
6. Add User Story 5 → Test independently → Deploy/Demo (Admin Controls)
7. Add User Story 6 → Test independently → Deploy/Demo (Admin Notifications)
8. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (Product Browsing)
   - Developer B: User Story 5 (Admin Stock Management) - can start in parallel
   - Developer C: Setup security infrastructure (Phase 9 prep)
3. After US1 complete:
   - Developer A: User Story 2 (Product Details)
   - Developer B: User Story 5 continues
   - Developer C: User Story 6 (Admin Notifications) - can start
4. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing (TDD cycle)
- All integration tests MUST use real Telegram Bot API (Article IX)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- All user-facing content MUST be in Indonesian (Bahasa Indonesia)
- All premium account credentials MUST be encrypted at rest and in transit
- All admin actions MUST be logged in audit_logs

---

## Task Summary

- **Total Tasks**: 177 (updated with Constitution v1.1.0 requirements)
- **Setup Tasks**: 6 (Phase 1)
- **Foundational Tasks**: 19 (Phase 2) - includes caching (FR-040), input validation (FR-043), structured logging (FR-037), error handling (FR-036)
- **User Story 1 Tasks**: 13 (Phase 3) - includes async operations (FR-041), caching integration (FR-040), intuitive UX (FR-046), error handling (FR-036)
- **User Story 2 Tasks**: 8 (Phase 4)
- **User Story 3 Tasks**: 29 (Phase 5)
- **User Story 4 Tasks**: 16 (Phase 6)
- **User Story 5 Tasks**: 20 (Phase 7) - includes FR-029 admin interface tasks
- **User Story 6 Tasks**: 14 (Phase 8)
- **Security Tasks**: 13 (Phase 9) - includes HMAC verification (FR-031), admin authentication (FR-032), input validation (FR-043), credential protection (FR-044), secure transport (FR-045)
- **Customer Service Tasks**: 9 (Phase 10)
- **Backup Tasks**: 7 (Phase 11)
- **Polish Tasks**: 16 (Phase 12) - includes API documentation (FR-038), resource monitoring (FR-042), consistent UX (FR-047), UX regression handling (FR-048)

**Parallel Opportunities**: 50+ tasks marked [P] can run in parallel

**MVP Scope**: Phases 1-3 (Setup + Foundational + User Story 1) = 38 tasks

**Constitution Compliance**: All new requirements (FR-036 through FR-048) have corresponding tasks mapped to Articles X, XI, XII, XIII

