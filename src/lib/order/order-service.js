/**
 * Order service with order creation and status management
 * Uses database transactions for order creation and stock updates (FR-033)
 *
 * Task: T057
 * Requirement: FR-004, FR-025, FR-033
 */

const orderRepository = require('./order-repository');
const stockRepository = require('../product/stock-repository');
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
   * @param {number} orderId Order ID
   * @param {string} newStatus New order status
   * @returns {Promise<Order>}
   * @throws {ValidationError} If transition is not allowed
   */
  async updateOrderStatus(orderId, newStatus) {
    try {
      const order = await this.getOrderById(orderId);

      // Validate state machine transition
      if (!order.canTransitionTo(newStatus)) {
        throw new ConflictError(
          `Cannot transition order ${orderId} from ${order.order_status} to ${newStatus}`
        );
      }

      return await orderRepository.updateStatus(orderId, newStatus);
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ConflictError) {
        throw error;
      }
      logger.error('Error updating order status', error, { orderId, newStatus });
      throw error;
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
   * Update order with account credentials (encrypted)
   * @param {number} orderId Order ID
   * @param {string} encryptedCredentials Encrypted credentials
   * @returns {Promise<Order>}
   */
  async updateCredentials(orderId, encryptedCredentials) {
    try {
      return await orderRepository.updateCredentials(orderId, encryptedCredentials);
    } catch (error) {
      logger.error('Error updating order credentials', error, { orderId });
      throw error;
    }
  }
}

module.exports = new OrderService();
