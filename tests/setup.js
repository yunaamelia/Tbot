/**
 * Jest test setup
 * Configure test environment and global test utilities
 */

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

