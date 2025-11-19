<!--
Sync Impact Report:
Version change: N/A → 1.0.0 (initial constitution)
Modified principles: N/A (new constitution)
Added sections: Core Principles (5 articles), Additional Constraints, Development Workflow, Governance
Removed sections: N/A
Templates requiring updates:
  ✅ plan-template.md - Constitution Check section already present, compatible
  ✅ spec-template.md - Generic template, compatible with test-first principle
  ✅ tasks-template.md - Generic template, compatible with test-first and integration-first principles
  ⚠ pending: No command templates found in .specify/templates/commands/ - may need review if added later
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

The bot MUST use the Telegram Bot API directly without unnecessary wrapper libraries or abstraction layers. This principle ensures transparency, reduces dependencies, and maintains direct control over API interactions. Exceptions are permitted only for well-established, minimal libraries that provide essential functionality (e.g., database drivers, HTTP clients) where direct implementation would be impractical.

### Article IX: Integration-First Testing

Testing MUST use the real Telegram Bot API, not mocks or stubs. Integration tests that interact with actual Telegram endpoints are mandatory for validating bot behavior. This ensures that the bot works correctly in production conditions and catches API-specific issues early. Unit tests may supplement integration tests but cannot replace them.

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

## Development Workflow

### Feature Development Process

1. **Specification**: Feature requirements documented with user stories, acceptance criteria, and test scenarios
2. **Test Creation**: Comprehensive test scenarios written and approved (Article III)
3. **Test Execution**: Tests run and verified to fail (Red phase)
4. **Implementation**: Feature implemented to pass tests (Green phase)
5. **Refactoring**: Code improved while maintaining test coverage (Refactor phase)
6. **Integration Testing**: Real Telegram API integration tests executed (Article IX)
7. **Review**: Code review with constitution compliance verification

### Constitution Compliance Gates

- All implementation plans MUST include a Constitution Check section
- Violations of core principles MUST be documented in Complexity Tracking with justification
- New modules beyond the 4-module limit (Article VII) require explicit approval and documentation
- All tests MUST use real Telegram API (Article IX) before feature completion

### Code Review Requirements

- Verify test-first approach was followed (Article III)
- Confirm library modularity and independence (Article I)
- Validate direct Telegram API usage (Article VIII)
- Check integration test coverage with real API (Article IX)
- Review module count against simplicity constraint (Article VII)
- Validate Indonesian language usage in user-facing content
- Verify security measures for premium account handling

## Governance

This constitution supersedes all other development practices and guidelines. All code, features, and architectural decisions MUST comply with these principles.

### Amendment Procedure

- Amendments require documentation of the rationale and impact assessment
- Version increments follow semantic versioning:
  - **MAJOR**: Backward incompatible governance/principle removals or redefinitions
  - **MINOR**: New principle/section added or materially expanded guidance
  - **PATCH**: Clarifications, wording, typo fixes, non-semantic refinements
- All amendments MUST be reflected in the Sync Impact Report at the top of this document
- Dependent templates and documentation MUST be updated to maintain consistency

### Compliance Review

- All pull requests and code reviews MUST verify constitution compliance
- Complexity beyond stated limits MUST be justified in implementation plans
- Regular reviews of constitution adherence during sprint retrospectives
- Use implementation plans and feature specifications for runtime development guidance

**Version**: 1.0.0 | **Ratified**: 2025-11-19 | **Last Amended**: 2025-11-19
