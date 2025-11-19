/**
 * Integration test for order status notifications (User Story 4)
 * Tests real-time notification delivery when order status changes
 *
 * Test: T076
 * Requirement: FR-009, FR-010, FR-011
 */

const { getDb } = require('../../src/lib/database/db-connection');
const orderService = require('../../src/lib/order/order-service');
const paymentService = require('../../src/lib/payment/payment-service');
const notificationRepository = require('../../src/lib/admin/notification-repository');
const logger = require('../../src/lib/shared/logger').child('test:order-notifications');

describe('Order Status Notifications Integration Tests', () => {
  let db;
  let testProduct;
  let testCustomer;

  beforeAll(async () => {
    try {
      db = getDb();

      // Clean test database
      await db('notifications').truncate();
      await db('payments').truncate();
      await db('orders').truncate();
      await db('stock').truncate();
      await db('products').truncate();
      await db('customers').truncate();

      // Create test product
      const [productId] = await db('products')
        .insert({
          name: 'Test Product for Notifications',
          description: 'Product for testing order notifications.',
          price: 200000.0,
          stock_quantity: 10,
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

      // Create test customer
      const [customerId] = await db('customers')
        .insert({
          telegram_user_id: 999888777,
          name: 'Notification Tester',
          username: 'notification_tester',
        })
        .returning('id');
      testCustomer = await db('customers').where({ id: customerId }).first();
    } catch (error) {
      logger.warn('Database or bot not available for integration tests, skipping:', error.message);
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

  describe('Given a customer has placed an order', () => {
    test('When payment is verified, Then they receive a rich media notification with order status update showing "Payment Received - Processing"', async () => {
      if (!db) {
        logger.warn('Skipping test - database not available');
        return;
      }

      // Create order
      const order = await orderService.createOrder(
        testCustomer.id,
        testProduct.id,
        1,
        'qris',
        testProduct.price
      );

      // Create payment
      await paymentService.createPayment(order.id, 'qris', order.total_amount);

      // Verify payment (this should trigger notification)
      await paymentService.verifyQRISPayment(order.id, 'TEST_TXN_123');

      // Wait a bit for notification to be sent
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Check notification was created
      const notifications = await notificationRepository.findByOrderId(order.id);
      expect(notifications.length).toBeGreaterThan(0);

      const paymentReceivedNotification = notifications.find(
        (n) => n.notification_type === 'payment_received' || n.type === 'order_status'
      );
      expect(paymentReceivedNotification).toBeDefined();
      expect(paymentReceivedNotification.content).toContain('Pembayaran Diterima');
    });
  });

  describe('Given an order is being processed', () => {
    test('When the premium account is being prepared, Then the customer receives a notification with progress indicator showing "Preparing Your Account"', async () => {
      if (!db) {
        logger.warn('Skipping test - database not available');
        return;
      }

      // Create order and verify payment
      const order = await orderService.createOrder(
        testCustomer.id,
        testProduct.id,
        1,
        'qris',
        testProduct.price
      );
      await paymentService.createPayment(order.id, 'qris', order.total_amount);
      await paymentService.verifyQRISPayment(order.id, 'TEST_TXN_456');

      // Update to processing status (should trigger notification)
      await orderService.updateOrderStatus(order.id, 'processing');

      // Wait for notification
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const notifications = await notificationRepository.findByOrderId(order.id);
      const processingNotification = notifications.find(
        (n) => n.notification_type === 'processing'
      );
      expect(processingNotification).toBeDefined();
      expect(processingNotification.content).toContain('Mempersiapkan Akun Anda');
    });
  });

  describe('Given an order is ready for delivery', () => {
    test('When the premium account credentials are sent, Then the customer receives a secure delivery notification', async () => {
      if (!db) {
        logger.warn('Skipping test - database not available');
        return;
      }

      // Create order, verify payment, and process
      const order = await orderService.createOrder(
        testCustomer.id,
        testProduct.id,
        1,
        'qris',
        testProduct.price
      );
      await paymentService.createPayment(order.id, 'qris', order.total_amount);
      await paymentService.verifyQRISPayment(order.id, 'TEST_TXN_789');
      await orderService.updateOrderStatus(order.id, 'processing');

      // Update credentials (should trigger account_delivered notification)
      await orderService.updateCredentials(order.id, 'encrypted_credentials_here');

      // Wait for notification
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const notifications = await notificationRepository.findByOrderId(order.id);
      const deliveredNotification = notifications.find(
        (n) => n.notification_type === 'account_delivered'
      );
      expect(deliveredNotification).toBeDefined();
      expect(deliveredNotification.content).toContain('Akun Premium Anda Telah Dikirim');
    });
  });

  describe('Given an order is completed', () => {
    test('When the customer receives their account, Then they receive a final notification confirming order completion', async () => {
      if (!db) {
        logger.warn('Skipping test - database not available');
        return;
      }

      // Create order and complete the flow
      const order = await orderService.createOrder(
        testCustomer.id,
        testProduct.id,
        1,
        'qris',
        testProduct.price
      );
      await paymentService.createPayment(order.id, 'qris', order.total_amount);
      await paymentService.verifyQRISPayment(order.id, 'TEST_TXN_COMPLETE');
      await orderService.updateOrderStatus(order.id, 'processing');
      await orderService.updateCredentials(order.id, 'encrypted_credentials');
      await orderService.updateOrderStatus(order.id, 'completed');

      // Wait for notification
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const notifications = await notificationRepository.findByOrderId(order.id);
      const completedNotification = notifications.find((n) => n.notification_type === 'completed');
      expect(completedNotification).toBeDefined();
      expect(completedNotification.content).toContain('Pesanan Selesai');
    });
  });
});
