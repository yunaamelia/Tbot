# Tasks: FRIDAY Bot Enhancement

**Input**: Design documents from `/specs/002-friday-enhancement/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are REQUIRED per Article III (Test-First Imperative). All tests must be written and FAIL before implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create directory structure for new modules in src/lib/friday/
- [x] T002 Create directory structure for new modules in src/lib/ui/
- [x] T003 [P] Create directory structure for new modules in src/lib/payment/config/
- [x] T004 [P] Create directory structure for new modules in src/lib/admin/hierarchy/
- [x] T005 [P] Create directory structure for new modules in src/lib/product/realtime/
- [x] T006 [P] Create test directory structure in tests/integration/ for new feature tests
- [x] T007 [P] Create test directory structure in tests/unit/friday/ and tests/unit/ui/

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T008 Create database migration 005_add_stock_update_history.js in src/lib/database/migrations/
- [ ] T009 Run migration to add last_updated_by and update_history columns to stock table
- [ ] T010 [P] Verify Redis connection and pub/sub capability for real-time stock updates
- [ ] T011 [P] Verify environment variable loading for payment method configuration
- [ ] T012 Verify existing bot.js structure can be extended with new modules

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - FRIDAY Personalized Welcome Experience (Priority: P1) 🎯 MVP

**Goal**: Customer receives personalized FRIDAY greeting based on time of day when opening the bot

**Independent Test**: Open bot at different times of day (morning, afternoon, evening, night) and verify greetings change appropriately. Delivers immediate user engagement and brand personality.

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T013 [P] [US1] Integration test for morning greeting (6:00-11:59) in tests/integration/friday-greetings.test.js
- [ ] T014 [P] [US1] Integration test for afternoon greeting (12:00-17:59) in tests/integration/friday-greetings.test.js
- [ ] T015 [P] [US1] Integration test for evening greeting (18:00-23:59) in tests/integration/friday-greetings.test.js
- [ ] T016 [P] [US1] Integration test for night greeting (0:00-5:59) in tests/integration/friday-greetings.test.js
- [ ] T017 [P] [US1] Integration test for FRIDAY persona consistency in tests/integration/friday-greetings.test.js
- [ ] T018 [P] [US1] Unit test for getTimeOfDay() in tests/unit/friday/persona-service.test.js
- [ ] T019 [P] [US1] Unit test for greeting template selection in tests/unit/friday/persona-service.test.js

### Implementation for User Story 1

- [ ] T020 [P] [US1] Create greeting-templates.js with time-based greeting templates in src/lib/friday/greeting-templates.js
- [ ] T021 [P] [US1] Create persona-formatter.js for FRIDAY message formatting in src/lib/friday/persona-formatter.js
- [ ] T022 [US1] Implement persona-service.js with getGreeting() and getTimeOfDay() methods in src/lib/friday/persona-service.js
- [ ] T023 [US1] Integrate FRIDAY greeting into /start command handler in src/bot.js
- [ ] T024 [US1] Add error handling and validation for persona-service.js
- [ ] T025 [US1] Add logging for FRIDAY greeting operations in src/lib/friday/persona-service.js

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently. Customer can open bot and receive time-appropriate FRIDAY greeting.

---

## Phase 4: User Story 2 - Responsive Menu Navigation with Balanced Layout (Priority: P1)

**Goal**: Customer navigates through bot menus using inline keyboards that auto-balance button layouts with fixed Home/Back navigation

**Independent Test**: Create menus with varying numbers of items (1-9 items) and verify layouts automatically balance according to specified patterns (3x3x2, 3x2x2, 3x2x1, 3x1x1). Delivers consistent, professional navigation experience.

### Tests for User Story 2 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T026 [P] [US2] Integration test for 9-item menu layout (3x3x2 pattern) in tests/integration/responsive-keyboard.test.js
- [ ] T027 [P] [US2] Integration test for 6-item menu layout (3x2x2 pattern) in tests/integration/responsive-keyboard.test.js
- [ ] T028 [P] [US2] Integration test for 4-item menu layout (3x2x1 pattern) in tests/integration/responsive-keyboard.test.js
- [ ] T029 [P] [US2] Integration test for 2-item menu layout (3x1x1 pattern) in tests/integration/responsive-keyboard.test.js
- [ ] T030 [P] [US2] Integration test for auto-balancing incomplete rows (7 items) in tests/integration/responsive-keyboard.test.js
- [ ] T031 [P] [US2] Integration test for Home button navigation in tests/integration/responsive-keyboard.test.js
- [ ] T032 [P] [US2] Integration test for Back button navigation in tests/integration/responsive-keyboard.test.js
- [ ] T033 [P] [US2] Unit test for balanceLayout() algorithm in tests/unit/ui/layout-balancer.test.js
- [ ] T033A [P] [US2] Integration test for empty menu state (0 items) with Home button only in tests/integration/responsive-keyboard.test.js
- [ ] T033B [P] [US2] Integration test for pagination when menu has >9 items in tests/integration/responsive-keyboard.test.js

### Implementation for User Story 2

- [ ] T034 [P] [US2] Create layout-balancer.js with balanceLayout() algorithm in src/lib/ui/layout-balancer.js
- [ ] T035 [P] [US2] Create navigation-handler.js with createNavigationRow() in src/lib/ui/navigation-handler.js
- [ ] T036 [US2] Implement keyboard-builder.js with createKeyboard() method in src/lib/ui/keyboard-builder.js
- [ ] T037 [US2] Add Redis caching for menu layouts in src/lib/ui/keyboard-builder.js
- [ ] T038 [US2] Integrate responsive keyboards into product carousel handler in src/lib/product/product-carousel-handler.js
- [ ] T039 [US2] Integrate responsive keyboards into checkout handler in src/lib/order/checkout-handler.js
- [ ] T040 [US2] Add navigation history tracking for Back button in src/lib/ui/navigation-handler.js
- [ ] T041 [US2] Add error handling and validation for keyboard builder in src/lib/ui/keyboard-builder.js
- [ ] T042 [US2] Add logging for keyboard generation operations
- [ ] T042A [US2] Implement empty menu state handler (0 items) with Home button only in src/lib/ui/keyboard-builder.js
- [ ] T042B [US2] Implement pagination for menus with >9 items in src/lib/ui/keyboard-builder.js
- [ ] T042C [US2] Verify inline keyboards are used consistently across all interactive screens (FR-021) in src/bot.js
- [ ] T042D [US2] Implement rich media display (images, videos) using media groups in product listings (FR-020) in src/lib/product/product-carousel-handler.js

**Checkpoint**: At this point, User Story 2 should be fully functional. All menus display with balanced layouts and Home/Back navigation works correctly.

---

## Phase 5: User Story 3 - Dynamic Payment Method Selection (Priority: P1)

**Goal**: Customer selects from available payment methods (QRIS, E-Wallet, Bank) that are dynamically configured through environment variables

**Independent Test**: Configure different payment methods in environment variables and verify only configured methods appear in payment selection menu. Delivers flexible payment configuration capability.

### Tests for User Story 3 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T043 [P] [US3] Integration test for QRIS payment method display when configured in tests/integration/payment-config.test.js
- [ ] T044 [P] [US3] Integration test for E-Wallet payment method display when configured in tests/integration/payment-config.test.js
- [ ] T045 [P] [US3] Integration test for Bank Transfer payment method display when configured in tests/integration/payment-config.test.js
- [ ] T046 [P] [US3] Integration test for hiding unconfigured payment methods in tests/integration/payment-config.test.js
- [ ] T047 [P] [US3] Integration test for error when no payment methods configured in tests/integration/payment-config.test.js
- [ ] T048 [P] [US3] Integration test for balanced keyboard layout with multiple payment methods in tests/integration/payment-config.test.js
- [ ] T049 [P] [US3] Unit test for validateMethod() for each payment type in tests/unit/payment/config/method-validator.test.js

### Implementation for User Story 3

- [ ] T050 [P] [US3] Create method-validator.js with validation logic for each payment type in src/lib/payment/config/method-validator.js
- [ ] T051 [US3] Implement payment-config.js with getAvailableMethods() and isMethodEnabled() in src/lib/payment/config/payment-config.js
- [ ] T052 [US3] Add Redis caching for payment methods (key: payment:methods, TTL: 1 hour) in src/lib/payment/config/payment-config.js
- [ ] T053 [US3] Implement refreshCache() method for payment configuration in src/lib/payment/config/payment-config.js
- [ ] T054 [US3] Integrate payment config into checkout handler to display only enabled methods in src/lib/order/checkout-handler.js
- [ ] T055 [US3] Add error handling for missing payment configuration in src/lib/payment/config/payment-config.js
- [ ] T056 [US3] Add logging for payment method loading and caching operations

**Checkpoint**: At this point, User Story 3 should be fully functional. Payment selection displays only configured methods dynamically.

---

## Phase 6: User Story 4 - Hierarchical Admin Command System (Priority: P2)

**Goal**: Admin manages store through hierarchical command system with logical groups and sub-commands

**Independent Test**: Execute various admin commands and verify they follow hierarchical structure with clear grouping and sub-command support. Delivers organized admin interface.

### Tests for User Story 4 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T057 [P] [US4] Integration test for top-level /admin command showing menu in tests/integration/admin-hierarchy.test.js
- [ ] T058 [P] [US4] Integration test for hierarchical command execution (/admin product add) in tests/integration/admin-hierarchy.test.js
- [ ] T059 [P] [US4] Integration test for invalid command path with suggestions in tests/integration/admin-hierarchy.test.js
- [ ] T060 [P] [US4] Integration test for permission checking at hierarchy levels in tests/integration/admin-hierarchy.test.js
- [ ] T061 [P] [US4] Integration test for command help system in tests/integration/admin-hierarchy.test.js
- [ ] T062 [P] [US4] Unit test for command routing logic in tests/unit/admin/hierarchy/command-router.test.js
- [ ] T063 [P] [US4] Unit test for command registry operations in tests/unit/admin/hierarchy/command-registry.test.js

### Implementation for User Story 4

- [ ] T064 [P] [US4] Create command-registry.js with registerCommand() method in src/lib/admin/hierarchy/command-registry.js
- [ ] T065 [P] [US4] Create command-help.js with getHelp() and getSuggestions() methods in src/lib/admin/hierarchy/command-help.js
- [ ] T066 [US4] Implement command-router.js with routeCommand() method in src/lib/admin/hierarchy/command-router.js
- [ ] T067 [US4] Register existing admin commands in hierarchical structure in src/lib/admin/admin-commands.js
- [ ] T068 [US4] Integrate command router into bot.js /admin command handler in src/bot.js
- [ ] T069 [US4] Add permission checking at each hierarchy level in src/lib/admin/hierarchy/command-router.js
- [ ] T070 [US4] Add error handling for invalid commands with helpful suggestions
- [ ] T071 [US4] Add logging for command routing and execution

**Checkpoint**: At this point, User Story 4 should be fully functional. Admins can navigate and execute commands through hierarchical structure.

---

## Phase 7: User Story 5 - Real-Time Stock Management with Admin Input (Priority: P2)

**Goal**: Admin updates product stock quantities in real-time, changes immediately reflected in customer catalog

**Independent Test**: Admin updates stock through bot and verify product availability changes immediately for customers browsing catalog. Delivers real-time inventory accuracy.

### Tests for User Story 5 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T072 [P] [US5] Integration test for stock update reflecting in catalog within 2 seconds in tests/integration/stock-realtime.test.js
- [ ] T073 [P] [US5] Integration test for automatic availability status change when stock reaches zero in tests/integration/stock-realtime.test.js
- [ ] T074 [P] [US5] Integration test for automatic availability status change when stock added to out-of-stock product in tests/integration/stock-realtime.test.js
- [ ] T075 [P] [US5] Integration test for customer seeing updated stock on next interaction in tests/integration/stock-realtime.test.js
- [ ] T076 [P] [US5] Integration test for validation error on negative stock in tests/integration/stock-realtime.test.js
- [ ] T077 [P] [US5] Unit test for Redis pub/sub notification publishing in tests/unit/product/realtime/stock-notifier.test.js
- [ ] T078 [P] [US5] Unit test for catalog synchronization logic in tests/unit/product/realtime/catalog-sync.test.js
- [ ] T078A [P] [US5] Integration test for concurrent stock updates preventing race conditions in tests/integration/stock-realtime.test.js

### Implementation for User Story 5

- [ ] T079 [P] [US5] Create stock-notifier.js with notifyStockUpdate() and subscribeToUpdates() in src/lib/product/realtime/stock-notifier.js
- [ ] T080 [P] [US5] Create catalog-sync.js with syncCatalog() method in src/lib/product/realtime/catalog-sync.js
- [ ] T081 [US5] Extend stock-manager.js to publish Redis notifications on stock updates in src/lib/product/stock-manager.js
- [ ] T082 [US5] Add last_updated_by tracking to stock updates in src/lib/product/stock-manager.js
- [ ] T083 [US5] Add update_history JSON field updates in src/lib/product/stock-manager.js
- [ ] T084 [US5] Integrate catalog sync subscriber to listen for stock:updated channel in src/lib/product/realtime/catalog-sync.js
- [ ] T085 [US5] Add cache invalidation on stock updates in src/lib/product/product-repository.js
- [ ] T086 [US5] Add error handling for Redis pub/sub failures
- [ ] T087 [US5] Add logging for stock update notifications and catalog sync operations
- [ ] T087A [US5] Implement database transactions for atomic stock updates to prevent race conditions in src/lib/product/stock-manager.js

**Checkpoint**: At this point, User Story 5 should be fully functional. Stock updates reflect immediately in customer catalog.

---

## Phase 8: User Story 6 - Hybrid Payment Processing with Automatic and Manual Fallback (Priority: P2)

**Goal**: QRIS payment automatically verified when possible, falls back to manual verification on failure/timeout

**Independent Test**: Simulate QRIS payment with automatic verification success, failure, and timeout scenarios, verifying manual fallback activates appropriately. Delivers payment processing reliability.

### Tests for User Story 6 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T088 [P] [US6] Integration test for automatic QRIS verification success in tests/integration/qris-payment.test.js
- [ ] T089 [P] [US6] Integration test for automatic QRIS verification failure triggering manual fallback in tests/integration/qris-payment.test.js
- [ ] T090 [P] [US6] Integration test for automatic QRIS verification timeout triggering manual fallback in tests/integration/qris-payment.test.js
- [ ] T091 [P] [US6] Integration test for manual verification workflow when automatic fails in tests/integration/qris-payment.test.js
- [ ] T092 [P] [US6] Integration test for customer confirmation after payment verification in tests/integration/qris-payment.test.js
- [ ] T093 [P] [US6] Integration test for immediate manual routing when automatic unavailable in tests/integration/qris-payment.test.js

### Implementation for User Story 6

- [ ] T094 [US6] Enhance qris-handler.js to attempt automatic verification first in src/lib/payment/qris-handler.js
- [ ] T095 [US6] Add 5-minute timeout for automatic QRIS verification in src/lib/payment/qris-handler.js
- [ ] T096 [US6] Implement automatic fallback to manual verification on failure/timeout in src/lib/payment/qris-handler.js
- [ ] T097 [US6] Enhance manual-verification.js to handle QRIS fallback cases in src/lib/payment/manual-verification.js
- [ ] T098 [US6] Add customer notification for payment verification status in src/lib/payment/payment-service.js
- [ ] T099 [US6] Add error handling for partial success states (verification succeeds but order processing fails)
- [ ] T100 [US6] Add logging for automatic vs manual verification decisions
- [ ] T100A [US6] Implement encryption for premium account credentials before storage (FR-022) in src/lib/security/encryption-service.js
- [ ] T100B [US6] Implement secure credential delivery mechanism after payment verification (FR-023) in src/lib/order/credential-delivery.js
- [ ] T100C [US6] Implement security audit logs for credential access and delivery (FR-024) in src/lib/security/audit-logger.js

**Checkpoint**: At this point, User Story 6 should be fully functional. QRIS payments automatically verify when possible, with reliable manual fallback.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T101 [P] Update API documentation in docs/api.md with new FRIDAY and UI modules
- [ ] T102 [P] Update README.md with FRIDAY persona features and new admin commands
- [ ] T103 Code cleanup and refactoring across all new modules
- [ ] T104 [P] Performance optimization: verify keyboard layout algorithm O(n) complexity
- [ ] T105 [P] Performance optimization: verify Redis caching reduces env reads
- [ ] T106 Security hardening: verify payment credentials never logged
- [ ] T107 Security hardening: verify admin permission checks at all hierarchy levels
- [ ] T108 Run quickstart.md validation: test all features end-to-end
- [ ] T109 [P] Add comprehensive error messages in Indonesian for all new features
- [ ] T110 Verify FRIDAY persona consistency across all user-facing messages
- [ ] T111 Verify responsive keyboard layouts work across all menu screens
- [ ] T112 Verify real-time stock updates work under load (1000+ concurrent)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-8)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1: US1→US2→US3, then P2: US4→US5→US6)
- **Polish (Phase 9)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 3 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 4 (P2)**: Can start after Foundational (Phase 2) - May integrate with existing admin-commands.js but independently testable
- **User Story 5 (P2)**: Can start after Foundational (Phase 2) - Extends existing stock-manager.js but independently testable
- **User Story 6 (P2)**: Can start after Foundational (Phase 2) - Enhances existing qris-handler.js but independently testable

### Within Each User Story

- Tests (if included) MUST be written and FAIL before implementation
- Core modules before integration
- Integration before polish
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel (T003-T007)
- All Foundational tasks marked [P] can run in parallel (T010-T011)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- All tests for a user story marked [P] can run in parallel
- Models/services within a story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Integration test for morning greeting in tests/integration/friday-greetings.test.js"
Task: "Integration test for afternoon greeting in tests/integration/friday-greetings.test.js"
Task: "Integration test for evening greeting in tests/integration/friday-greetings.test.js"
Task: "Integration test for night greeting in tests/integration/friday-greetings.test.js"
Task: "Unit test for getTimeOfDay() in tests/unit/friday/persona-service.test.js"

# Launch all modules for User Story 1 together:
Task: "Create greeting-templates.js in src/lib/friday/greeting-templates.js"
Task: "Create persona-formatter.js in src/lib/friday/persona-formatter.js"
```

---

## Parallel Example: User Story 2

```bash
# Launch all tests for User Story 2 together:
Task: "Integration test for 9-item menu layout in tests/integration/responsive-keyboard.test.js"
Task: "Integration test for 6-item menu layout in tests/integration/responsive-keyboard.test.js"
Task: "Integration test for 4-item menu layout in tests/integration/responsive-keyboard.test.js"
Task: "Unit test for balanceLayout() algorithm in tests/unit/ui/layout-balancer.test.js"

# Launch modules for User Story 2 together:
Task: "Create layout-balancer.js in src/lib/ui/layout-balancer.js"
Task: "Create navigation-handler.js in src/lib/ui/navigation-handler.js"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (FRIDAY Greetings)
4. **STOP and VALIDATE**: Test User Story 1 independently - customer opens bot and receives time-appropriate FRIDAY greeting
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP: FRIDAY greetings!)
3. Add User Story 2 → Test independently → Deploy/Demo (Responsive menus)
4. Add User Story 3 → Test independently → Deploy/Demo (Dynamic payment config)
5. Add User Story 4 → Test independently → Deploy/Demo (Admin hierarchy)
6. Add User Story 5 → Test independently → Deploy/Demo (Real-time stock)
7. Add User Story 6 → Test independently → Deploy/Demo (Hybrid payment)
8. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (FRIDAY greetings) - P1
   - Developer B: User Story 2 (Responsive menus) - P1
   - Developer C: User Story 3 (Payment config) - P1
3. After P1 stories complete:
   - Developer A: User Story 4 (Admin hierarchy) - P2
   - Developer B: User Story 5 (Real-time stock) - P2
   - Developer C: User Story 6 (Hybrid payment) - P2
4. Stories complete and integrate independently

---

## Task Summary

- **Total Tasks**: 121 (updated after analysis fixes)
- **Setup Tasks**: 7 (T001-T007)
- **Foundational Tasks**: 5 (T008-T012)
- **User Story 1 Tasks**: 13 (T013-T025) - 7 tests, 6 implementation
- **User Story 2 Tasks**: 22 (T026-T042D) - 10 tests, 12 implementation (added edge cases, FR-020, FR-021)
- **User Story 3 Tasks**: 14 (T043-T056) - 7 tests, 7 implementation
- **User Story 4 Tasks**: 15 (T057-T071) - 7 tests, 8 implementation
- **User Story 5 Tasks**: 18 (T072-T087A) - 8 tests, 10 implementation (added concurrent updates)
- **User Story 6 Tasks**: 16 (T088-T100C) - 6 tests, 10 implementation (added security tasks)
- **Polish Tasks**: 12 (T101-T112)

### Parallel Opportunities Identified

- **Phase 1**: 5 parallel tasks (T003-T007)
- **Phase 2**: 2 parallel tasks (T010-T011)
- **User Story 1**: 7 parallel test tasks, 2 parallel module tasks
- **User Story 2**: 10 parallel test tasks (T026-T033B), 3 parallel module tasks (T034-T035, T042D)
- **User Story 3**: 7 parallel test tasks, 1 parallel module task
- **User Story 4**: 7 parallel test tasks, 2 parallel module tasks
- **User Story 5**: 8 parallel test tasks (T072-T078A), 2 parallel module tasks (T079-T080)
- **User Story 6**: 6 parallel test tasks, 3 parallel security tasks (T100A-T100C)
- **Polish**: 4 parallel tasks

### Independent Test Criteria

- **US1**: Open bot at different times, verify greeting changes (morning/afternoon/evening/night)
- **US2**: Create menus with 2, 4, 6, 9 items, verify layout patterns and Home/Back navigation
- **US3**: Configure different payment methods in .env, verify only configured methods appear
- **US4**: Execute /admin commands, verify hierarchical structure and permission checking
- **US5**: Admin updates stock, verify customer catalog updates within 2 seconds
- **US6**: Simulate QRIS payment scenarios (success, failure, timeout), verify fallback behavior

### Suggested MVP Scope

**MVP = User Story 1 Only** (FRIDAY Personalized Welcome Experience)

- Delivers immediate brand identity and user engagement
- Independently testable and deployable
- Establishes FRIDAY persona foundation for future enhancements
- Can be demonstrated immediately: "Open bot, get personalized greeting"

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing (Article III: Test-First Imperative)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- All new modules follow Article I: Library-First Principle
- All tests use real Telegram API per Article IX: Integration-First Testing
- All user-facing messages in Indonesian per Article XIII: User Experience

### Analysis & Remediation Notes

- **Updated**: 2025-11-21 after `/speckit.analyze` analysis
- **Tasks Added**: 9 new tasks (T033A-T033B, T042A-T042D, T078A, T087A, T100A-T100C)
- **Coverage**: 100% requirement coverage (24/24), 100% edge case coverage (8/8)
- **Fixes Applied**: Module path consistency, security tasks moved to implementation phase, edge cases added
- **See**: `analysis-report.md` for detailed findings and remediation
