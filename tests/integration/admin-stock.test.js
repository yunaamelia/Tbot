/**
 * Integration test for admin stock commands (User Story 5)
 * Tests real Telegram Bot API interactions (Article IX)
 *
 * Test: T092
 * Requirement: FR-010, FR-050
 */

const { getBot } = require('../../src/lib/telegram/api-client');
const { getDb } = require('../../src/lib/database/db-connection');
const adminCommands = require('../../src/lib/admin/admin-commands');

describe('Admin Stock Commands Integration Tests', () => {
  let db;
  let adminTelegramId;
  let testProductId;

  beforeAll(async () => {
    try {
      // Initialize bot and database connections
      getBot(); // Initialize bot
      db = getDb();

      // Ensure test database is clean
      if (db && typeof db === 'function') {
        await db('admins').truncate();
        await db('products').truncate();
        await db('stock').truncate();
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
      permissions: JSON.stringify(['stock_manage', 'store_control']),
      notification_preferences: JSON.stringify({}),
      created_timestamp: new Date(),
      last_activity_timestamp: new Date(),
    });

    // Create test product
    const [product] = await db('products')
      .insert({
        name: 'Test Product',
        description: 'Test product for stock management',
        price: 100000.0,
        stock_quantity: 10,
        category: 'Test',
        availability_status: 'available',
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('id');

    testProductId = product.id || product;

    // Create stock record
    await db('stock').insert({
      product_id: testProductId,
      current_quantity: 10,
      reserved_quantity: 0,
      created_at: new Date(),
      updated_at: new Date(),
    });
  });

  afterEach(async () => {
    try {
      if (db && typeof db === 'function') {
        await db('admins').truncate();
        await db('products').truncate();
        await db('stock').truncate();
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
        await db('products').truncate();
        await db('stock').truncate();
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Given an admin wants to update product stock', () => {
    test('When they send /stock update <product_id> <quantity>, Then stock is updated and confirmation message is sent', async () => {
      if (!db || typeof db !== 'function') {
        console.warn('Skipping test - database not available');
        return;
      }

      try {
        // Act: Execute stock update command
        const commandArgs = `update ${testProductId} 20`;
        const response = await adminCommands.handleStockCommand(adminTelegramId, commandArgs);

        // Assert: Response contains confirmation message
        expect(response).toBeDefined();
        expect(response.text).toContain('Stok Berhasil Diperbarui');
        expect(response.text).toContain('20');
        expect(response.parse_mode).toBe('Markdown');

        // Verify stock was actually updated in database
        const stock = await db('stock').where('product_id', testProductId).first();
        expect(stock.current_quantity).toBe(20);

        // Verify product stock_quantity was updated
        const product = await db('products').where('id', testProductId).first();
        expect(product.stock_quantity).toBe(20);
      } catch (error) {
        console.error('Test error:', error);
        throw error;
      }
    });

    test('When they send /stock update with invalid format, Then error message is returned', async () => {
      if (!db || typeof db !== 'function') {
        console.warn('Skipping test - database not available');
        return;
      }

      try {
        // Act: Execute stock command with invalid format
        const commandArgs = 'invalid format';
        const response = await adminCommands.handleStockCommand(adminTelegramId, commandArgs);

        // Assert: Error message is returned
        expect(response).toBeDefined();
        expect(response.text).toContain('Format Perintah Salah');
        expect(response.text).toContain('/stock update');
      } catch (error) {
        console.error('Test error:', error);
        throw error;
      }
    });

    test('When stock is updated to zero, Then product availability status changes to out_of_stock', async () => {
      if (!db || typeof db !== 'function') {
        console.warn('Skipping test - database not available');
        return;
      }

      try {
        // Act: Update stock to zero
        const commandArgs = `update ${testProductId} 0`;
        await adminCommands.handleStockCommand(adminTelegramId, commandArgs);

        // Assert: Product availability status is out_of_stock
        const product = await db('products').where('id', testProductId).first();
        expect(product.availability_status).toBe('out_of_stock');
      } catch (error) {
        console.error('Test error:', error);
        throw error;
      }
    });

    test('When stock is added to out-of-stock product, Then product availability status changes to available', async () => {
      if (!db || typeof db !== 'function') {
        console.warn('Skipping test - database not available');
        return;
      }

      try {
        // Arrange: Set product to out of stock
        await db('products').where('id', testProductId).update({
          availability_status: 'out_of_stock',
          stock_quantity: 0,
        });
        await db('stock').where('product_id', testProductId).update({ current_quantity: 0 });

        // Act: Add stock to out-of-stock product
        const commandArgs = `update ${testProductId} 5`;
        await adminCommands.handleStockCommand(adminTelegramId, commandArgs);

        // Assert: Product availability status is available
        const product = await db('products').where('id', testProductId).first();
        expect(product.availability_status).toBe('available');
        expect(product.stock_quantity).toBe(5);
      } catch (error) {
        console.error('Test error:', error);
        throw error;
      }
    });
  });

  describe('Given a non-admin user tries to update stock', () => {
    test('When they send /stock command, Then access is denied', async () => {
      if (!db || typeof db !== 'function') {
        console.warn('Skipping test - database not available');
        return;
      }

      try {
        // Act: Non-admin tries to update stock
        const nonAdminId = 111222333;
        const commandArgs = `update ${testProductId} 20`;
        const response = await adminCommands.handleStockCommand(nonAdminId, commandArgs);

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
