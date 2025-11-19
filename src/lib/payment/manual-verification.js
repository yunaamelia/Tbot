/**
 * Manual bank transfer handler with payment proof upload
 * Handles manual payment verification flow
 *
 * Task: T060
 * Requirement: FR-006, FR-008
 */

const paymentService = require('./payment-service');
const logger = require('../shared/logger').child('manual-verification');
const i18n = require('../shared/i18n');
const config = require('../shared/config');

class ManualVerificationHandler {
  /**
   * Get bank account details for manual transfer (T068)
   * @returns {Object} Bank account details
   */
  getBankAccountDetails() {
    return {
      bankName: config.get('BANK_NAME', 'Bank BCA'),
      accountNumber: config.require('BANK_ACCOUNT_NUMBER'),
      accountHolder: config.require('BANK_ACCOUNT_HOLDER'),
    };
  }

  /**
   * Format manual bank transfer instructions (T068)
   * @param {number} orderId Order ID
   * @param {number} amount Payment amount
   * @returns {Object} Formatted message with bank details
   */
  formatManualTransferInstructions(orderId, amount) {
    const bankDetails = this.getBankAccountDetails();

    const text =
      `🏦 *Transfer Bank Manual*\n\n` +
      `Pesanan: #${orderId}\n` +
      `Jumlah: *Rp ${amount.toLocaleString('id-ID')}*\n\n` +
      i18n.t('checkout_manual_instructions', {
        bankName: bankDetails.bankName,
        accountNumber: bankDetails.accountNumber,
        accountHolder: bankDetails.accountHolder,
        amount: amount.toLocaleString('id-ID'),
      }) +
      `\n\n📸 *Kirim Bukti Transfer*\n` +
      `Setelah transfer, silakan kirim foto atau screenshot bukti transfer Anda.`;

    return {
      text,
      parse_mode: 'Markdown',
      bankDetails,
    };
  }

  /**
   * Handle payment proof upload
   * @param {number} userId Telegram user ID
   * @param {string} fileId Telegram file ID of payment proof
   * @returns {Promise<Object>} Payment proof saved
   */
  async handlePaymentProofUpload(userId, fileId) {
    try {
      // Get user's pending payment
      // This would typically be stored in checkout session
      // For now, we'll search for pending manual payments for this user
      const { getDb } = require('../database/db-connection');

      // Find customer
      const customer = await getDb()('customers').where('telegram_user_id', userId).first();

      if (!customer) {
        throw new Error('Customer not found');
      }

      // Find pending manual payment for this customer
      const payment = await getDb()('payments')
        .join('orders', 'payments.order_id', 'orders.id')
        .where('orders.customer_id', customer.id)
        .where('payments.payment_method', 'manual_bank_transfer')
        .where('payments.status', 'pending')
        .orderBy('payments.created_timestamp', 'desc')
        .first();

      if (!payment) {
        throw new Error('No pending manual payment found');
      }

      // Update payment proof
      await paymentService.updatePaymentProof(payment.id, fileId);

      logger.info('Payment proof uploaded', {
        userId,
        paymentId: payment.id,
        orderId: payment.order_id,
      });

      return {
        paymentId: payment.id,
        orderId: payment.order_id,
        message: i18n.t('checkout_payment_proof_received'),
      };
    } catch (error) {
      logger.error('Error handling payment proof upload', error, { userId, fileId });
      throw error;
    }
  }

  /**
   * Format payment proof received confirmation
   * @returns {Object} Confirmation message
   */
  formatPaymentProofReceived() {
    return {
      text: i18n.t('checkout_payment_proof_received'),
      parse_mode: 'Markdown',
    };
  }
}

module.exports = new ManualVerificationHandler();
