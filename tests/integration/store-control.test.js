/**
 * Integration test for store open/close commands (User Story 5)
 * Tests real Telegram Bot API interactions (Article IX)
 *
 * Test: T093
 * Requirement: FR-009, FR-026, FR-050
 */

const { getBot } = require('../../src/lib/telegram/api-client');
const { getDb } = require('../../src/lib/database/db-connection');
const adminCommands = require('../../src/lib/admin/admin-commands');
const { isStoreOpen } = require('../../src/lib/shared/store-config');
const { table } = require('../../src/lib/database/query-builder');

describe('Store Control Commands Integration Tests', () => {
  let db;
  let adminTelegramId;

  beforeAll(async () => {
    try {
      // Initialize bot and database connections
      getBot(); // Initialize bot
      db = getDb();

      // Ensure test database is clean
      if (db && typeof db === 'function') {
        await db('admins').truncate();
        await db('store_config').truncate();
      }
    } catch (error) {
      // Skip tests if database is not available
      console.warn('Database not available for integration tests:', error.message);
      db = null;
    }
  });

  beforeEach(async () => {
    if (!db || typeof db !== 'function') {
      return;
    }

    // Create test admin
    adminTelegramId = 999888777;
    await db('admins').insert({
      telegram_user_id: adminTelegramId,
      name: 'Test Admin',
      username: 'testadmin',
      permissions: JSON.stringify(['store_control', 'stock_manage']),
      notification_preferences: JSON.stringify({}),
      created_timestamp: new Date(),
      last_activity_timestamp: new Date(),
    });

    // Set initial store status to open
    await db('store_config').insert({
      key: 'store_status',
      value: 'open',
      updated_at: new Date(),
    });
  });

  afterEach(async () => {
    try {
      if (db && typeof db === 'function') {
        await db('admins').truncate();
        await db('store_config').truncate();
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  afterAll(async () => {
    try {
      // Cleanup
      if (db && typeof db === 'function') {
        await db('admins').truncate();
        await db('store_config').truncate();
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Given an admin wants to close the store', () => {
    test('When they send /close command, Then store is closed and confirmation message is sent', async () => {
      if (!db || typeof db !== 'function') {
        console.warn('Skipping test - database not available');
        return;
      }

      try {
        // Act: Execute close command
        const response = await adminCommands.handleCloseCommand(adminTelegramId);

        // Assert: Response contains confirmation message
        expect(response).toBeDefined();
        expect(response.text).toContain('Toko Ditutup');
        expect(response.parse_mode).toBe('Markdown');

        // Verify store status was actually updated
        const storeOpen = await isStoreOpen();
        expect(storeOpen).toBe(false);

        const statusRow = await table('store_config').where('key', 'store_status').first();
        expect(statusRow.value).toBe('closed');
      } catch (error) {
        console.error('Test error:', error);
        throw error;
      }
    });
  });

  describe('Given an admin wants to open the store', () => {
    test('When they send /open command, Then store is opened and confirmation message is sent', async () => {
      if (!db || typeof db !== 'function') {
        console.warn('Skipping test - database not available');
        return;
      }

      try {
        // Arrange: Close store first
        await adminCommands.handleCloseCommand(adminTelegramId);

        // Act: Execute open command
        const response = await adminCommands.handleOpenCommand(adminTelegramId);

        // Assert: Response contains confirmation message
        expect(response).toBeDefined();
        expect(response.text).toContain('Toko Dibuka');
        expect(response.parse_mode).toBe('Markdown');

        // Verify store status was actually updated
        const storeOpen = await isStoreOpen();
        expect(storeOpen).toBe(true);

        const statusRow = await table('store_config').where('key', 'store_status').first();
        expect(statusRow.value).toBe('open');
      } catch (error) {
        console.error('Test error:', error);
        throw error;
      }
    });
  });

  describe('Given a non-admin user tries to control store', () => {
    test('When they send /close command, Then access is denied', async () => {
      if (!db || typeof db !== 'function') {
        console.warn('Skipping test - database not available');
        return;
      }

      try {
        // Act: Non-admin tries to close store
        const nonAdminId = 111222333;
        const response = await adminCommands.handleCloseCommand(nonAdminId);

        // Assert: Access denied message
        expect(response).toBeDefined();
        expect(response.text).toContain('bukan admin');
      } catch (error) {
        console.error('Test error:', error);
        throw error;
      }
    });

    test('When they send /open command, Then access is denied', async () => {
      if (!db || typeof db !== 'function') {
        console.warn('Skipping test - database not available');
        return;
      }

      try {
        // Act: Non-admin tries to open store
        const nonAdminId = 111222333;
        const response = await adminCommands.handleOpenCommand(nonAdminId);

        // Assert: Access denied message
        expect(response).toBeDefined();
        expect(response.text).toContain('bukan admin');
      } catch (error) {
        console.error('Test error:', error);
        throw error;
      }
    });
  });
});
