# Research & Technical Decisions

**Feature**: Premium Account Store Telegram Bot  
**Date**: 2025-11-19  
**Purpose**: Resolve technical clarifications and document architecture decisions

## Language & Runtime Selection

### Decision: Node.js (LTS 20.x or later)

**Rationale**:
- Strong ecosystem for Telegram bot development with mature libraries
- Excellent async/await support for handling concurrent webhook requests
- Rich package ecosystem (npm) for payment gateways, database drivers, encryption
- Good performance for I/O-bound operations (webhooks, database queries, API calls)
- Easy deployment and scaling with PM2 or containerization
- Active community and extensive documentation

**Alternatives Considered**:
- **Python 3.11+**: python-telegram-bot is mature but Node.js ecosystem is more active for Telegram bots. Python better for data processing but not needed here.
- **Go/Rust**: Overkill for this use case, longer development time, smaller Telegram bot ecosystem

**Implementation**: Use Node.js LTS version (20.x or latest stable)

---

## Telegram Bot Library Selection

### Decision: Telegraf.js (minimal wrapper, direct API access)

**Rationale**:
- Minimal abstraction layer - provides convenience methods but allows direct Telegram Bot API access (Article VIII compliance)
- Excellent webhook support with built-in Express/Fastify integration
- Active maintenance and large community
- TypeScript support available (optional)
- Handles rate limiting and retries automatically
- Supports all Telegram Bot API features (inline keyboards, media groups, etc.)

**Alternatives Considered**:
- **Direct HTTP calls to Telegram API**: Too verbose, requires manual rate limiting, error handling, webhook parsing
- **node-telegram-bot-api**: More abstraction, less control over API calls
- **Grammy**: Newer library but smaller community, less battle-tested

**Implementation**: Use Telegraf.js with direct API client access for advanced features

---

## QRIS Payment Gateway Selection

### Decision: Duitku Payment Gateway

**Rationale**:
- Popular QRIS provider in Indonesia with good API documentation
- Supports QRIS automatic verification via webhook callbacks
- Provides payment status polling as fallback
- Good Node.js SDK available
- Supports multiple payment methods (QRIS, bank transfer, e-wallet)
- Reliable infrastructure for Indonesian market

**Alternatives Considered**:
- **Midtrans**: Also popular but more complex setup, better for larger scale
- **OVO**: Limited to OVO wallet, not full QRIS support
- **Xendit**: Good alternative but Duitku has better QRIS focus

**Implementation**: Use Duitku SDK for Node.js with webhook endpoint for automatic verification

---

## Database Abstraction Layer

### Decision: Knex.js Query Builder

**Rationale**:
- Supports both PostgreSQL and MySQL with same query syntax (constitution requirement)
- Lightweight, no heavy ORM overhead
- Allows raw SQL when needed for complex queries
- Good migration system built-in
- Connection pooling support
- Transaction support for order processing
- Easy to switch between PostgreSQL and MySQL via configuration

**Alternatives Considered**:
- **Sequelize**: Heavy ORM, more abstraction than needed
- **TypeORM**: TypeScript-first, adds complexity
- **Prisma**: Modern but requires schema generation, less flexible for dual-database support
- **Raw database drivers**: Too low-level, requires manual abstraction

**Implementation**: Use Knex.js with PostgreSQL as primary, MySQL support via configuration

---

## Testing Framework Selection

### Decision: Jest for Node.js

**Rationale**:
- Standard testing framework for Node.js projects
- Good async/await support
- Mocking capabilities (though Article IX requires real API for integration tests)
- Built-in test runner and coverage reporting
- Works well with Telegraf.js for integration testing
- Can test webhook endpoints easily

**Alternatives Considered**:
- **Mocha/Chai**: More flexible but requires more setup
- **Vitest**: Faster but newer, less ecosystem support
- **Tape**: Minimal but less features

**Implementation**: Use Jest with real Telegram Bot API for integration tests (Article IX)

---

## Session Management & Caching

### Decision: Redis with ioredis client

**Rationale**:
- Fast in-memory storage for session management
- Supports pub/sub for real-time notifications
- Good for caching product data and stock levels
- Reliable with persistence options
- Widely used, well-documented
- ioredis is the most popular Redis client for Node.js

**Alternatives Considered**:
- **In-memory cache**: Lost on restart, not suitable for production
- **Database caching**: Too slow for real-time operations
- **Memcached**: Less features than Redis, no pub/sub

**Implementation**: Use Redis with ioredis for sessions, caching, and pub/sub notifications

---

## Encryption & Security Libraries

### Decision: Node.js crypto module + bcrypt for passwords

**Rationale**:
- Node.js built-in `crypto` module for AES-256 encryption of credentials
- `bcrypt` for admin password hashing (if needed)
- No external dependencies for core encryption
- Industry-standard algorithms
- Good performance

**Alternatives Considered**:
- **External encryption services**: Adds dependency and cost
- **Custom encryption**: Security risk, use proven libraries

**Implementation**: Use Node.js crypto for credential encryption, bcrypt for password hashing

---

## Webhook Server Framework

### Decision: Express.js

**Rationale**:
- Standard Node.js web framework
- Easy integration with Telegraf webhook handler
- Good middleware ecosystem
- Simple to set up HTTPS for webhook endpoint
- Widely used, well-documented

**Alternatives Considered**:
- **Fastify**: Faster but smaller ecosystem
- **Koa**: More modern but less middleware available
- **Native HTTP server**: Too low-level, more code to write

**Implementation**: Use Express.js for webhook endpoint and payment callback endpoints

---

## Backup & Recovery System

### Decision: pg_dump/mysqldump + automated scripts

**Rationale**:
- Native database tools are most reliable
- Can be automated with cron jobs or Node.js scheduler
- Supports incremental backups
- Easy to restore
- No additional dependencies

**Alternatives Considered**:
- **Cloud backup services**: Adds cost and dependency
- **Custom backup solution**: More complex, higher risk

**Implementation**: Use native database dump tools with Node.js scheduler (node-cron) for automation

---

## Summary of Technology Stack

| Component | Technology | Version/Notes |
|-----------|-----------|---------------|
| Runtime | Node.js | LTS 20.x+ |
| Telegram Library | Telegraf.js | Latest stable |
| Database (Primary) | PostgreSQL | 14+ |
| Database (Secondary) | MySQL | 8.0+ |
| Database Abstraction | Knex.js | Latest stable |
| Payment Gateway | Duitku | QRIS API |
| Session/Cache | Redis | 7.0+ with ioredis |
| Web Framework | Express.js | 4.x |
| Testing | Jest | Latest stable |
| Encryption | Node.js crypto | Built-in |
| Backup | pg_dump/mysqldump | Native tools |

---

## Architecture Patterns

### Webhook Pattern
- Telegram sends updates to webhook endpoint
- Express.js receives and routes to Telegraf handler
- Telegraf dispatches to appropriate library module
- Response sent back to Telegram via Bot API

### Payment Verification Pattern
- QRIS: Duitku webhook → automatic verification → order status update
- Manual: Customer uploads proof → admin notification → manual verification → order status update

### Real-time Notification Pattern
- Order status change → Redis pub/sub → notification service → Telegram Bot API
- Admin notifications use same pattern

### Database Abstraction Pattern
- Knex.js queries work for both PostgreSQL and MySQL
- Configuration file switches database type
- Migrations run on both databases identically

---

## Resolved Clarifications

✅ **Language/Version**: Node.js LTS 20.x+  
✅ **Primary Dependencies**: Telegraf.js, Knex.js, Duitku SDK, Express.js, ioredis  
✅ **Testing**: Jest with real Telegram Bot API integration tests  
✅ **Payment Gateway**: Duitku for QRIS integration  
✅ **Database Abstraction**: Knex.js for dual database support

All NEEDS CLARIFICATION items from Technical Context have been resolved.

