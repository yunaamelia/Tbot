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
   * Verify QRIS payment automatically (FR-007, T098)
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
        try {
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

          // Step 5: Send customer notification for payment verification status (T098)
          try {
            await this.notifyCustomerPaymentVerification(orderId, 'automatic', {
              transactionId,
            });
          } catch (notificationError) {
            // Don't throw - notification failure shouldn't block payment verification
            logger.error(
              'Error sending customer notification for payment verification',
              notificationError,
              {
                orderId,
                paymentId: payment.id,
                transactionId,
              }
            );
          }

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

          logger.info('QRIS payment verified successfully (automatic)', {
            orderId,
            paymentId: payment.id,
            transactionId,
            verificationMethod: 'automatic',
            decision: 'automatic', // Logging for automatic vs manual decisions (T100)
          });

          return verifiedPayment;
        } catch (error) {
          // Step 6: Handle partial success states (T099)
          // If verification succeeds but order processing fails, handle gracefully
          if (payment.isVerified()) {
            logger.error('Payment verified but order processing failed (partial success)', error, {
              orderId,
              paymentId: payment.id,
              transactionId,
            });

            // Try to notify customer about partial success
            try {
              await this.notifyCustomerPaymentVerification(orderId, 'automatic', {
                transactionId,
                error:
                  'Pembayaran berhasil diverifikasi, tetapi terjadi kesalahan pada pemrosesan pesanan. Silakan hubungi admin.',
              });
            } catch (notificationError) {
              logger.error('Error sending partial success notification', notificationError, {
                orderId,
              });
            }

            throw new ConflictError(
              'Pembayaran berhasil diverifikasi, tetapi terjadi kesalahan pada pemrosesan pesanan. Silakan hubungi admin.'
            );
          }
          throw error;
        }
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
   * Notify customer about payment verification status (T098)
   * @param {number} orderId Order ID
   * @param {string} verificationMethod 'automatic' or 'manual'
   * @param {Object} options Additional options
   * @param {string} options.transactionId Transaction ID (for automatic)
   * @param {string} options.error Error message (if verification failed)
   * @returns {Promise<void>}
   */
  async notifyCustomerPaymentVerification(orderId, verificationMethod, options = {}) {
    try {
      const order = await orderService.getOrderById(orderId);
      if (!order) {
        logger.warn('Order not found for payment notification', { orderId });
        return;
      }

      // Get customer
      const { getDb } = require('../database/db-connection');
      const db = getDb();
      const customer = await db('customers').where('id', order.customer_id).first();

      if (!customer) {
        logger.warn('Customer not found for payment notification', {
          orderId,
          customerId: order.customer_id,
        });
        return;
      }

      // Format notification message based on verification method
      let message = '';
      if (verificationMethod === 'automatic') {
        if (options.error) {
          message =
            `⚠️ *Status Pembayaran*\n\n` +
            `Pesanan: #${orderId}\n` +
            `${options.error}\n\n` +
            `Silakan hubungi admin jika masalah berlanjut.`;
        } else {
          message =
            `✅ *Pembayaran Diverifikasi*\n\n` +
            `Pesanan: #${orderId}\n` +
            `Pembayaran Anda telah diverifikasi secara otomatis.\n` +
            `Pesanan sedang diproses.\n\n` +
            `Anda akan menerima notifikasi saat pesanan siap.`;
        }
      } else if (verificationMethod === 'manual') {
        message =
          `✅ *Pembayaran Diverifikasi*\n\n` +
          `Pesanan: #${orderId}\n` +
          `Pembayaran Anda telah diverifikasi.\n` +
          `Pesanan sedang diproses.\n\n` +
          `Anda akan menerima notifikasi saat pesanan siap.`;
      }

      // Send notification via notification service
      if (message) {
        try {
          await notificationService.sendOrderStatusNotification(orderId, 'payment_verified', {
            message,
            verificationMethod,
            transactionId: options.transactionId,
          });
        } catch (error) {
          // Fallback: log error but don't throw
          logger.error('Error sending payment verification notification', error, {
            orderId,
            verificationMethod,
          });
        }
      }

      logger.debug('Customer notified about payment verification', {
        orderId,
        verificationMethod,
        customerId: customer.id,
      });
    } catch (error) {
      logger.error('Error notifying customer about payment verification', error, {
        orderId,
        verificationMethod,
      });
      // Don't throw - notification failure shouldn't block payment processing
    }
  }

  /**
   * Verify manual bank transfer payment (FR-008, T097, T098)
   * Uses database transaction for stock deduction (FR-033)
   * Also handles QRIS fallback cases (T097)
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

      // Allow manual verification for both manual_bank_transfer and qris (fallback) (T097)
      if (payment.payment_method !== 'manual_bank_transfer' && payment.payment_method !== 'qris') {
        throw new ConflictError(
          `Payment ${paymentId} cannot be verified manually (method: ${payment.payment_method})`
        );
      }

      // Use transaction for atomic stock deduction and payment verification (FR-033)
      return await transaction(async (trx) => {
        try {
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

          // Step 5: Send customer notification for payment verification status (T098)
          try {
            await this.notifyCustomerPaymentVerification(payment.order_id, 'manual', {
              adminId,
            });
          } catch (notificationError) {
            // Don't throw - notification failure shouldn't block payment verification
            logger.error(
              'Error sending customer notification for manual payment verification',
              notificationError,
              {
                paymentId,
                orderId: payment.order_id,
                adminId,
              }
            );
          }

          logger.info('Manual payment verified successfully', {
            paymentId,
            orderId: payment.order_id,
            adminId,
            paymentMethod: payment.payment_method,
            verificationMethod: 'manual',
            decision: 'manual', // Logging for automatic vs manual decisions (T100)
          });

          return verifiedPayment;
        } catch (error) {
          // Handle partial success states (T099)
          if (payment.isVerified()) {
            logger.error('Payment verified but order processing failed (partial success)', error, {
              paymentId,
              orderId: payment.order_id,
              adminId,
            });

            // Try to notify customer about partial success
            try {
              await this.notifyCustomerPaymentVerification(payment.order_id, 'manual', {
                adminId,
                error:
                  'Pembayaran berhasil diverifikasi, tetapi terjadi kesalahan pada pemrosesan pesanan. Silakan hubungi admin.',
              });
            } catch (notificationError) {
              logger.error('Error sending partial success notification', notificationError, {
                orderId: payment.order_id,
              });
            }

            throw new ConflictError(
              'Pembayaran berhasil diverifikasi, tetapi terjadi kesalahan pada pemrosesan pesanan. Silakan hubungi admin.'
            );
          }
          throw error;
        }
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
