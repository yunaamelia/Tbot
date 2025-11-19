/**
 * Order service with order creation and status management
 * Uses database transactions for order creation and stock updates (FR-033)
 *
 * Task: T057
 * Requirement: FR-004, FR-025, FR-033
 */

const orderRepository = require('./order-repository');
const stockRepository = require('../product/stock-repository');
const notificationService = require('../admin/notification-service');
const notificationPubSub = require('../admin/notification-pubsub');
const adminNotificationDispatcher = require('../admin/admin-notification-dispatcher');
const { transaction } = require('../database/query-builder');
const Order = require('../../models/order');
const { NotFoundError, ConflictError } = require('../shared/errors');
const logger = require('../shared/logger').child('order-service');

class OrderService {
  /**
   * Create order with stock reservation using database transaction (FR-033)
   * @param {number} customerId Customer ID
   * @param {number} productId Product ID
   * @param {number} quantity Quantity to purchase
   * @param {string} paymentMethod Payment method ('qris' or 'manual_bank_transfer')
   * @param {number} productPrice Product price (to calculate total)
   * @returns {Promise<Order>} Created order
   * @throws {ConflictError} If insufficient stock
   */
  async createOrder(customerId, productId, quantity, paymentMethod, productPrice) {
    try {
      // Use database transaction for atomicity (FR-033)
      return await transaction(async (trx) => {
        // Step 1: Reserve stock with row-level locking
        await stockRepository.reserveWithLock(productId, quantity, trx);

        // Step 2: Create order
        const totalAmount = productPrice * quantity;
        const order = new Order({
          customer_id: customerId,
          product_id: productId,
          quantity,
          total_amount: totalAmount,
          payment_method: paymentMethod,
          payment_status: 'pending',
          order_status: 'pending_payment',
        });

        const createdOrder = await orderRepository.create(order, trx);

        logger.info('Order created successfully', {
          orderId: createdOrder.id,
          customerId,
          productId,
          quantity,
          totalAmount,
        });

        // Send admin notification for new order (T115)
        // Don't await - send asynchronously to not block order creation
        adminNotificationDispatcher
          .sendToAllAdmins('new_order', { order: createdOrder.toDatabase() })
          .catch((error) => {
            logger.error('Error sending admin notification for new order', error, {
              orderId: createdOrder.id,
            });
          });

        return createdOrder;
      });
    } catch (error) {
      if (error instanceof ConflictError) {
        logger.warn('Order creation failed: insufficient stock', {
          customerId,
          productId,
          quantity,
        });
        throw error;
      }
      logger.error('Error creating order', error, { customerId, productId, quantity });
      throw error;
    }
  }

  /**
   * Get order by ID
   * @param {number} orderId Order ID
   * @returns {Promise<Order>}
   * @throws {NotFoundError} If order not found
   */
  async getOrderById(orderId) {
    try {
      const order = await orderRepository.findById(orderId);
      if (!order) {
        throw new NotFoundError(`Order with ID ${orderId} not found`);
      }
      return order;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Error getting order by ID', error, { orderId });
      throw error;
    }
  }

  /**
   * Get orders by customer ID
   * @param {number} customerId Customer ID
   * @returns {Promise<Array<Order>>}
   */
  async getOrdersByCustomerId(customerId) {
    try {
      return await orderRepository.findByCustomerId(customerId);
    } catch (error) {
      logger.error('Error getting orders by customer ID', error, { customerId });
      throw error;
    }
  }

  /**
   * Update order status (with state machine validation)
   * Triggers notification listeners (T084-T087)
   * @param {number} orderId Order ID
   * @param {string} newStatus New order status
   * @returns {Promise<Order>}
   * @throws {ValidationError} If transition is not allowed
   */
  async updateOrderStatus(orderId, newStatus) {
    try {
      const order = await this.getOrderById(orderId);

      // Validate state machine transition using transitionStatus method
      try {
        order.transitionStatus(newStatus);
      } catch (error) {
        if (error.name === 'ValidationError' || error.message.includes('Cannot transition')) {
          throw new ConflictError(
            `Cannot transition order ${orderId} from ${order.order_status} to ${newStatus}`
          );
        }
        throw error;
      }

      const updatedOrder = await orderRepository.updateStatus(orderId, newStatus);

      // Publish status change event (T081)
      await notificationPubSub.publishStatusChange(orderId, newStatus, {
        customerId: order.customer_id,
        productId: order.product_id,
      });

      // Trigger notification based on status (T084-T087)
      await this.triggerStatusNotification(orderId, newStatus, updatedOrder);

      return updatedOrder;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ConflictError) {
        throw error;
      }
      logger.error('Error updating order status', error, { orderId, newStatus });
      throw error;
    }
  }

  /**
   * Trigger notification based on order status change (T084-T087)
   * @param {number} orderId Order ID
   * @param {string} status New status
   * @param {Order} order Order object
   * @returns {Promise<void>}
   */
  async triggerStatusNotification(orderId, status, order) {
    try {
      let notificationType = null;

      switch (status) {
        case 'payment_received':
          notificationType = 'payment_received';
          break;
        case 'processing':
          notificationType = 'processing';
          break;
        case 'account_delivered':
          notificationType = 'account_delivered';
          break;
        case 'completed':
          notificationType = 'completed';
          break;
        default:
          // No notification for other statuses
          return;
      }

      if (notificationType) {
        // Get product name for notification
        const productService = require('../product/product-service');
        const product = await productService.getProductById(order.product_id);

        await notificationService.sendOrderStatusNotification(orderId, notificationType, {
          productName: product ? product.name : 'Produk',
        });
      }
    } catch (error) {
      // Don't throw - notification failure shouldn't block order status update
      logger.error('Error triggering status notification', error, { orderId, status });
    }
  }

  /**
   * Update order payment status
   * @param {number} orderId Order ID
   * @param {string} paymentStatus Payment status
   * @returns {Promise<Order>}
   */
  async updatePaymentStatus(orderId, paymentStatus) {
    try {
      const order = await orderRepository.updatePaymentStatus(orderId, paymentStatus);

      // Auto-transition order status based on payment status
      if (paymentStatus === 'verified' && order.order_status === 'pending_payment') {
        await this.updateOrderStatus(orderId, 'payment_received');
        // Notification will be sent by updateOrderStatus listener
      }

      return order;
    } catch (error) {
      logger.error('Error updating payment status', error, { orderId, paymentStatus });
      throw error;
    }
  }

  /**
   * Cancel order and release reserved stock
   * @param {number} orderId Order ID
   * @returns {Promise<Order>}
   */
  async cancelOrder(orderId) {
    try {
      const order = await this.getOrderById(orderId);

      if (order.isCancelled()) {
        return order; // Already cancelled
      }

      // Release reserved stock
      await stockRepository.releaseReserved(order.product_id, order.quantity);

      // Update order status to cancelled
      return await this.updateOrderStatus(orderId, 'cancelled');
    } catch (error) {
      logger.error('Error cancelling order', error, { orderId });
      throw error;
    }
  }

  /**
   * Update order with account credentials (encrypted) (T129)
   * Triggers account_delivered notification (T086)
   * @param {number} orderId Order ID
   * @param {string} credentials Plaintext or encrypted credentials
   * @param {boolean} isEncrypted Whether credentials are already encrypted
   * @returns {Promise<Order>}
   */
  async updateCredentials(orderId, credentials, isEncrypted = false) {
    try {
      // Encrypt credentials before storage if not already encrypted (T129)
      const encryptionService = require('../security/encryption-service');
      const encryptedCredentials = isEncrypted
        ? credentials
        : encryptionService.encrypt(credentials);

      const order = await orderRepository.updateCredentials(orderId, encryptedCredentials);

      // Update status to account_delivered and trigger notification
      if (order.order_status === 'processing') {
        await this.updateOrderStatus(orderId, 'account_delivered');
        // Notification will be sent by updateOrderStatus
      }

      return order;
    } catch (error) {
      logger.error('Error updating order credentials', error, { orderId });
      throw error;
    }
  }
}

module.exports = new OrderService();
