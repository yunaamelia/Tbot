/**
 * Order repository with database queries
 * Uses database transactions for order creation (FR-033)
 *
 * Task: T054
 * Requirement: FR-033, FR-025
 */

const { table } = require('../database/query-builder');
const Order = require('../../models/order');
const logger = require('../shared/logger').child('order-repository');

class OrderRepository {
  /**
   * Create new order with database transaction (FR-033)
   * @param {Order} order Order instance
   * @param {Function} trx Knex transaction function
   * @returns {Promise<Order>} Created order
   */
  async create(order, trx = null) {
    try {
      const db = trx || table('orders');
      const [orderId] = await db.insert(order.toDatabase()).returning('id');
      return Order.fromDatabase({ ...order.toDatabase(), id: orderId });
    } catch (error) {
      logger.error('Error creating order', error, { orderId: order.id });
      throw error;
    }
  }

  /**
   * Find order by ID
   * @param {number} orderId Order ID
   * @returns {Promise<Order|null>}
   */
  async findById(orderId) {
    try {
      const row = await table('orders').where('id', orderId).first();
      return Order.fromDatabase(row);
    } catch (error) {
      logger.error('Error finding order by ID', error, { orderId });
      throw error;
    }
  }

  /**
   * Find orders by customer ID
   * @param {number} customerId Customer ID
   * @returns {Promise<Array<Order>>}
   */
  async findByCustomerId(customerId) {
    try {
      const rows = await table('orders')
        .where('customer_id', customerId)
        .orderBy('created_timestamp', 'desc');
      return rows.map((row) => Order.fromDatabase(row));
    } catch (error) {
      logger.error('Error finding orders by customer ID', error, { customerId });
      throw error;
    }
  }

  /**
   * Find orders by status
   * @param {string} status Order status
   * @returns {Promise<Array<Order>>}
   */
  async findByStatus(status) {
    try {
      const rows = await table('orders')
        .where('order_status', status)
        .orderBy('created_timestamp', 'desc');
      return rows.map((row) => Order.fromDatabase(row));
    } catch (error) {
      logger.error('Error finding orders by status', error, { status });
      throw error;
    }
  }

  /**
   * Update order status
   * @param {number} orderId Order ID
   * @param {string} newStatus New order status
   * @param {Object} additionalData Additional data to update
   * @returns {Promise<Order>}
   */
  async updateStatus(orderId, newStatus, additionalData = {}) {
    try {
      const updateData = {
        order_status: newStatus,
        ...additionalData,
      };

      // Set timestamps based on status
      if (newStatus === 'payment_received' && !additionalData.payment_verification_timestamp) {
        updateData.payment_verification_timestamp = new Date();
      }

      if (newStatus === 'completed' && !additionalData.completed_timestamp) {
        updateData.completed_timestamp = new Date();
      }

      await table('orders').where('id', orderId).update(updateData);
      return this.findById(orderId);
    } catch (error) {
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
      await table('orders').where('id', orderId).update({
        payment_status: paymentStatus,
      });
      return this.findById(orderId);
    } catch (error) {
      logger.error('Error updating payment status', error, { orderId, paymentStatus });
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
      await table('orders').where('id', orderId).update({
        account_credentials: encryptedCredentials,
      });
      return this.findById(orderId);
    } catch (error) {
      logger.error('Error updating order credentials', error, { orderId });
      throw error;
    }
  }
}

module.exports = new OrderRepository();
