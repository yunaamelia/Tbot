/**
 * Jest test setup
 * Configure test environment and global test utilities
 */

// Set test environment variables BEFORE any imports
process.env.NODE_ENV = 'test';
process.env.TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'TEST_BOT_TOKEN_123456789';
process.env.DB_CLIENT = process.env.DB_CLIENT || 'sqlite3';
process.env.DB_NAME = process.env.DB_NAME || ':memory:';
process.env.DB_USER = process.env.DB_USER || 'test';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'test';
process.env.DB_HOST = process.env.DB_HOST || 'localhost';
process.env.DB_PORT = process.env.DB_PORT || '5432';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379/1';

// Increase timeout for integration tests
jest.setTimeout(30000);

// Suppress console logs during tests unless DEBUG is set
if (!process.env.DEBUG) {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}
