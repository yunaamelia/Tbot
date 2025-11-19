<!--
Sync Impact Report:
Version change: 1.0.0 → 1.1.0
Modified principles: Enhanced Article VIII (Anti-Abstraction) with extensibility guidance
Added sections: Article X (Code Quality Standards), Article XI (Performance & Efficiency), Article XII (Security First), Article XIII (User Experience), enhanced Development Workflow with Quality Gates
Removed sections: None
Templates requiring updates:
  ✅ plan-template.md - Constitution Check section already present, compatible
  ✅ spec-template.md - Generic template, compatible with test-first principle
  ✅ tasks-template.md - Generic template, compatible with test-first and integration-first principles
  ✅ agent-file-template.md - Runtime guidance compatible with new quality standards
  ✅ checklist-template.md - Aligns with security/performance/quality checks
Follow-up TODOs: None
-->

# Storebot Constitution

## Core Principles

### Article I: Library-First Principle

Core bot functionalities MUST be implemented as modular libraries. Each library MUST be self-contained, independently testable, and clearly documented. Libraries MUST have a clear, specific purpose—no organizational-only libraries permitted. This ensures reusability, maintainability, and clear separation of concerns across the bot's architecture.

### Article III: Test-First Imperative (NON-NEGOTIABLE)

All features MUST have comprehensive test scenarios written and approved BEFORE implementation begins. The Test-Driven Development (TDD) cycle is strictly enforced: Tests written → User approved → Tests fail → Then implement → Refactor. This ensures that every feature is validated against clear acceptance criteria from the start, reducing defects and improving code quality.

### Article VII: Simplicity

The initial implementation MUST consist of a maximum of 4 main modules. This constraint enforces the YAGNI (You Aren't Gonna Need It) principle and prevents premature complexity. Additional modules may be added only when justified by concrete requirements and documented in the Complexity Tracking section of implementation plans.

### Article VIII: Anti-Abstraction

The bot MUST use the Telegram Bot API directly without unnecessary wrapper libraries or abstraction layers. This principle ensures transparency, reduces dependencies, and maintains direct control over API interactions. Exceptions are permitted only for well-established, minimal libraries that provide essential functionality (e.g., database drivers, HTTP clients) where direct implementation would be impractical. The architecture MUST be extensible so that new integrations (e.g., additional payment gateways, notification channels) can be added without breaking existing ones. Provider-specific logic MUST be isolated behind well-defined interfaces to maintain modularity.

### Article IX: Integration-First Testing

Testing MUST use the real Telegram Bot API, not mocks or stubs. Integration tests that interact with actual Telegram endpoints are mandatory for validating bot behavior. This ensures that the bot works correctly in production conditions and catches API-specific issues early. Unit tests may supplement integration tests but cannot replace them.

### Article X: Code Quality Standards

Core implementation MUST prioritize maintainability and correctness. Comprehensive error handling MUST be implemented for all bot operations and external integrations. Structured logging MUST support debugging and basic monitoring. Unit tests are REQUIRED for core functionality and business logic invariants. Integration tests are REQUIRED for Telegram API interactions, payment gateway flows, and database operations. Public APIs and library interfaces MUST be documented and kept in sync with behavior. Code quality regressions are treated as defects and MUST be addressed before release.

### Article XI: Performance and Efficiency

The bot MUST use resources efficiently while providing a responsive user experience. Database queries MUST be optimized with proper indexing and connection pooling. Response times MUST meet specified performance goals (e.g., notification delivery within 10 seconds). Caching SHOULD be used for repeated operations when correctness allows (e.g., product catalog, store configuration). Async operations MUST be used to keep the bot non-blocking where possible. Resource usage MUST be monitored and optimized for scalability targets (e.g., 1000+ concurrent interactions).

### Article XII: Security First

Security requirements are non-negotiable across all features. API keys, tokens, and secrets MUST be stored securely and never hard-coded. Credentials MUST NOT be written to logs, error messages, or telemetry. Input validation and sanitization MUST be applied to all external input (user messages, webhook callbacks, admin commands). Rate limiting or equivalent safeguards MUST exist to prevent abusive usage. All communication with external services (Telegram API, payment gateways, databases) MUST use secure transport (HTTPS/TLS). HMAC verification MUST be implemented for payment webhook callbacks. Admin authentication MUST be enforced for all administrative operations.

### Article XIII: User Experience

The bot user experience is a first-class product surface. It MUST be intuitive for both new and returning customers. Interactive elements (inline keyboards, media groups) MUST provide clear, discoverable options. Error messages MUST be user-friendly and in Indonesian language. UX regressions are treated as defects and MUST be addressed before release. Rich media UI/UX requirements MUST be maintained consistently across all user interactions (browsing, checkout, notifications).

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
7. **Review**: Code review with constitution compliance verification

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

- All pull requests and code reviews MUST verify compliance with all articles (I, III, VII, VIII, IX, X, XI, XII, XIII) and the Development Workflow & Quality Gates section
- Complexity beyond stated limits MUST be justified in implementation plans
- Regular reviews of constitution adherence SHOULD be performed regularly (at least once per release) to ensure that active code, templates, and documentation align with this constitution
- Use implementation plans and feature specifications for runtime development guidance

**Version**: 1.1.0 | **Ratified**: 2025-11-19 | **Last Amended**: 2025-01-27
