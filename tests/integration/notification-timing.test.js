/**
 * Integration test for notification delivery timing (User Story 4)
 * Tests that notifications are delivered within 10 seconds of status change
 *
 * Test: T077
 * Requirement: FR-090
 */

const { getDb } = require('../../src/lib/database/db-connection');
const orderService = require('../../src/lib/order/order-service');
const paymentService = require('../../src/lib/payment/payment-service');
const notificationRepository = require('../../src/lib/admin/notification-repository');
const logger = require('../../src/lib/shared/logger').child('test:notification-timing');

const DELIVERY_TIMEOUT_MS = 10000; // 10 seconds (FR-090)

describe('Notification Delivery Timing Integration Tests', () => {
  let db;
  let testProduct;
  let testCustomer;

  beforeAll(async () => {
    try {
      db = getDb();

      await db('notifications').truncate();
      await db('payments').truncate();
      await db('orders').truncate();
      await db('stock').truncate();
      await db('products').truncate();
      await db('customers').truncate();

      const [productId] = await db('products')
        .insert({
          name: 'Timing Test Product',
          description: 'Product for testing notification timing.',
          price: 150000.0,
          stock_quantity: 5,
          category: 'Test',
          availability_status: 'available',
        })
        .returning('id');
      testProduct = await db('products').where({ id: productId }).first();

      await db('stock').insert({
        product_id: testProduct.id,
        current_quantity: testProduct.stock_quantity,
        reserved_quantity: 0,
      });

      const [customerId] = await db('customers')
        .insert({
          telegram_user_id: 888777666,
          name: 'Timing Tester',
          username: 'timing_tester',
        })
        .returning('id');
      testCustomer = await db('customers').where({ id: customerId }).first();
    } catch (error) {
      logger.warn('Database not available for integration tests, skipping:', error.message);
      db = null;
    }
  });

  afterAll(async () => {
    try {
      if (db) {
        await db('notifications').truncate();
        await db('payments').truncate();
        await db('orders').truncate();
        await db('stock').truncate();
        await db('products').truncate();
        await db('customers').truncate();
      }
    } catch (error) {
      logger.warn('Error during cleanup:', error.message);
    }
  });

  describe('Given an order status changes', () => {
    test('When payment is verified, Then notification is delivered within 10 seconds (FR-090)', async () => {
      if (!db) {
        logger.warn('Skipping test - database not available');
        return;
      }

      const order = await orderService.createOrder(
        testCustomer.id,
        testProduct.id,
        1,
        'qris',
        testProduct.price
      );
      await paymentService.createPayment(order.id, 'qris', order.total_amount);

      const startTime = Date.now();
      await paymentService.verifyQRISPayment(order.id, 'TIMING_TEST_TXN');

      // Wait for notification (with timeout)
      const maxWaitTime = DELIVERY_TIMEOUT_MS + 2000; // Add 2s buffer
      let notificationFound = false;
      const checkInterval = 500; // Check every 500ms

      for (let elapsed = 0; elapsed < maxWaitTime; elapsed += checkInterval) {
        await new Promise((resolve) => setTimeout(resolve, checkInterval));

        const notifications = await notificationRepository.findByOrderId(order.id);
        if (notifications.length > 0) {
          notificationFound = true;
          break;
        }
      }

      const deliveryTime = Date.now() - startTime;

      expect(notificationFound).toBe(true);
      expect(deliveryTime).toBeLessThan(DELIVERY_TIMEOUT_MS);
    }, 15000); // Increase test timeout to 15 seconds
  });
});
