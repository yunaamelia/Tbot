/**
 * Payment repository with database queries
 *
 * Task: T055
 * Requirement: FR-005, FR-006, FR-007, FR-008
 */

const { table } = require('../database/query-builder');
const Payment = require('../../models/payment');
const logger = require('../shared/logger').child('payment-repository');

class PaymentRepository {
  /**
   * Create new payment record
   * @param {Payment} payment Payment instance
   * @returns {Promise<Payment>} Created payment
   */
  async create(payment) {
    try {
      const [paymentId] = await table('payments').insert(payment.toDatabase()).returning('id');
      return Payment.fromDatabase({ ...payment.toDatabase(), id: paymentId });
    } catch (error) {
      logger.error('Error creating payment', error, { orderId: payment.order_id });
      throw error;
    }
  }

  /**
   * Find payment by order ID
   * @param {number} orderId Order ID
   * @returns {Promise<Payment|null>}
   */
  async findByOrderId(orderId) {
    try {
      const row = await table('payments').where('order_id', orderId).first();
      return Payment.fromDatabase(row);
    } catch (error) {
      logger.error('Error finding payment by order ID', error, { orderId });
      throw error;
    }
  }

  /**
   * Find payment by gateway transaction ID
   * @param {string} transactionId Payment gateway transaction ID
   * @returns {Promise<Payment|null>}
   */
  async findByTransactionId(transactionId) {
    try {
      const row = await table('payments')
        .where('payment_gateway_transaction_id', transactionId)
        .first();
      return Payment.fromDatabase(row);
    } catch (error) {
      logger.error('Error finding payment by transaction ID', error, { transactionId });
      throw error;
    }
  }

  /**
   * Find payments by status
   * @param {string} status Payment status
   * @returns {Promise<Array<Payment>>}
   */
  async findByStatus(status) {
    try {
      const rows = await table('payments')
        .where('status', status)
        .orderBy('created_timestamp', 'desc');
      return rows.map((row) => Payment.fromDatabase(row));
    } catch (error) {
      logger.error('Error finding payments by status', error, { status });
      throw error;
    }
  }

  /**
   * Update payment status
   * @param {number} paymentId Payment ID
   * @param {string} status New payment status
   * @param {Object} additionalData Additional data to update
   * @returns {Promise<Payment>}
   */
  async updateStatus(paymentId, status, additionalData = {}) {
    try {
      const updateData = {
        status,
        ...additionalData,
      };

      if (status === 'verified' && !additionalData.verification_timestamp) {
        updateData.verification_timestamp = new Date();
      }

      await table('payments').where('id', paymentId).update(updateData);
      return this.findById(paymentId);
    } catch (error) {
      logger.error('Error updating payment status', error, { paymentId, status });
      throw error;
    }
  }

  /**
   * Find payment by ID
   * @param {number} paymentId Payment ID
   * @returns {Promise<Payment|null>}
   */
  async findById(paymentId) {
    try {
      const row = await table('payments').where('id', paymentId).first();
      return Payment.fromDatabase(row);
    } catch (error) {
      logger.error('Error finding payment by ID', error, { paymentId });
      throw error;
    }
  }

  /**
   * Update payment proof (for manual bank transfer)
   * @param {number} paymentId Payment ID
   * @param {string} paymentProof Payment proof (file ID or URL)
   * @returns {Promise<Payment>}
   */
  async updatePaymentProof(paymentId, paymentProof) {
    try {
      await table('payments').where('id', paymentId).update({
        payment_proof: paymentProof,
      });
      return this.findById(paymentId);
    } catch (error) {
      logger.error('Error updating payment proof', error, { paymentId });
      throw error;
    }
  }
}

module.exports = new PaymentRepository();
