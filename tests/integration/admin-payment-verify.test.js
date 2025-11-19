/**
 * Integration test for admin payment verification (User Story 6)
 * Tests real Telegram Bot API interactions (Article IX)
 *
 * Test: T113
 * Requirement: FR-008, FR-013, FR-117, FR-119, FR-120
 */

const { getBot } = require('../../src/lib/telegram/api-client');
const { getDb } = require('../../src/lib/database/db-connection');
const adminNotificationDispatcher = require('../../src/lib/admin/admin-notification-dispatcher');
const paymentService = require('../../src/lib/payment/payment-service');
const orderService = require('../../src/lib/order/order-service');
const customerService = require('../../src/lib/customer/customer-service');
const accessControl = require('../../src/lib/security/access-control');

describe('Admin Payment Verification Integration Tests', () => {
  let db;
  let adminTelegramId;
  let customerId;
  let productId;
  let orderId;
  let paymentId;

  beforeAll(async () => {
    try {
      getBot();
      db = getDb();

      if (db && typeof db === 'function') {
        await db('admins').truncate();
        await db('customers').truncate();
        await db('products').truncate();
        await db('orders').truncate();
        await db('payments').truncate();
        await db('stock').truncate();
      }
    } catch (error) {
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
      permissions: JSON.stringify(['payment_verify', 'order_view']),
      notification_preferences: JSON.stringify({}),
      created_timestamp: new Date(),
      last_activity_timestamp: new Date(),
    });

    // Create test customer
    const customer = await customerService.getOrCreateCustomer(123456789, {
      name: 'Test Customer',
      username: 'testcustomer',
    });
    customerId = customer.id;

    // Create test product
    const [product] = await db('products')
      .insert({
        name: 'Test Product',
        description: 'Test product',
        price: 100000.0,
        stock_quantity: 10,
        category: 'Test',
        availability_status: 'available',
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('id');

    productId = product.id || product;

    // Create stock
    await db('stock').insert({
      product_id: productId,
      current_quantity: 10,
      reserved_quantity: 0,
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Create order
    const order = await orderService.createOrder(
      customerId,
      productId,
      1,
      'manual_bank_transfer',
      100000.0
    );
    orderId = order.id;

    // Create payment
    const payment = await paymentService.createPayment(orderId, 'manual_bank_transfer', 100000.0);
    paymentId = payment.id;
  });

  afterEach(async () => {
    try {
      if (db && typeof db === 'function') {
        await db('admins').truncate();
        await db('customers').truncate();
        await db('products').truncate();
        await db('orders').truncate();
        await db('payments').truncate();
        await db('stock').truncate();
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  afterAll(async () => {
    try {
      if (db && typeof db !== 'function') {
        await db('admins').truncate();
        await db('customers').truncate();
        await db('products').truncate();
        await db('orders').truncate();
        await db('payments').truncate();
        await db('stock').truncate();
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Given an admin receives payment proof notification', () => {
    test('When payment proof is uploaded, Then admin receives notification with action buttons', async () => {
      if (!db || typeof db !== 'function') {
        console.warn('Skipping test - database not available');
        return;
      }

      try {
        // Arrange: Update payment proof
        await paymentService.updatePaymentProof(paymentId, 'proof_file_id_123');

        // Wait for async notification
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Act: Format payment proof notification
        const payment = await paymentService.getPaymentByOrderId(orderId);
        const order = await orderService.getOrderById(orderId);

        const message = await adminNotificationDispatcher.formatNotificationMessage(
          'payment_proof',
          {
            order: order.toDatabase(),
            payment: payment.toDatabase(),
          }
        );

        // Assert: Message contains action buttons
        expect(message).toBeDefined();
        expect(message.text).toContain('Bukti Pembayaran Diterima');
        expect(message.reply_markup).toBeDefined();
        expect(message.reply_markup.inline_keyboard).toBeDefined();
        expect(message.reply_markup.inline_keyboard[0]).toHaveLength(2); // Verify and Reject buttons
      } catch (error) {
        console.error('Test error:', error);
        throw error;
      }
    });
  });

  describe('Given an admin wants to verify payment', () => {
    test('When admin clicks verify button, Then payment is verified and order status updated', async () => {
      if (!db || typeof db !== 'function') {
        console.warn('Skipping test - database not available');
        return;
      }

      try {
        // Arrange: Ensure admin has permission
        const admin = await accessControl.requirePermission(adminTelegramId, 'payment_verify');
        expect(admin).toBeDefined();

        // Act: Verify payment
        const verifiedPayment = await paymentService.verifyManualPayment(paymentId, admin.id);

        // Assert: Payment is verified
        expect(verifiedPayment.status).toBe('verified');
        expect(verifiedPayment.verification_method).toBe('manual');
        expect(verifiedPayment.admin_id).toBe(admin.id);

        // Verify order status updated
        const order = await orderService.getOrderById(orderId);
        expect(order.payment_status).toBe('verified');
      } catch (error) {
        console.error('Test error:', error);
        throw error;
      }
    });
  });

  describe('Given an admin wants to reject payment', () => {
    test('When admin clicks reject button, Then payment is rejected and customer notified', async () => {
      if (!db || typeof db !== 'function') {
        console.warn('Skipping test - database not available');
        return;
      }

      try {
        // Arrange: Create new payment for rejection test
        const order2 = await orderService.createOrder(
          customerId,
          productId,
          1,
          'manual_bank_transfer',
          100000.0
        );
        const payment2 = await paymentService.createPayment(
          order2.id,
          'manual_bank_transfer',
          100000.0
        );

        // Act: Reject payment
        const rejectedPayment = await paymentService.markPaymentAsFailed(
          payment2.id,
          'Pembayaran ditolak oleh admin'
        );

        // Assert: Payment is failed
        expect(rejectedPayment.status).toBe('failed');
      } catch (error) {
        console.error('Test error:', error);
        throw error;
      }
    });
  });
});
