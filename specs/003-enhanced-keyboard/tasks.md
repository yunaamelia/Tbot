# Tasks: Enhanced Inline Keyboard System

**Input**: Design documents from `/specs/003-enhanced-keyboard/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are REQUIRED per Article III (Test-First Imperative). All tests must be written and FAIL before implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create directory structure for new modules in src/lib/ui/ (button-state-manager.js)
- [x] T002 [P] Create directory structure for new modules in src/lib/security/ (role-filter.js)
- [x] T003 [P] Create directory structure for new modules in src/lib/monitoring/ (interaction-logger.js)
- [x] T004 [P] Create test directory structure in tests/integration/ for enhanced keyboard tests
- [x] T005 [P] Create test directory structure in tests/unit/ui/ for button-state-manager tests
- [x] T006 [P] Create test directory structure in tests/unit/security/ for role-filter tests
- [x] T007 [P] Create test directory structure in tests/unit/monitoring/ for interaction-logger tests

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T008 Create database migration 006_add_interaction_logs.js in src/lib/database/migrations/
- [ ] T009 Run migration to create interaction_logs table with indexes
- [ ] T010 [P] Verify existing keyboard-builder.js can be extended (check Phase 4 implementation)
- [ ] T011 [P] Verify existing role detection infrastructure (access-control.js) can be extended
- [ ] T012 Verify Redis connection and caching infrastructure is available for role caching

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Responsive Dynamic Layout for Menu Items (Priority: P1) 🎯 MVP

**Goal**: A user navigates through the bot's menu system and sees inline keyboard buttons that automatically arrange themselves in an optimal layout based on the number of menu items, ensuring buttons are evenly distributed and easy to tap regardless of the menu size.

**Independent Test**: Display menus with varying numbers of items (1-9 items) and verify layouts automatically arrange according to specified patterns (1 row for 1-3 items, 2 rows for 4-6 items, 3 rows for 7-9 items). Also verify pagination for 10+ items and label truncation for long labels. Delivers consistent, professional navigation experience.

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T013 [P] [US1] Integration test for 1-3 item menu (single row layout) in tests/integration/enhanced-keyboard.test.js
- [ ] T014 [P] [US1] Integration test for 4-6 item menu (2 rows with up to 3 per row) in tests/integration/enhanced-keyboard.test.js
- [ ] T015 [P] [US1] Integration test for 7-9 item menu (3 rows with up to 3 per row) in tests/integration/enhanced-keyboard.test.js
- [ ] T016 [P] [US1] Integration test for incomplete rows (e.g., 5 items) with even distribution in tests/integration/enhanced-keyboard.test.js
- [ ] T017 [P] [US1] Integration test for long button label truncation with ellipsis in tests/integration/enhanced-keyboard.test.js
- [ ] T018 [P] [US1] Integration test for pagination at 10+ items (no pagination for exactly 9 items) in tests/integration/enhanced-keyboard.test.js
- [ ] T019 [P] [US1] Unit test for label truncation logic (max 20 characters, ellipsis) in tests/unit/ui/keyboard-builder.test.js

### Implementation for User Story 1

- [ ] T020 [US1] Extend createKeyboard() in src/lib/ui/keyboard-builder.js to support label truncation for long labels (FR-001)
- [ ] T021 [US1] Add label truncation helper function with ellipsis ("...") in src/lib/ui/keyboard-builder.js
- [ ] T022 [US1] Update pagination threshold check in createPaginatedKeyboard() to only show at 10+ items (not at exactly 9) in src/lib/ui/keyboard-builder.js (FR-002, note: T088 in US5 will verify this)
- [ ] T023 [US1] Verify existing layout balancing algorithm (from Phase 4) handles 1-9 items correctly
- [ ] T024 [US1] Add validation for button label length (max 64 bytes, truncate if too long) in src/lib/ui/keyboard-builder.js
- [ ] T025 [US1] Add error handling for invalid menu items in src/lib/ui/keyboard-builder.js
- [ ] T026 [US1] Add logging for keyboard generation with item counts and layout patterns

**Checkpoint**: At this point, User Story 1 should be fully functional. Menus display with responsive layouts (1-3: 1 row, 4-6: 2 rows, 7-9: 3 rows), pagination shows only at 10+ items, and long labels are truncated with ellipsis.

---

## Phase 4: User Story 2 - Fixed Navigation Controls (Priority: P1)

**Goal**: A user navigates through the bot and always has access to fixed navigation buttons (Home, Help, Back) at the bottom of every menu screen, allowing them to quickly return to main menu, access help, or go back to the previous screen.

**Independent Test**: Navigate through different menu screens and verify that Home, Help, and Back buttons are always present at the bottom. Test Home, Help, and Back button functionality independently. Delivers consistent navigation experience.

### Tests for User Story 2 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T027 [P] [US2] Integration test for Home/Help/Back buttons present on all menu screens in tests/integration/enhanced-keyboard.test.js
- [ ] T028 [P] [US2] Integration test for Home button navigation (returns to main menu) in tests/integration/enhanced-keyboard.test.js
- [ ] T029 [P] [US2] Integration test for Help button functionality (shows context-aware help) in tests/integration/enhanced-keyboard.test.js
- [ ] T030 [P] [US2] Integration test for Back button navigation (returns to previous menu) in tests/integration/enhanced-keyboard.test.js
- [ ] T031 [P] [US2] Integration test for Back button disabled/feedback at main menu in tests/integration/enhanced-keyboard.test.js

### Implementation for User Story 2

- [ ] T032 [US2] Verify existing createNavigationRow() in src/lib/ui/navigation-handler.js includes Help button (FR-003, FR-005)
- [ ] T033 [US2] Add Help button to navigation row if not already present in src/lib/ui/navigation-handler.js
- [ ] T034 [US2] Implement Help button callback handler with context-aware help in src/bot.js
- [ ] T035 [US2] Verify existing Home button navigation works correctly (FR-004)
- [ ] T036 [US2] Verify existing Back button navigation works correctly (FR-006)
- [ ] T037 [US2] Add Back button disabled state check at main menu in src/lib/ui/navigation-handler.js
- [ ] T038 [US2] Add error handling for navigation button callbacks in src/bot.js
- [ ] T039 [US2] Add logging for navigation actions (Home, Help, Back) in src/bot.js

**Checkpoint**: At this point, User Story 2 should be fully functional. All menus have fixed Home/Help/Back navigation buttons, and navigation works correctly from any screen.

---

## Phase 5: User Story 3 - Role-Based Menu Access for Admin and Regular Users (Priority: P1)

**Goal**: An admin user sees additional management buttons and controls that replace some standard user buttons, while regular users see only user-facing options. Regular users who attempt to access admin-only features see disabled buttons with clear "Access denied" messages.

**Independent Test**: Login as both admin and regular user, verify menus show appropriate buttons for each role, and confirm restricted actions show access denied messages. Delivers secure role-based access control.

### Tests for User Story 3 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T040 [P] [US3] Integration test for admin user seeing additional management buttons in tests/integration/role-based-access.test.js
- [ ] T041 [P] [US3] Integration test for regular user seeing only user-facing options in tests/integration/role-based-access.test.js
- [ ] T042 [P] [US3] Integration test for admin-only buttons disabled for regular users in tests/integration/role-based-access.test.js
- [ ] T043 [P] [US3] Integration test for "Access denied" message when regular user clicks admin button in tests/integration/role-based-access.test.js
- [ ] T044 [P] [US3] Integration test for role detection fail-safe (defaults to regular user on failure) in tests/integration/role-based-access.test.js
- [ ] T045 [P] [US3] Unit test for getUserRole() with caching and fail-safe in tests/unit/security/role-filter.test.js
- [ ] T046 [P] [US3] Unit test for filterMenuItemsByRole() in tests/unit/security/role-filter.test.js
- [ ] T047 [P] [US3] Unit test for markDisabledButtons() in tests/unit/security/role-filter.test.js

### Implementation for User Story 3

- [ ] T048 [P] [US3] Create role-filter.js with getUserRole() method (cache → database → fail-safe) in src/lib/security/role-filter.js
- [ ] T049 [P] [US3] Implement Redis caching for role lookups (key: role:user:{telegramUserId}, TTL: 1 hour) in src/lib/security/role-filter.js
- [ ] T050 [US3] Implement filterMenuItemsByRole() method in src/lib/security/role-filter.js (FR-007, FR-009)
- [ ] T051 [US3] Implement markDisabledButtons() method for regular users viewing admin buttons in src/lib/security/role-filter.js (FR-010)
- [ ] T052 [US3] Extend createKeyboard() in src/lib/ui/keyboard-builder.js to support role-based filtering by adding telegramUserId parameter to options
- [ ] T053 [US3] Add role-based filtering before keyboard layout creation in src/lib/ui/keyboard-builder.js (FR-008)
- [ ] T054 [US3] Optimize role detection performance with Redis caching to meet <200ms target (FR-022, SC-008) in src/lib/security/role-filter.js
- [ ] T055 [US3] Implement "Access denied" message handler for admin-only features in src/bot.js (FR-011)
- [ ] T056 [US3] Add cache invalidation on role changes in src/lib/security/role-filter.js
- [ ] T057 [US3] Add error handling for role detection failures (fail-safe to regular user) in src/lib/security/role-filter.js
- [ ] T058 [US3] Add logging for role detection and filtering operations in src/lib/security/role-filter.js

**Checkpoint**: At this point, User Story 3 should be fully functional. Admin users see admin buttons, regular users see only user buttons, disabled admin buttons show access denied messages, and role detection works with caching and fail-safe.

---

## Phase 6: User Story 4 - Visual Enhancements and Interactive Feedback (Priority: P2)

**Goal**: A user interacts with inline keyboard buttons and receives visual feedback through color coding, emojis/icons, and interactive responses (loading states, click animations) that provide clear indication of button functions and system responses.

**Independent Test**: Interact with various buttons and verify visual cues (colors, emojis) appear correctly, loading states show during processing, and buttons provide appropriate feedback. Delivers enhanced user experience through visual communication.

### Tests for User Story 4 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T058 [P] [US4] Integration test for button emojis/icons displayed correctly in tests/integration/enhanced-keyboard.test.js
- [ ] T059 [P] [US4] Integration test for color coding (primary, secondary, danger) via emojis in tests/integration/enhanced-keyboard.test.js
- [ ] T060 [P] [US4] Integration test for button disabled state during processing in tests/integration/button-states.test.js
- [ ] T061 [P] [US4] Integration test for loading indicator during button processing in tests/integration/button-states.test.js
- [ ] T062 [P] [US4] Integration test for button re-enabled after processing completion in tests/integration/button-states.test.js
- [ ] T063 [P] [US4] Integration test for duplicate click prevention (button disabled prevents rapid clicks) in tests/integration/button-states.test.js
- [ ] T064 [P] [US4] Unit test for disableButton() in tests/unit/ui/button-state-manager.test.js
- [ ] T065 [P] [US4] Unit test for enableButton() in tests/unit/ui/button-state-manager.test.js
- [ ] T066 [P] [US4] Unit test for isButtonProcessing() in tests/unit/ui/button-state-manager.test.js

### Implementation for User Story 4

- [ ] T067 [P] [US4] Create button-state-manager.js with disableButton() method in src/lib/ui/button-state-manager.js
- [ ] T068 [US4] Implement enableButton() method in src/lib/ui/button-state-manager.js
- [ ] T069 [US4] Implement isButtonProcessing() method with Redis state storage in src/lib/ui/button-state-manager.js
- [ ] T070 [US4] Add Redis state storage for button processing (key: button:state:{buttonId}, TTL: 30 seconds) in src/lib/ui/button-state-manager.js
- [ ] T071 [US4] Integrate button state management into callback query handler in src/bot.js (FR-014)
- [ ] T072 [US4] Add visual emoji helpers for color coding (🔵 primary, ⚪️ secondary, 🔴 danger) in src/lib/ui/keyboard-builder.js (FR-012, FR-013)
- [ ] T073 [US4] Add loading indicator emoji/text (⏳ Processing...) to button states in src/lib/ui/button-state-manager.js
- [ ] T074 [US4] Add success/error feedback emojis (✅ Complete, ❌ Failed) to button states in src/lib/ui/button-state-manager.js
- [ ] T075 [US4] Implement visual feedback on button click (state changes, emoji updates) in src/lib/ui/button-state-manager.js (FR-015)
- [ ] T076 [US4] Implement button state timeout handling (30 seconds default) in src/lib/ui/button-state-manager.js
- [ ] T077 [US4] Add error handling for button state operations in src/lib/ui/button-state-manager.js
- [ ] T078 [US4] Add logging for button state transitions in src/lib/ui/button-state-manager.js

**Checkpoint**: At this point, User Story 4 should be fully functional. Buttons show visual cues (emojis, colors), disable during processing, show loading indicators, and provide feedback on completion.

---

## Phase 7: User Story 5 - Pagination for Large Menus (Priority: P2)

**Goal**: A user navigates a menu with more than 9 items and can access additional items through pagination. The "more" button appears when items exceed the current view, allowing users to browse through all available options without overwhelming the interface.

**Independent Test**: Create menus with 10+ items and verify pagination appears, "more" button functions correctly, and users can navigate through all pages. Also verify pagination only shows at 10+ items (not at exactly 9). Delivers scalable menu navigation.

### Tests for User Story 5 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T079 [P] [US5] Integration test for pagination at 10+ items (shows "▶️ Next" button) in tests/integration/enhanced-keyboard.test.js
- [ ] T080 [P] [US5] Integration test for no pagination at exactly 9 items in tests/integration/enhanced-keyboard.test.js
- [ ] T081 [P] [US5] Integration test for "more" button only shown when additional items available (FR-017) in tests/integration/enhanced-keyboard.test.js
- [ ] T082 [P] [US5] Integration test for pagination navigation (Next replaces current keyboard inline) in tests/integration/enhanced-keyboard.test.js
- [ ] T083 [P] [US5] Integration test for pagination backward navigation (Prev replaces current keyboard inline) in tests/integration/enhanced-keyboard.test.js
- [ ] T084 [P] [US5] Integration test for first page feedback ("Already on first page") in tests/integration/enhanced-keyboard.test.js
- [ ] T085 [P] [US5] Integration test for last page feedback ("No more items") in tests/integration/enhanced-keyboard.test.js
- [ ] T086 [P] [US5] Unit test for createPaginatedKeyboard() pagination logic in tests/unit/ui/keyboard-builder.test.js

### Implementation for User Story 5

- [ ] T087 [US5] Verify existing createPaginatedKeyboard() in src/lib/ui/keyboard-builder.js handles 10+ items correctly (FR-002, FR-016)
- [ ] T088 [US5] Ensure pagination threshold check only shows at 10+ items (not at exactly 9) in src/lib/ui/keyboard-builder.js (note: T022 in US1 already implements this)
- [ ] T089 [US5] Implement inline keyboard replacement (ctx.editMessageReplyMarkup) for pagination navigation in src/bot.js (FR-002)
- [ ] T090 [US5] Add pagination callback handlers (page\_{number}, prev, next) in src/bot.js
- [ ] T091 [US5] Add pagination state management (current page, total pages) in src/lib/ui/keyboard-builder.js
- [ ] T092 [US5] Implement "▶️ Next" and "◀️ Prev" button controls with availability check (FR-017) in src/lib/ui/keyboard-builder.js
- [ ] T093 [US5] Add first/last page edge case handling (disable Prev at first, Next at last) in src/lib/ui/keyboard-builder.js (FR-018)
- [ ] T094 [US5] Add error handling for pagination navigation in src/bot.js
- [ ] T095 [US5] Add logging for pagination operations in src/lib/ui/keyboard-builder.js

**Checkpoint**: At this point, User Story 5 should be fully functional. Menus with 10+ items show pagination, users can navigate between pages, and pagination only appears when items exceed 9.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T096 [P] Implement interaction logging for all button clicks in src/lib/monitoring/interaction-logger.js (FR-019)
- [ ] T097 [US3] Integrate interaction logger into callback_query handler in src/bot.js (in bot.on('callback_query') handler, around line 400-450)
- [ ] T098 [P] Implement response time tracking for button actions in src/lib/monitoring/interaction-logger.js (FR-020)
- [ ] T099 [P] Add error logging for button action failures in src/lib/monitoring/interaction-logger.js (FR-021)
- [ ] T100 [P] Create unit tests for interaction-logger.js in tests/unit/monitoring/interaction-logger.test.js
- [ ] T101 [P] Create integration tests for interaction logging in tests/integration/enhanced-keyboard.test.js
- [ ] T102 [P] Update API documentation in docs/api.md with new keyboard builder methods
- [ ] T103 [P] Update API documentation in docs/api.md with role filter API
- [ ] T104 [P] Update API documentation in docs/api.md with button state manager API
- [ ] T105 [P] Update API documentation in docs/api.md with interaction logger API
- [ ] T106 Performance verification: Verify role detection adds <200ms to menu loading (SC-008) in src/lib/security/role-filter.js
- [ ] T107 Performance verification: Verify keyboard caching reduces layout computation time in src/lib/ui/keyboard-builder.js
- [ ] T108 Performance verification: Verify pagination navigation <1 second for 50 items (SC-006) in tests/integration/enhanced-keyboard.test.js
- [ ] T109 Security: Verify role detection fail-safe always defaults to regular user in src/lib/security/role-filter.js
- [ ] T110 Security: Verify admin buttons properly filtered/disabled for regular users in tests/integration/role-based-access.test.js
- [ ] T111 UX: Verify all user-facing messages are in Indonesian language (Article XIII)
- [ ] T112 UX: Verify visual feedback appears <100ms after interaction (SC-007) in tests/integration/button-states.test.js
- [ ] T113 Code cleanup and refactoring across all new modules
- [ ] T114 Run quickstart.md validation to verify all features work end-to-end

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2)
- **Polish (Phase 8)**: Depends on user stories being complete (especially US3 for interaction logging)

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - Uses existing navigation-handler.js from Phase 4, independently testable
- **User Story 3 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories, but will be used by US1 and US2 for role-based filtering
- **User Story 4 (P2)**: Can start after Foundational (Phase 2) - Uses button state manager, independently testable
- **User Story 5 (P2)**: Can start after Foundational (Phase 2) - Extends existing pagination from Phase 4, independently testable

**Note**: User Stories 1, 2, and 3 can proceed in parallel after Foundational phase. User Stories 4 and 5 can proceed in parallel after Foundational phase, but may benefit from US3's role filtering.

### Within Each User Story

- Tests (if included) MUST be written and FAIL before implementation
- Models/entities before services
- Services before integration
- Core implementation before error handling and logging
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes:
  - User Stories 1, 2, and 3 can start in parallel (P1 stories)
  - User Stories 4 and 5 can start in parallel (P2 stories)
- All tests for a user story marked [P] can run in parallel
- Models/services within a story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 3 (Role-Based Access)

```bash
# Launch all tests for User Story 3 together:
Task: "Integration test for admin user seeing additional management buttons"
Task: "Integration test for regular user seeing only user-facing options"
Task: "Integration test for admin-only buttons disabled for regular users"
Task: "Unit test for getUserRole() with caching and fail-safe"
Task: "Unit test for filterMenuItemsByRole()"

# Launch parallel implementation tasks:
Task: "Create role-filter.js with getUserRole() method"
Task: "Implement Redis caching for role lookups"
Task: "Implement filterMenuItemsByRole() method"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Responsive Dynamic Layout)
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

**MVP Delivers**: Basic responsive keyboard layouts (1-3: 1 row, 4-6: 2 rows, 7-9: 3 rows) with pagination at 10+ items and label truncation.

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo (Fixed Navigation)
4. Add User Story 3 → Test independently → Deploy/Demo (Role-Based Access)
5. Add User Story 4 → Test independently → Deploy/Demo (Visual Feedback)
6. Add User Story 5 → Test independently → Deploy/Demo (Pagination)
7. Polish → Test all features → Deploy/Demo (Complete)

Each story adds value without breaking previous stories.

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (Responsive Layouts)
   - Developer B: User Story 2 (Fixed Navigation)
   - Developer C: User Story 3 (Role-Based Access)
3. After P1 stories complete:
   - Developer A: User Story 4 (Visual Feedback)
   - Developer B: User Story 5 (Pagination)
4. Stories complete and integrate independently

### Critical Path

**Fastest Path to MVP**:

1. Setup (Phase 1): ~30 minutes
2. Foundational (Phase 2): ~1 hour (database migration, verification)
3. User Story 1 (Phase 3): ~2-3 hours (tests + implementation)
   **Total MVP Time**: ~4 hours

**Full Feature Path**:

- P1 Stories (US1, US2, US3): Can be done in parallel, ~6-8 hours total
- P2 Stories (US4, US5): Can be done in parallel, ~4-6 hours total
- Polish (Phase 8): ~2-3 hours
  **Total Feature Time**: ~12-17 hours

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Extend existing Phase 4 keyboard builder rather than replacing
- Maintain backward compatibility with existing keyboard functionality
- All user-facing messages must be in Indonesian language (Article XIII)
