<!--
Sync Impact Report:
Version change: 1.1.0 → 1.2.0
Modified principles:
  - Article X (Code Quality Standards): Expanded with ESLint standards, naming conventions, code style enforcement
  - Article III (Test-First Imperative): Enhanced with test organization patterns, test isolation, coverage requirements
  - Article XI (Performance and Efficiency): Expanded with specific performance metrics, optimization practices, resource monitoring
  - Article XIII (User Experience): Enhanced with design system consistency principles, accessibility requirements
Added sections:
  - Article XIV (Technical Decision Governance): New section on how principles guide technical decisions
  - Enhanced Development Workflow & Quality Gates with specific code quality gates
  - Enhanced Governance section with technical decision-making framework
Removed sections: None
Templates requiring updates:
  ✅ plan-template.md - Constitution Check section already present, compatible with new governance
  ✅ spec-template.md - Generic template, compatible with enhanced testing and quality standards
  ✅ tasks-template.md - Generic template, compatible with enhanced testing and quality requirements
Follow-up TODOs: None
-->

# Storebot Constitution

## Core Principles

### Article I: Library-First Principle

Core bot functionalities MUST be implemented as modular libraries. Each library MUST be self-contained, independently testable, and clearly documented. Libraries MUST have a clear, specific purpose—no organizational-only libraries permitted. This ensures reusability, maintainability, and clear separation of concerns across the bot's architecture.

### Article III: Test-First Imperative (NON-NEGOTIABLE)

All features MUST have comprehensive test scenarios written and approved BEFORE implementation begins. The Test-Driven Development (TDD) cycle is strictly enforced: Tests written → User approved → Tests fail → Then implement → Refactor. This ensures that every feature is validated against clear acceptance criteria from the start, reducing defects and improving code quality.

**Testing Standards & Best Practices**:

- **Test Organization**: Tests MUST be organized by API routes or feature modules using nested `describe` blocks for clear mapping between failures and code areas
- **Test Isolation**: Each test MUST be self-contained and create its own test data. Tests MUST NOT depend on data from other tests to prevent domino effects
- **Test Naming**: Test descriptions MUST follow "Given [state], When [action], Then [outcome]" pattern or equivalent clear structure
- **Test Coverage**: Unit tests are REQUIRED for core functionality and business logic. Integration tests are REQUIRED for all external API interactions (Telegram, payment gateways). Contract tests are REQUIRED for webhook endpoints
- **Test Data**: Use random or unique suffixes for fields with unique constraints (e.g., `externalIdentifier: 'id-${getShortUnique()}'`) to prevent test collisions
- **Test Cleanup**: All mocks, stubs, and test data MUST be cleaned up in `afterEach` or `afterAll` hooks. Redis connections and other external resources MUST be properly closed
- **Test Execution**: Tests MUST be written for frequent execution. Integration tests MUST use real Telegram Bot API (Article IX). Tests MUST not hang or leave open handles

### Article VII: Simplicity

The initial implementation MUST consist of a maximum of 10 main modules. This constraint enforces the YAGNI (You Aren't Gonna Need It) principle and prevents premature complexity. Additional modules may be added only when justified by concrete requirements and documented in the Complexity Tracking section of implementation plans.

### Article VIII: Anti-Abstraction

The bot MUST use the Telegram Bot API directly without unnecessary wrapper libraries or abstraction layers. This principle ensures transparency, reduces dependencies, and maintains direct control over API interactions. Exceptions are permitted only for well-established, minimal libraries that provide essential functionality (e.g., database drivers, HTTP clients) where direct implementation would be impractical. The architecture MUST be extensible so that new integrations (e.g., additional payment gateways, notification channels) can be added without breaking existing ones. Provider-specific logic MUST be isolated behind well-defined interfaces to maintain modularity.

### Article IX: Integration-First Testing

Testing MUST use the real Telegram Bot API, not mocks or stubs. Integration tests that interact with actual Telegram endpoints are mandatory for validating bot behavior. This ensures that the bot works correctly in production conditions and catches API-specific issues early. Unit tests may supplement integration tests but cannot replace them.

**Integration Testing Standards**:

- Integration tests MUST start the web server in the same process when testing API endpoints to enable advanced testing capabilities
- Test environment MUST be properly isolated with cleanup procedures
- External service interactions (Telegram API, payment gateways) MUST be tested in integration tests, not unit tests

### Article X: Code Quality Standards

Core implementation MUST prioritize maintainability and correctness. Comprehensive error handling MUST be implemented for all bot operations and external integrations. Structured logging MUST support debugging and basic monitoring. Unit tests are REQUIRED for core functionality and business logic invariants. Integration tests are REQUIRED for Telegram API interactions, payment gateway flows, and database operations. Public APIs and library interfaces MUST be documented and kept in sync with behavior. Code quality regressions are treated as defects and MUST be addressed before release.

**Code Quality Enforcement**:

- **ESLint Configuration**: ESLint MUST be configured with Node.js-specific plugins (`eslint-plugin-node`, `eslint-plugin-security`) to detect faulty patterns and security vulnerabilities. ESLint errors MUST block commits via pre-commit hooks
- **Code Formatting**: Prettier MUST be used for consistent code formatting. Formatting violations MUST be auto-fixed before commits. Formatting MUST be verified in CI/CD pipelines
- **Naming Conventions**:
  - Classes and services: PascalCase with descriptive names (e.g., `UserAuthenticationService`, not `UsrSvc`)
  - Methods: camelCase with clear action verbs (e.g., `authenticateWithCredentials`, not `auth`)
  - Constants: UPPER_SNAKE_CASE (e.g., `MAX_LOGIN_ATTEMPTS`, `SESSION_TIMEOUT_MS`)
  - Boolean variables: Prefix with `is`/`has`/`should` (e.g., `isUserActive`, `hasPermission`)
- **Statement Separation**: Statements MUST be properly separated. Automatic semicolon insertion issues MUST be avoided using ESLint/Prettier
- **Native Methods**: Prefer native JavaScript methods (e.g., `Array.map`, `Array.filter`) over library equivalents (Lodash, Underscore) when possible for better performance
- **Error Handling**: All async operations MUST have proper error handling. Unhandled promise rejections MUST be caught and logged
- **Code Review**: All code MUST pass ESLint checks and maintain minimum test coverage before merge

### Article XI: Performance and Efficiency

The bot MUST use resources efficiently while providing a responsive user experience. Database queries MUST be optimized with proper indexing and connection pooling. Response times MUST meet specified performance goals (e.g., notification delivery within 10 seconds). Caching SHOULD be used for repeated operations when correctness allows (e.g., product catalog, store configuration). Async operations MUST be used to keep the bot non-blocking where possible. Resource usage MUST be monitored and optimized for scalability targets (e.g., 1000+ concurrent interactions).

**Performance Requirements**:

- **Response Times**: User-facing operations MUST respond within performance goals (e.g., notification delivery ≤ 10 seconds per FR-090). Critical paths MUST be optimized for sub-second response where possible
- **Database Optimization**:
  - All queries MUST use proper indexes. Query performance MUST be validated during development
  - Connection pooling MUST be used for all database connections
  - Transaction management MUST ensure atomicity without unnecessary locks
- **Caching Strategy**:
  - Redis caching MUST be used for frequently accessed data (payment methods, product catalogs) with appropriate TTL
  - Cache invalidation MUST be handled correctly to prevent stale data
  - Cache operations MUST have timeout protection to prevent hanging
- **Algorithm Complexity**: Algorithms MUST have documented complexity analysis. Critical paths MUST be optimized (e.g., O(n) for layout algorithms). Nested loops and recursive calls MUST be justified
- **Resource Monitoring**: Memory usage, CPU utilization, and connection pool sizes MUST be monitored. Resource leaks (open handles, unclosed connections) MUST be prevented
- **Environment Configuration**: `NODE_ENV` MUST be set appropriately (production/development/test). Production optimizations MUST be enabled when `NODE_ENV=production`
- **Async Operations**: All I/O operations (database, HTTP, file system) MUST be asynchronous to prevent blocking

### Article XII: Security First

Security requirements are non-negotiable across all features. API keys, tokens, and secrets MUST be stored securely and never hard-coded. Credentials MUST NOT be written to logs, error messages, or telemetry. Input validation and sanitization MUST be applied to all external input (user messages, webhook callbacks, admin commands). Rate limiting or equivalent safeguards MUST exist to prevent abusive usage. All communication with external services (Telegram API, payment gateways, databases) MUST use secure transport (HTTPS/TLS). HMAC verification MUST be implemented for payment webhook callbacks. Admin authentication MUST be enforced for all administrative operations.

### Article XIII: User Experience

The bot user experience is a first-class product surface. It MUST be intuitive for both new and returning customers. Interactive elements (inline keyboards, media groups) MUST provide clear, discoverable options. Error messages MUST be user-friendly and in Indonesian language. UX regressions are treated as defects and MUST be addressed before release. Rich media UI/UX requirements MUST be maintained consistently across all user interactions (browsing, checkout, notifications).

**User Experience Consistency Standards**:

- **Design System Principles**: UI components MUST follow consistent patterns across all interactions. Inline keyboards MUST use balanced layouts with consistent navigation (Home/Back) patterns
- **Message Consistency**: All user-facing messages MUST maintain the FRIDAY persona voice and tone. Messages MUST be in Indonesian language with consistent terminology
- **Interactive Elements**: Inline keyboards MUST be organized using responsive layout algorithms (3x3x2, 3x2x2 patterns). Pagination MUST be implemented for menus with >9 items
- **Error Messages**: Error messages MUST be user-friendly, actionable, and in Indonesian. Technical errors MUST not be exposed to end users
- **Accessibility**: Interactive elements MUST be clearly labeled and discoverable. Navigation paths MUST be predictable and consistent
- **Visual Consistency**: Media groups, product cards, and notifications MUST use consistent formatting and styling
- **Performance Impact on UX**: Slow operations MUST provide feedback to users. Loading states and progress indicators MUST be implemented where appropriate

### Article XIV: Technical Decision Governance

All technical decisions MUST be guided by these constitutional principles. When making implementation choices, teams MUST evaluate options against the principles and document the rationale for any deviations.

**Decision-Making Framework**:

1. **Principle Alignment**: Before adopting a new library, framework, or pattern, evaluate it against Articles I (Library-First), VIII (Anti-Abstraction), and X (Code Quality)
2. **Testing Requirements**: All new code MUST comply with Article III (Test-First) and Article IX (Integration-First). Test coverage MUST be maintained or improved
3. **Performance Impact**: New features MUST meet performance goals in Article XI. Performance regressions MUST be justified and documented
4. **Security Review**: Security implications MUST be reviewed per Article XII before introducing new dependencies or patterns
5. **UX Consistency**: User-facing changes MUST maintain consistency per Article XIII. UX changes MUST be tested through the bot interface
6. **Documentation**: All technical decisions that deviate from standard patterns MUST be documented in implementation plans with justification
7. **Code Review Gate**: All code reviews MUST verify compliance with relevant articles. Non-compliance MUST block merge

**When Principles Conflict**:

- Security (Article XII) takes precedence over performance or convenience
- User Experience (Article XIII) takes precedence over developer convenience
- Test-First (Article III) takes precedence over implementation speed
- When multiple valid approaches exist, choose the simpler one (Article VII)

## Additional Constraints

### Language & Localization

- **Indonesian language interface only**: All user-facing messages, commands, and responses MUST be in Indonesian (Bahasa Indonesia). No multi-language support in the initial implementation.

### Database Integration

- **MySQL/PostgreSQL database integration required**: The bot MUST support both MySQL and PostgreSQL databases. Database abstraction MUST allow switching between these databases without code changes. Connection pooling and transaction management are mandatory.

### Payment Gateway

- **QRIS payment gateway integration with manual fallback**: The bot MUST integrate with QRIS (Quick Response Code Indonesian Standard) payment gateway for automated payment processing. A manual fallback mechanism MUST be available for cases where QRIS integration fails or is unavailable. Payment verification and reconciliation MUST be secure and auditable.

### User Interface & Experience

- **Rich media UI/UX with inline keyboards and media groups**: The bot MUST utilize Telegram's rich media capabilities including inline keyboards, media groups, and interactive elements to provide an engaging user experience. Text-only interfaces are insufficient—visual and interactive elements are required.

### Security Requirements

- **Security-first approach for premium account delivery**: All premium account credentials and sensitive data MUST be encrypted at rest and in transit. Access controls MUST be implemented to prevent unauthorized access to premium accounts. Audit logging for all premium account access and delivery operations is mandatory. Secure credential storage and delivery mechanisms MUST be validated before production deployment.

## Development Workflow & Quality Gates

### Feature Development Process

1. **Specification**: Feature requirements documented with user stories, acceptance criteria, and test scenarios
2. **Test Creation**: Comprehensive test scenarios written and approved (Article III)
3. **Test Execution**: Tests run and verified to fail (Red phase)
4. **Implementation**: Feature implemented to pass tests (Green phase)
5. **Refactoring**: Code improved while maintaining test coverage (Refactor phase)
6. **Integration Testing**: Real Telegram API integration tests executed (Article IX)
7. **Code Quality Checks**: ESLint, Prettier, and test coverage verification (Article X)
8. **Performance Validation**: Performance goals verified (Article XI)
9. **UX Testing**: User experience validated through bot interface (Article XIII)
10. **Review**: Code review with constitution compliance verification

### Constitution Compliance Gates

The following workflow and gates are REQUIRED for all changes:

- All implementation plans MUST include a Constitution Check section
- The plan's "Constitution Check" section MUST explicitly reference any deviations from principles and justify them
- Violations of core principles MUST be documented in Complexity Tracking with justification
- New modules beyond the 4-module limit (Article VII) require explicit approval and documentation
- All tests MUST use real Telegram API (Article IX) before feature completion
- Tests defined by the plan and spec MUST be implemented or explicitly deferred with rationale before feature completion
- UX-impacting changes MUST be exercised through the bot interface and evaluated against Article XIII (User Experience)
- Security, performance, and quality considerations MUST be included in checklists and task breakdowns for relevant features

### Code Quality Gates

- **Pre-commit Hooks**: ESLint and Prettier checks MUST pass before commits are allowed. Formatting MUST be auto-fixed
- **Test Coverage**: All new code MUST maintain or improve test coverage. Coverage thresholds MUST be enforced
- **Open Handles**: Tests MUST not leave open handles (Redis connections, timeouts, etc.). `--detectOpenHandles` MUST pass
- **Performance Benchmarks**: Critical algorithms MUST have documented complexity analysis. Performance regressions MUST be justified
- **Security Scan**: New dependencies MUST be reviewed for security vulnerabilities. Credentials MUST not be committed

### Code Review Requirements

- Verify test-first approach was followed (Article III)
- Confirm library modularity and independence (Article I)
- Validate direct Telegram API usage (Article VIII)
- Check integration test coverage with real API (Article IX)
- Review module count against simplicity constraint (Article VII)
- Validate Indonesian language usage in user-facing content
- Verify security measures for premium account handling (Article XII)
- Confirm error handling and logging implementation (Article X)
- Review performance considerations and resource usage (Article XI)
- Evaluate user experience quality and consistency (Article XIII)
- **Code Quality**: Verify ESLint compliance, naming conventions, and code style (Article X)
- **Test Quality**: Verify test organization, isolation, and cleanup (Article III)
- **Technical Decisions**: Verify alignment with Article XIV (Technical Decision Governance)

## Governance

This constitution supersedes all other development practices and guidelines. All code, features, and architectural decisions MUST comply with these principles.

### Amendment Procedure

- Amendments require documentation of the rationale and impact assessment
- Any proposed amendment to this constitution MUST:
  - Be documented as a change proposal referencing the current version
  - Specify impact on existing behavior, tests, and documentation
  - Include a migration or adoption plan where applicable
- Version increments follow semantic versioning:
  - **MAJOR**: Backward incompatible governance/principle removals or redefinitions
  - **MINOR**: New principle/section added or materially expanded guidance
  - **PATCH**: Clarifications, wording, typo fixes, non-semantic refinements
- All amendments MUST be reflected in the Sync Impact Report at the top of this document
- Dependent templates and documentation MUST be updated to maintain consistency

### Compliance Review

- All pull requests and code reviews MUST verify compliance with all articles (I, III, VII, VIII, IX, X, XI, XII, XIII, XIV) and the Development Workflow & Quality Gates section
- Complexity beyond stated limits MUST be justified in implementation plans
- Regular reviews of constitution adherence SHOULD be performed regularly (at least once per release) to ensure that active code, templates, and documentation align with this constitution
- Use implementation plans and feature specifications for runtime development guidance

### Technical Decision-Making Authority

- Article XIV (Technical Decision Governance) provides the framework for all technical decisions
- When principles conflict, the precedence order is: Security > User Experience > Test-First > Simplicity
- All technical decisions that affect multiple modules or introduce new patterns MUST be reviewed against all relevant articles
- Deviation from principles MUST be documented with justification in implementation plans

**Version**: 1.2.0 | **Ratified**: 2025-11-19 | **Last Amended**: 2025-01-27
