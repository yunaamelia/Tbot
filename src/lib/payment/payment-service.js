/**
 * Payment service with payment verification logic
 * Handles QRIS automatic and manual bank transfer verification
 *
 * Task: T061
 * Requirement: FR-005, FR-006, FR-007, FR-008, FR-031
 */

const paymentRepository = require('./payment-repository');
const orderService = require('../order/order-service');
const stockRepository = require('../product/stock-repository');
const notificationService = require('../admin/notification-service');
const adminNotificationDispatcher = require('../admin/admin-notification-dispatcher');
const { transaction } = require('../database/query-builder');
const Payment = require('../../models/payment');
const { NotFoundError, ConflictError } = require('../shared/errors');
const logger = require('../shared/logger').child('payment-service');

class PaymentService {
  /**
   * Create payment record for an order
   * @param {number} orderId Order ID
   * @param {string} paymentMethod Payment method ('qris' or 'manual_bank_transfer')
   * @param {number} amount Payment amount
   * @returns {Promise<Payment>} Created payment
   */
  async createPayment(orderId, paymentMethod, amount) {
    try {
      const payment = new Payment({
        order_id: orderId,
        payment_method: paymentMethod,
        amount,
        status: 'pending',
        verification_method: paymentMethod === 'qris' ? 'automatic' : 'manual',
      });

      return await paymentRepository.create(payment);
    } catch (error) {
      logger.error('Error creating payment', error, { orderId, paymentMethod, amount });
      throw error;
    }
  }

  /**
   * Verify QRIS payment automatically (FR-007)
   * Uses database transaction for stock deduction (FR-033)
   * @param {number} orderId Order ID
   * @param {string} transactionId Payment gateway transaction ID
   * @returns {Promise<Payment>} Verified payment
   */
  async verifyQRISPayment(orderId, transactionId) {
    try {
      const payment = await paymentRepository.findByOrderId(orderId);
      if (!payment) {
        throw new NotFoundError(`Payment not found for order ${orderId}`);
      }

      if (payment.isVerified()) {
        logger.warn('Payment already verified', { orderId, paymentId: payment.id });
        return payment; // Idempotent: already verified
      }

      // Use transaction for atomic stock deduction and payment verification (FR-033)
      return await transaction(async (trx) => {
        // Step 1: Update payment status
        payment.markAsVerified('automatic', null, transactionId);
        const verifiedPayment = await paymentRepository.updateStatus(payment.id, 'verified', {
          verification_method: 'automatic',
          payment_gateway_transaction_id: transactionId,
          verification_timestamp: payment.verification_timestamp,
        });

        // Step 2: Get order to deduct stock
        const order = await orderService.getOrderById(orderId);

        // Step 3: Deduct stock with lock
        await stockRepository.deductWithLock(order.product_id, order.quantity, trx);

        // Step 4: Update order payment status (triggers order status transition and notification)
        await orderService.updatePaymentStatus(orderId, 'verified');
        // Notification will be sent by order-service updateOrderStatus listener (T084)

        // Send admin notification for QRIS auto-verification (T121)
        const updatedOrder = await orderService.getOrderById(orderId);
        adminNotificationDispatcher
          .sendToAllAdmins('qris_verified', {
            order: updatedOrder.toDatabase(),
            payment: verifiedPayment.toDatabase(),
          })
          .catch((error) => {
            logger.error('Error sending admin notification for QRIS verification', error, {
              orderId,
              paymentId: payment.id,
            });
          });

        logger.info('QRIS payment verified successfully', {
          orderId,
          paymentId: payment.id,
          transactionId,
        });

        return verifiedPayment;
      });
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ConflictError) {
        throw error;
      }
      logger.error('Error verifying QRIS payment', error, { orderId, transactionId });
      throw error;
    }
  }

  /**
   * Verify manual bank transfer payment (FR-008)
   * Uses database transaction for stock deduction (FR-033)
   * @param {number} paymentId Payment ID
   * @param {number} adminId Admin ID who verifies
   * @returns {Promise<Payment>} Verified payment
   */
  async verifyManualPayment(paymentId, adminId) {
    try {
      const payment = await paymentRepository.findById(paymentId);
      if (!payment) {
        throw new NotFoundError(`Payment with ID ${paymentId} not found`);
      }

      if (payment.isVerified()) {
        logger.warn('Payment already verified', { paymentId });
        return payment; // Idempotent
      }

      if (payment.payment_method !== 'manual_bank_transfer') {
        throw new ConflictError(`Payment ${paymentId} is not a manual bank transfer payment`);
      }

      // Use transaction for atomic stock deduction and payment verification (FR-033)
      return await transaction(async (trx) => {
        // Step 1: Update payment status
        payment.markAsVerified('manual', adminId);
        const verifiedPayment = await paymentRepository.updateStatus(payment.id, 'verified', {
          verification_method: 'manual',
          admin_id: adminId,
          verification_timestamp: payment.verification_timestamp,
        });

        // Step 2: Get order to deduct stock
        const order = await orderService.getOrderById(payment.order_id);

        // Step 3: Deduct stock with lock
        await stockRepository.deductWithLock(order.product_id, order.quantity, trx);

        // Step 4: Update order payment status
        await orderService.updatePaymentStatus(payment.order_id, 'verified');

        logger.info('Manual payment verified successfully', {
          paymentId,
          orderId: payment.order_id,
          adminId,
        });

        return verifiedPayment;
      });
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ConflictError) {
        throw error;
      }
      logger.error('Error verifying manual payment', error, { paymentId, adminId });
      throw error;
    }
  }

  /**
   * Get payment by order ID
   * @param {number} orderId Order ID
   * @returns {Promise<Payment|null>}
   */
  async getPaymentByOrderId(orderId) {
    try {
      return await paymentRepository.findByOrderId(orderId);
    } catch (error) {
      logger.error('Error getting payment by order ID', error, { orderId });
      throw error;
    }
  }

  /**
   * Get payment by transaction ID
   * @param {string} transactionId Payment gateway transaction ID
   * @returns {Promise<Payment|null>}
   */
  async getPaymentByTransactionId(transactionId) {
    try {
      return await paymentRepository.findByTransactionId(transactionId);
    } catch (error) {
      logger.error('Error getting payment by transaction ID', error, { transactionId });
      throw error;
    }
  }

  /**
   * Update payment proof (for manual bank transfer) (T116)
   * @param {number} paymentId Payment ID
   * @param {string} paymentProof Payment proof (file ID or URL)
   * @returns {Promise<Payment>}
   */
  async updatePaymentProof(paymentId, paymentProof) {
    try {
      const payment = await paymentRepository.updatePaymentProof(paymentId, paymentProof);

      // Send admin notification for payment proof (T116)
      const order = await orderService.getOrderById(payment.order_id);
      adminNotificationDispatcher
        .sendToAllAdmins('payment_proof', {
          order: order.toDatabase(),
          payment: payment.toDatabase(),
        })
        .catch((error) => {
          logger.error('Error sending admin notification for payment proof', error, {
            paymentId,
            orderId: payment.order_id,
          });
        });

      return payment;
    } catch (error) {
      logger.error('Error updating payment proof', error, { paymentId });
      throw error;
    }
  }

  /**
   * Mark payment as failed
   * Triggers payment_failed notification (T089)
   * @param {number} paymentId Payment ID
   * @param {string} reason Failure reason
   * @returns {Promise<Payment>}
   */
  async markPaymentAsFailed(paymentId, reason = 'Verifikasi pembayaran gagal') {
    try {
      const payment = await paymentRepository.findById(paymentId);
      if (!payment) {
        throw new NotFoundError(`Payment with ID ${paymentId} not found`);
      }

      payment.markAsFailed();
      const failedPayment = await paymentRepository.updateStatus(paymentId, 'failed');

      // Send payment failed notification to customer (T089)
      try {
        await notificationService.sendOrderStatusNotification(payment.order_id, 'payment_failed', {
          reason,
        });
      } catch (error) {
        // Don't throw - notification failure shouldn't block payment failure
        logger.error('Error sending payment failed notification to customer', error, {
          paymentId,
          orderId: payment.order_id,
        });
      }

      // Send admin notification for payment failure (T122)
      try {
        const order = await orderService.getOrderById(payment.order_id);
        await adminNotificationDispatcher.sendToAllAdmins('payment_failed', {
          order: order.toDatabase(),
          payment: failedPayment.toDatabase(),
          reason,
        });
      } catch (error) {
        // Don't throw - notification failure shouldn't block payment failure
        logger.error('Error sending admin notification for payment failure', error, {
          paymentId,
          orderId: payment.order_id,
        });
      }

      return failedPayment;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Error marking payment as failed', error, { paymentId });
      throw error;
    }
  }
}

module.exports = new PaymentService();
