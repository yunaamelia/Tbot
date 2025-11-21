# Tasks: Premium Store Bot Inline Keyboard System Refactor

**Input**: Design documents from `/specs/005-keyboard-refactor/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are REQUIRED per Article III (Test-First Imperative). All tests must be written and FAIL before implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Create directory structure for new modules in src/lib/ui/ (keyboard-engine.js, layout-manager.js, navigation-engine.js, performance-optimizer.js)
- [ ] T002 [P] Create directory structure for new modules in src/lib/friday/ (keyboard-persona.js)
- [ ] T003 [P] Create directory structure for new modules in src/lib/security/ (keyboard-access.js)
- [ ] T004 [P] Create test directory structure in tests/integration/ for keyboard refactor tests
- [ ] T005 [P] Create test directory structure in tests/unit/ui/ for keyboard engine tests
- [ ] T006 [P] Create test directory structure in tests/unit/friday/ for keyboard persona tests
- [ ] T007 [P] Create test directory structure in tests/unit/security/ for keyboard access tests
- [ ] T008 [P] Create test directory structure in tests/contract/ for keyboard API contract tests

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T009 Verify existing keyboard-builder.js structure and identify extension points in src/lib/ui/keyboard-builder.js
- [ ] T010 [P] Verify existing layout-balancer.js can be extended in src/lib/ui/layout-balancer.js
- [ ] T011 [P] Verify existing navigation-handler.js can be extended in src/lib/ui/navigation-handler.js
- [ ] T012 [P] Verify existing role-filter.js can be extended in src/lib/security/role-filter.js
- [ ] T013 [P] Verify existing persona-service.js can be extended in src/lib/friday/persona-service.js
- [ ] T014 Verify Redis connection and caching infrastructure is available for keyboard caching
- [ ] T015 Verify existing stock-notifier.js can be extended for keyboard updates in src/lib/product/realtime/stock-notifier.js
- [ ] T016 Create base KeyboardState data structure interface (no implementation, just interface definition)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - FRIDAY-Themed Keyboard Experience (Priority: P1) 🎯 MVP

**Goal**: A user interacts with the bot and experiences inline keyboards that consistently reflect the FRIDAY AI assistant persona through visual styling, emoji usage, color schemes, and contextual messaging that aligns with the Iron Man-style AI assistant character.

**Independent Test**: Display keyboards across different menu contexts (main menu, product selection, admin panels) and verify that all keyboards use FRIDAY-themed colors (emoji-based: 🔵 primary, 🔴 danger, ⚪️ secondary), appropriate emojis, and persona-consistent styling. Delivers a cohesive brand experience that users immediately recognize as the FRIDAY assistant.

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T017 [P] [US1] Unit test for getColorIndicator() in tests/unit/friday/keyboard-persona.test.js
- [ ] T018 [P] [US1] Unit test for applyPersonaStyling() with emoji color indicators in tests/unit/friday/keyboard-persona.test.js
- [ ] T019 [P] [US1] Unit test for getTimeBasedEmoji() in tests/unit/friday/keyboard-persona.test.js
- [ ] T020 [P] [US1] Unit test for formatHelpText() with FRIDAY persona in tests/unit/friday/keyboard-persona.test.js
- [ ] T021 [P] [US1] Integration test for FRIDAY persona styling in main menu keyboard in tests/integration/keyboard-persona.test.js
- [ ] T022 [P] [US1] Integration test for FRIDAY persona styling in admin keyboard in tests/integration/keyboard-persona.test.js
- [ ] T023 [P] [US1] Integration test for time-based persona elements in keyboards in tests/integration/keyboard-persona.test.js

### Implementation for User Story 1

- [ ] T024 [P] [US1] Create keyboard-persona.js module with getColorIndicator() function in src/lib/friday/keyboard-persona.js
- [ ] T025 [US1] Implement applyPersonaStyling() function with emoji-based color indicators (🔵 primary, 🔴 danger, ⚪️ secondary) in src/lib/friday/keyboard-persona.js
- [ ] T026 [US1] Implement getTimeBasedEmoji() function for time-based contextual emojis in src/lib/friday/keyboard-persona.js
- [ ] T027 [US1] Implement formatHelpText() function with FRIDAY persona style in src/lib/friday/keyboard-persona.js
- [ ] T028 [US1] Implement getPersonaTheme() function for role-based themes in src/lib/friday/keyboard-persona.js
- [ ] T029 [US1] Extend persona-service.js to integrate with keyboard-persona.js in src/lib/friday/persona-service.js
- [ ] T030 [US1] Add FRIDAY persona styling constants (COLOR_EMOJIS, TIME_EMOJIS) in src/lib/friday/keyboard-persona.js
- [ ] T031 [US1] Add error handling and validation for persona styling in src/lib/friday/keyboard-persona.js
- [ ] T032 [US1] Add logging for persona styling operations in src/lib/friday/keyboard-persona.js

**Checkpoint**: At this point, User Story 1 should be fully functional. All keyboards display with FRIDAY-themed emoji color indicators, time-based elements, and persona-consistent styling across all menu contexts.

---

## Phase 4: User Story 2 - Intelligent 3-Column Grid Layout Engine (Priority: P1) 🎯 MVP

**Goal**: A user navigates menus with varying numbers of items and sees buttons automatically arranged in an optimal 3-column grid layout that balances visual appeal, tap accessibility, and efficient use of screen space, regardless of the number of menu items.

**Independent Test**: Generate keyboards with different item counts (1-100+ items) and verify that the layout algorithm creates balanced 3-column grids that maximize visual harmony and usability. Test edge cases (7, 8, 11 items) to verify optimal distribution. Delivers consistent, professional navigation experience across all menu sizes.

### Tests for User Story 2 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T033 [P] [US2] Unit test for calculateLayout() with 1-3 items (single row) in tests/unit/ui/layout-manager.test.js
- [ ] T034 [P] [US2] Unit test for calculateLayout() with 4-6 items (2 rows) in tests/unit/ui/layout-manager.test.js
- [ ] T035 [P] [US2] Unit test for calculateLayout() with 7-9 items (3 rows) in tests/unit/ui/layout-manager.test.js
- [ ] T036 [P] [US2] Unit test for calculateLayout() with uneven counts (7→3-2-2, 8→3-3-2) in tests/unit/ui/layout-manager.test.js
- [ ] T037 [P] [US2] Unit test for optimizeLayout() to improve visual balance in tests/unit/ui/layout-manager.test.js
- [ ] T038 [P] [US2] Unit test for validateLayout() against constraints in tests/unit/ui/layout-manager.test.js
- [ ] T039 [P] [US2] Unit test for getLayoutPattern() for common item counts in tests/unit/ui/layout-manager.test.js
- [ ] T040 [P] [US2] Integration test for layout algorithm with real Telegram API in tests/integration/layout-manager.test.js
- [ ] T041 [P] [US2] Integration test for layout with varying label lengths in tests/integration/layout-manager.test.js

### Implementation for User Story 2

- [ ] T042 [P] [US2] Create layout-manager.js module with calculateLayout() function in src/lib/ui/layout-manager.js
- [ ] T043 [US2] Implement intelligent 3-column grid algorithm with optimal row distribution in src/lib/ui/layout-manager.js
- [ ] T044 [US2] Implement layout optimization for uneven item counts (minimize empty spaces) in src/lib/ui/layout-manager.js
- [ ] T045 [US2] Implement optimizeLayout() function to improve visual balance in src/lib/ui/layout-manager.js
- [ ] T046 [US2] Implement validateLayout() function to check constraints in src/lib/ui/layout-manager.js
- [ ] T047 [US2] Implement getLayoutPattern() function for layout pattern recommendations in src/lib/ui/layout-manager.js
- [ ] T048 [US2] Add layout caching for common item counts (1-20 items) in src/lib/ui/layout-manager.js
- [ ] T049 [US2] Extend existing layout-balancer.js to use new layout-manager.js in src/lib/ui/layout-balancer.js
- [ ] T050 [US2] Add error handling and validation for layout calculations in src/lib/ui/layout-manager.js
- [ ] T051 [US2] Add logging for layout generation with complexity metrics in src/lib/ui/layout-manager.js

**Checkpoint**: At this point, User Story 2 should be fully functional. Layout algorithm creates balanced 3-column grids for any number of items (1-1000+), with optimal visual balance and minimal empty spaces.

---

## Phase 5: User Story 3 - Enhanced Navigation with Breadcrumbs and Context (Priority: P2)

**Goal**: A user navigates through deep menu structures and can easily understand their current location, navigate backward through their path, and access contextual help and shortcuts without losing their place in the menu hierarchy.

**Independent Test**: Navigate through multi-level menu structures (e.g., Admin → Products → Add Product → Category Selection) and verify that breadcrumb navigation shows current path, back button returns to previous level with context preserved, and contextual help is available at each level. Delivers clear navigation context and intuitive backtracking.

### Tests for User Story 3 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T052 [P] [US3] Unit test for addNavigationEntry() with 20-level limit in tests/unit/ui/navigation-engine.test.js
- [ ] T053 [P] [US3] Unit test for getNavigationHistory() retrieval from Redis in tests/unit/ui/navigation-engine.test.js
- [ ] T054 [P] [US3] Unit test for generateBreadcrumb() with truncation for long paths in tests/unit/ui/navigation-engine.test.js
- [ ] T055 [P] [US3] Unit test for navigateBack() with context preservation in tests/unit/ui/navigation-engine.test.js
- [ ] T056 [P] [US3] Unit test for clearHistory() functionality in tests/unit/ui/navigation-engine.test.js
- [ ] T057 [P] [US3] Unit test for FIFO eviction when history exceeds 20 levels in tests/unit/ui/navigation-engine.test.js
- [ ] T058 [P] [US3] Integration test for breadcrumb display in 3+ level menus in tests/integration/navigation-engine.test.js
- [ ] T059 [P] [US3] Integration test for back navigation with context preservation in tests/integration/navigation-engine.test.js
- [ ] T060 [P] [US3] Integration test for contextual help at different menu levels in tests/integration/navigation-engine.test.js

### Implementation for User Story 3

- [ ] T061 [P] [US3] Create navigation-engine.js module with addNavigationEntry() function in src/lib/ui/navigation-engine.js
- [ ] T062 [US3] Implement getNavigationHistory() with Redis storage (20-level limit, FIFO eviction) in src/lib/ui/navigation-engine.js
- [ ] T063 [US3] Implement generateBreadcrumb() with compact format ("Home > Products > Add") in src/lib/ui/navigation-engine.js
- [ ] T064 [US3] Implement navigateBack() with context preservation in src/lib/ui/navigation-engine.js
- [ ] T065 [US3] Implement clearHistory() function in src/lib/ui/navigation-engine.js
- [ ] T066 [US3] Implement FIFO eviction logic when history exceeds 20 levels in src/lib/ui/navigation-engine.js
- [ ] T067 [US3] Add breadcrumb row generation for keyboards (3+ levels deep) in src/lib/ui/navigation-engine.js
- [ ] T068 [US3] Extend navigation-handler.js to use navigation-engine.js in src/lib/ui/navigation-handler.js
- [ ] T069 [US3] Implement contextual help system that adapts to menu location in src/lib/ui/navigation-engine.js
- [ ] T070 [US3] Add Redis TTL management (2 hours) for navigation history in src/lib/ui/navigation-engine.js
- [ ] T071 [US3] Add error handling and validation for navigation operations in src/lib/ui/navigation-engine.js
- [ ] T072 [US3] Add logging for navigation operations in src/lib/ui/navigation-engine.js

**Checkpoint**: At this point, User Story 3 should be fully functional. Users can navigate deep menu structures with breadcrumb navigation, back button preserves context, and contextual help is available at each level.

---

## Phase 6: User Story 4 - Advanced Role-Based Access Control (Priority: P2)

**Goal**: An admin user sees enhanced administrative keyboard interfaces with quick access to management functions, while regular users see customer-focused keyboards without admin options, with all role-based filtering working seamlessly and securely.

**Independent Test**: Log in as both admin and regular users, navigate through menus, and verify that admin users see enhanced admin keyboards with management shortcuts while regular users see customer-focused keyboards without admin options. Test role change scenarios and fail-safe defaults. Delivers secure, role-appropriate interfaces for each user type.

### Tests for User Story 4 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T073 [P] [US4] Unit test for filterItemsByPermissions() with role-based filtering in tests/unit/security/keyboard-access.test.js
- [ ] T074 [P] [US4] Unit test for hasPermission() with granular permissions in tests/unit/security/keyboard-access.test.js
- [ ] T075 [P] [US4] Unit test for logAdminAction() audit trail in tests/unit/security/keyboard-access.test.js
- [ ] T076 [P] [US4] Unit test for getRoleTheme() for admin vs regular users in tests/unit/security/keyboard-access.test.js
- [ ] T077 [P] [US4] Integration test for admin keyboard with enhanced features in tests/integration/keyboard-access.test.js
- [ ] T078 [P] [US4] Integration test for regular user keyboard without admin options in tests/integration/keyboard-access.test.js
- [ ] T079 [P] [US4] Integration test for role change scenario (promoted to admin) in tests/integration/keyboard-access.test.js
- [ ] T080 [P] [US4] Integration test for fail-safe default (regular user on role detection failure) in tests/integration/keyboard-access.test.js

### Implementation for User Story 4

- [ ] T081 [P] [US4] Create keyboard-access.js module with filterItemsByPermissions() function in src/lib/security/keyboard-access.js
- [ ] T082 [US4] Implement hasPermission() function for granular permission checking in src/lib/security/keyboard-access.js
- [ ] T083 [US4] Implement logAdminAction() function for audit trail logging in src/lib/security/keyboard-access.js
- [ ] T084 [US4] Implement getRoleTheme() function for role-specific keyboard themes in src/lib/security/keyboard-access.js
- [ ] T085 [US4] Extend role-filter.js to support granular permissions in src/lib/security/role-filter.js
- [ ] T086 [US4] Implement admin quick actions configuration in src/lib/security/keyboard-access.js
- [ ] T087 [US4] Implement fail-safe default (regular user) on role detection failure in src/lib/security/keyboard-access.js
- [ ] T088 [US4] Add permission-based button visibility rules in src/lib/security/keyboard-access.js
- [ ] T089 [US4] Integrate audit logging with existing audit-logger.js in src/lib/security/audit-logger.js
- [ ] T090 [US4] Add error handling and validation for access control operations in src/lib/security/keyboard-access.js
- [ ] T091 [US4] Add logging for access control operations in src/lib/security/keyboard-access.js

**Checkpoint**: At this point, User Story 4 should be fully functional. Admin users see enhanced keyboards with management shortcuts, regular users see customer-focused keyboards, and all role-based filtering works securely with audit trails.

---

## Phase 7: User Story 5 - Smart Pagination with Dynamic Loading (Priority: P2)

**Goal**: A user browses a menu with many items (50+ products) and experiences smooth pagination with intelligent preloading, quick page transitions, and clear navigation controls that make it easy to find and access items across multiple pages.

**Independent Test**: Create menus with 50+ items, navigate through pages, and verify that pagination loads quickly (<1 second), preloads adjacent pages, and provides clear navigation controls. Test pagination with search/filter scenarios. Delivers smooth, efficient browsing of large item collections.

### Tests for User Story 5 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T092 [P] [US5] Unit test for calculatePaginationLayout() with 50+ items in tests/unit/ui/layout-manager.test.js
- [ ] T093 [P] [US5] Unit test for pagination context tracking (currentPage, totalPages) in tests/unit/ui/keyboard-engine.test.js
- [ ] T094 [P] [US5] Unit test for preloading adjacent pages in tests/unit/ui/performance-optimizer.test.js
- [ ] T095 [P] [US5] Integration test for pagination with 50+ items in tests/integration/keyboard-engine.test.js
- [ ] T096 [P] [US5] Integration test for pagination navigation controls in tests/integration/keyboard-engine.test.js
- [ ] T097 [P] [US5] Integration test for pagination with search/filter in tests/integration/keyboard-engine.test.js
- [ ] T098 [P] [US5] Performance test for pagination response time (<1 second) in tests/integration/performance-optimizer.test.js

### Implementation for User Story 5

- [ ] T099 [US5] Implement calculatePaginationLayout() in layout-manager.js for 10+ items in src/lib/ui/layout-manager.js
- [ ] T100 [US5] Implement pagination context tracking (currentPage, totalPages, item range) in src/lib/ui/keyboard-engine.js
- [ ] T101 [US5] Create performance-optimizer.js module with preloading functionality in src/lib/ui/performance-optimizer.js
- [ ] T102 [US5] Implement intelligent preloading (fetch adjacent pages N-1, N+1) in src/lib/ui/performance-optimizer.js
- [ ] T103 [US5] Implement preloaded page caching in Redis (5-minute TTL) in src/lib/ui/performance-optimizer.js
- [ ] T104 [US5] Add pagination controls (◀️ Sebelumnya, Halaman X/Y, Selanjutnya ▶️) in src/lib/ui/keyboard-engine.js
- [ ] T105 [US5] Implement pagination adaptation for filtered result sets in src/lib/ui/keyboard-engine.js
- [ ] T106 [US5] Add lazy loading for menus with 50+ items (load visible items first) in src/lib/ui/performance-optimizer.js
- [ ] T107 [US5] Add error handling and validation for pagination operations in src/lib/ui/keyboard-engine.js
- [ ] T108 [US5] Add logging for pagination operations with performance metrics in src/lib/ui/keyboard-engine.js

**Checkpoint**: At this point, User Story 5 should be fully functional. Pagination works smoothly for large menus (50+ items), with intelligent preloading, quick page transitions (<1 second), and clear navigation controls.

---

## Phase 8: User Story 6 - Real-Time Stock Integration in Keyboards (Priority: P3)

**Goal**: A user views product selection keyboards and sees real-time stock status indicators that update automatically when stock changes, ensuring they always see accurate availability information without manual refresh.

**Independent Test**: View product keyboards, update stock quantities through admin interface, and verify that product keyboards update automatically to reflect new stock status within 5 seconds. Test with multiple users viewing same keyboard. Delivers real-time accuracy in product availability display.

### Tests for User Story 6 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T109 [P] [US6] Unit test for stock status indicator generation in tests/unit/ui/keyboard-engine.test.js
- [ ] T110 [P] [US6] Unit test for active keyboard registry management in tests/unit/ui/keyboard-engine.test.js
- [ ] T111 [P] [US6] Integration test for Redis pub/sub stock update subscription in tests/integration/stock-keyboard-updates.test.js
- [ ] T112 [P] [US6] Integration test for keyboard update via editMessageReplyMarkup on stock change in tests/integration/stock-keyboard-updates.test.js
- [ ] T113 [P] [US6] Integration test for 5-second update propagation target in tests/integration/stock-keyboard-updates.test.js
- [ ] T114 [P] [US6] Integration test for multiple users viewing same product keyboard in tests/integration/stock-keyboard-updates.test.js

### Implementation for User Story 6

- [ ] T115 [US6] Extend stock-notifier.js to publish keyboard update events in src/lib/product/realtime/stock-notifier.js
- [ ] T116 [US6] Implement active keyboard registry (Redis Set) for product keyboards in src/lib/ui/keyboard-engine.js
- [ ] T117 [US6] Implement keyboard registration when product keyboard displayed in src/lib/ui/keyboard-engine.js
- [ ] T118 [US6] Implement keyboard unregistration when user navigates away in src/lib/ui/keyboard-engine.js
- [ ] T119 [US6] Implement Redis pub/sub subscription for stock:update channel in src/lib/ui/keyboard-engine.js
- [ ] T120 [US6] Implement updateKeyboard() function for stock status updates in src/lib/ui/keyboard-engine.js
- [ ] T121 [US6] Implement push notification via editMessageReplyMarkup for active keyboards in src/lib/ui/keyboard-engine.js
- [ ] T122 [US6] Add stock status indicators (✅ available, ❌ out of stock, ⚠️ low stock) in src/lib/ui/keyboard-engine.js
- [ ] T123 [US6] Add error handling for failed keyboard updates (message deleted, user left) in src/lib/ui/keyboard-engine.js
- [ ] T124 [US6] Add retry logic for transient update failures (max 3 retries) in src/lib/ui/keyboard-engine.js
- [ ] T125 [US6] Add logging for stock update propagation in src/lib/ui/keyboard-engine.js

**Checkpoint**: At this point, User Story 6 should be fully functional. Product keyboards display real-time stock status and update automatically within 5 seconds when stock changes, with proper error handling and retry logic.

---

## Phase 9: User Story 7 - Performance-Optimized Keyboard Generation (Priority: P3)

**Goal**: A user interacts with the bot during peak usage (100 concurrent users) and experiences keyboard responses within 1 second, with no performance degradation or timeouts, even for complex menus with many items.

**Independent Test**: Simulate 100 concurrent users requesting keyboards simultaneously and verify that 95% of requests complete within 1 second with no errors or timeouts. Test cache hit rates and response times. Delivers scalable performance that supports business growth.

### Tests for User Story 7 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T126 [P] [US7] Unit test for Redis caching operations in tests/unit/ui/performance-optimizer.test.js
- [ ] T127 [P] [US7] Unit test for cache key generation and invalidation in tests/unit/ui/performance-optimizer.test.js
- [ ] T128 [P] [US7] Performance test for keyboard generation (<1 second target) in tests/integration/performance-optimizer.test.js
- [ ] T129 [P] [US7] Performance test for cache hit response (<200ms target) in tests/integration/performance-optimizer.test.js
- [ ] T130 [P] [US7] Load test for 100 concurrent users in tests/integration/performance-optimizer.test.js
- [ ] T131 [P] [US7] Performance test for memory footprint reduction (30% target) in tests/integration/performance-optimizer.test.js

### Implementation for User Story 7

- [ ] T132 [US7] Implement Redis caching for keyboard layouts (TTL: 1 hour) in src/lib/ui/performance-optimizer.js
- [ ] T133 [US7] Implement cache key generation (itemHash, role, context) in src/lib/ui/performance-optimizer.js
- [ ] T134 [US7] Implement cache hit/miss logic with <200ms response target in src/lib/ui/performance-optimizer.js
- [ ] T135 [US7] Implement cache invalidation on item/role/context changes in src/lib/ui/performance-optimizer.js
- [ ] T136 [US7] Implement memory optimization (object pooling, string deduplication) in src/lib/ui/performance-optimizer.js
- [ ] T137 [US7] Add cache hit rate monitoring and logging in src/lib/ui/performance-optimizer.js
- [ ] T138 [US7] Implement timeout protection for Redis operations (prevent hanging) in src/lib/ui/performance-optimizer.js
- [ ] T139 [US7] Add performance metrics collection (response time, cache hit rate) in src/lib/ui/performance-optimizer.js
- [ ] T140 [US7] Optimize algorithm complexity (ensure O(n) for layout algorithms) in src/lib/ui/layout-manager.js
- [ ] T141 [US7] Add connection pooling optimization for Redis and database in src/lib/ui/performance-optimizer.js
- [ ] T142 [US7] Add error handling and graceful degradation when Redis unavailable in src/lib/ui/performance-optimizer.js
- [ ] T143 [US7] Add logging for performance metrics and cache operations in src/lib/ui/performance-optimizer.js

**Checkpoint**: At this point, User Story 7 should be fully functional. Keyboard generation meets performance targets (<1 second, <200ms cache hits), supports 100 concurrent users, and maintains 30% memory reduction.

---

## Phase 10: Core Keyboard Engine Integration

**Purpose**: Integrate all modules into core keyboard-engine.js and extend existing keyboard-builder.js

- [ ] T144 Create keyboard-engine.js module with createKeyboard() function in src/lib/ui/keyboard-engine.js
- [ ] T145 Integrate layout-manager.js into keyboard-engine.js in src/lib/ui/keyboard-engine.js
- [ ] T146 Integrate keyboard-persona.js into keyboard-engine.js in src/lib/ui/keyboard-engine.js
- [ ] T147 Integrate navigation-engine.js into keyboard-engine.js for breadcrumbs in src/lib/ui/keyboard-engine.js
- [ ] T148 Integrate keyboard-access.js into keyboard-engine.js for role filtering in src/lib/ui/keyboard-engine.js
- [ ] T149 Integrate performance-optimizer.js into keyboard-engine.js for caching in src/lib/ui/keyboard-engine.js
- [ ] T150 Implement updateKeyboard() function for dynamic updates in src/lib/ui/keyboard-engine.js
- [ ] T151 Implement applyFilters() function for search and filter in src/lib/ui/keyboard-engine.js
- [ ] T152 Extend existing keyboard-builder.js to use keyboard-engine.js (backward compatibility) in src/lib/ui/keyboard-builder.js
- [ ] T153 Add comprehensive error handling and validation in src/lib/ui/keyboard-engine.js
- [ ] T154 Add logging for keyboard generation operations in src/lib/ui/keyboard-engine.js

---

## Phase 11: Integration with Existing Systems

**Purpose**: Integrate new keyboard system with existing bot components

- [ ] T155 Update bot.js to use new keyboard-engine.js for main menu in src/bot.js
- [ ] T156 Update product-service.js to use new keyboard system for product menus in src/lib/product/product-service.js
- [ ] T157 Update checkout-handler.js to use new keyboard system for checkout flow in src/lib/order/checkout-handler.js
- [ ] T158 Update admin-interface.js to use new keyboard system for admin panels in src/lib/admin/admin-interface.js
- [ ] T159 Add inline query handler for search functionality in src/bot.js
- [ ] T160 Add filter button handlers for stock status filtering in src/bot.js
- [ ] T161 Update callback query handlers to support new keyboard patterns in src/bot.js
- [ ] T162 Add feature flag for gradual migration (USE_NEW_KEYBOARD_ENGINE) in src/lib/shared/config.js

---

## Phase 12: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T163 [P] Update API documentation in docs/api.md with new keyboard system APIs
- [ ] T164 [P] Add JSDoc comments to all new modules (keyboard-engine, layout-manager, navigation-engine, keyboard-persona, keyboard-access, performance-optimizer)
- [ ] T165 Code cleanup and refactoring across all new modules
- [ ] T166 [P] Run ESLint and fix all code quality issues
- [ ] T167 [P] Run Prettier and ensure consistent code formatting
- [ ] T168 Performance optimization review across all modules
- [ ] T169 Security review for access control and audit logging
- [ ] T170 UX consistency review (FRIDAY persona, responsive layouts, navigation patterns)
- [ ] T171 Run quickstart.md validation to ensure implementation matches guide
- [ ] T172 Contract test validation for all API contracts in tests/contract/keyboard-api-contract.test.js
- [ ] T173 Integration test suite execution with real Telegram API
- [ ] T174 Load testing with 100 concurrent users to validate performance targets
- [ ] T175 Memory profiling to validate 30% reduction target
- [ ] T176 Backward compatibility testing with existing user flows

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-9)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Core Integration (Phase 10)**: Depends on all user stories (US1-US7) completion
- **System Integration (Phase 11)**: Depends on Core Integration (Phase 10)
- **Polish (Phase 12)**: Depends on all previous phases completion

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 4 (P2)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 5 (P2)**: Depends on User Story 2 (layout-manager) - Can start after US2
- **User Story 6 (P3)**: Depends on Core Integration (Phase 10) - Requires keyboard-engine
- **User Story 7 (P3)**: Depends on Core Integration (Phase 10) - Requires keyboard-engine and performance-optimizer

### Within Each User Story

- Tests (REQUIRED) MUST be written and FAIL before implementation
- Core modules before integration
- Integration before system-wide updates
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, User Stories 1-4 can start in parallel
- All tests for a user story marked [P] can run in parallel
- Core modules within a story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Unit test for getColorIndicator() in tests/unit/friday/keyboard-persona.test.js"
Task: "Unit test for applyPersonaStyling() in tests/unit/friday/keyboard-persona.test.js"
Task: "Unit test for getTimeBasedEmoji() in tests/unit/friday/keyboard-persona.test.js"
Task: "Unit test for formatHelpText() in tests/unit/friday/keyboard-persona.test.js"

# Launch core module creation together:
Task: "Create keyboard-persona.js module in src/lib/friday/keyboard-persona.js"
```

---

## Parallel Example: User Story 2

```bash
# Launch all tests for User Story 2 together:
Task: "Unit test for calculateLayout() with 1-3 items in tests/unit/ui/layout-manager.test.js"
Task: "Unit test for calculateLayout() with 4-6 items in tests/unit/ui/layout-manager.test.js"
Task: "Unit test for calculateLayout() with 7-9 items in tests/unit/ui/layout-manager.test.js"
Task: "Unit test for calculateLayout() with uneven counts in tests/unit/ui/layout-manager.test.js"

# Launch core module creation:
Task: "Create layout-manager.js module in src/lib/ui/layout-manager.js"
```

---

## Implementation Strategy

### MVP First (User Stories 1 & 2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (FRIDAY Persona)
4. Complete Phase 4: User Story 2 (Layout Engine)
5. Complete Phase 10: Core Keyboard Engine Integration (basic)
6. **STOP and VALIDATE**: Test User Stories 1 & 2 independently
7. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (FRIDAY Persona MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo (Layout Engine MVP!)
4. Add User Story 3 → Test independently → Deploy/Demo (Navigation)
5. Add User Story 4 → Test independently → Deploy/Demo (Access Control)
6. Add User Story 5 → Test independently → Deploy/Demo (Pagination)
7. Add User Story 6 → Test independently → Deploy/Demo (Stock Integration)
8. Add User Story 7 → Test independently → Deploy/Demo (Performance)
9. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (FRIDAY Persona)
   - Developer B: User Story 2 (Layout Engine)
   - Developer C: User Story 3 (Navigation)
3. After US1 & US2 complete:
   - Developer A: User Story 4 (Access Control)
   - Developer B: User Story 5 (Pagination)
   - Developer C: Phase 10 (Core Integration)
4. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- All tests use real Telegram API per Article IX (Integration-First Testing)
- Follow TDD cycle: Tests written → Tests fail → Implement → Refactor

---

## Task Summary

- **Total Tasks**: 176
- **Setup Tasks**: 8 (Phase 1)
- **Foundational Tasks**: 8 (Phase 2)
- **User Story 1 Tasks**: 16 (7 tests + 9 implementation)
- **User Story 2 Tasks**: 19 (9 tests + 10 implementation)
- **User Story 3 Tasks**: 22 (9 tests + 13 implementation)
- **User Story 4 Tasks**: 19 (8 tests + 11 implementation)
- **User Story 5 Tasks**: 17 (7 tests + 10 implementation)
- **User Story 6 Tasks**: 17 (6 tests + 11 implementation)
- **User Story 7 Tasks**: 18 (6 tests + 12 implementation)
- **Core Integration Tasks**: 11 (Phase 10)
- **System Integration Tasks**: 8 (Phase 11)
- **Polish Tasks**: 14 (Phase 12)

**MVP Scope**: User Stories 1 & 2 (FRIDAY Persona + Layout Engine) = 35 tasks

