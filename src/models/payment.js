/**
 * Payment model with payment method and status
 * Represents payment transaction records
 *
 * Task: T052
 * Requirement: FR-005, FR-006, FR-007, FR-008
 */

const { ValidationError } = require('../lib/shared/errors');

const PAYMENT_STATUSES = ['pending', 'verified', 'failed', 'refunded'];
const PAYMENT_METHODS = ['qris', 'manual_bank_transfer'];
const VERIFICATION_METHODS = ['automatic', 'manual'];

class Payment {
  constructor(data) {
    this.id = data.id || null;
    this.order_id = parseInt(data.order_id, 10);
    this.payment_method = data.payment_method;
    this.amount = parseFloat(data.amount);
    this.status = data.status || 'pending';
    this.verification_method = data.verification_method || null;
    this.payment_proof = data.payment_proof || null;
    this.payment_gateway_transaction_id = data.payment_gateway_transaction_id || null;
    this.verification_timestamp = data.verification_timestamp || null;
    this.admin_id = data.admin_id || null;
    this.created_timestamp = data.created_timestamp || new Date();

    this.validate();
  }

  validate() {
    if (!this.order_id || this.order_id <= 0) {
      throw new ValidationError('Order ID is required and must be positive');
    }

    if (!PAYMENT_METHODS.includes(this.payment_method)) {
      throw new ValidationError(`Payment method must be one of: ${PAYMENT_METHODS.join(', ')}`);
    }

    if (isNaN(this.amount) || this.amount <= 0) {
      throw new ValidationError('Payment amount must be a positive number');
    }

    if (!PAYMENT_STATUSES.includes(this.status)) {
      throw new ValidationError(`Payment status must be one of: ${PAYMENT_STATUSES.join(', ')}`);
    }

    // Validate verification method
    if (this.verification_method && !VERIFICATION_METHODS.includes(this.verification_method)) {
      throw new ValidationError(
        `Verification method must be one of: ${VERIFICATION_METHODS.join(', ')}`
      );
    }

    // QRIS payments should have transaction ID
    if (this.payment_method === 'qris' && this.status === 'verified') {
      if (!this.payment_gateway_transaction_id) {
        throw new ValidationError(
          'QRIS payment must have payment gateway transaction ID when verified'
        );
      }
      if (this.verification_method !== 'automatic') {
        throw new ValidationError('QRIS payment verification method must be automatic');
      }
    }

    // Manual bank transfer should have admin ID when verified
    if (this.payment_method === 'manual_bank_transfer' && this.status === 'verified') {
      if (!this.admin_id) {
        throw new ValidationError('Manual bank transfer payment must have admin ID when verified');
      }
      if (this.verification_method !== 'manual') {
        throw new ValidationError('Manual bank transfer verification method must be manual');
      }
    }
  }

  /**
   * Mark payment as verified
   * @param {string} verificationMethod 'automatic' or 'manual'
   * @param {number} [adminId] Admin ID (required for manual verification)
   * @param {string} [transactionId] Payment gateway transaction ID (for QRIS)
   */
  markAsVerified(verificationMethod, adminId = null, transactionId = null) {
    if (!VERIFICATION_METHODS.includes(verificationMethod)) {
      throw new ValidationError(
        `Verification method must be one of: ${VERIFICATION_METHODS.join(', ')}`
      );
    }

    this.status = 'verified';
    this.verification_method = verificationMethod;
    this.verification_timestamp = new Date();

    if (verificationMethod === 'manual' && !adminId) {
      throw new ValidationError('Admin ID is required for manual verification');
    }

    if (verificationMethod === 'manual') {
      this.admin_id = adminId;
    }

    if (transactionId) {
      this.payment_gateway_transaction_id = transactionId;
    }

    this.validate();
  }

  /**
   * Mark payment as failed
   */
  markAsFailed() {
    this.status = 'failed';
    this.validate();
  }

  /**
   * Check if payment is verified
   * @returns {boolean}
   */
  isVerified() {
    return this.status === 'verified';
  }

  /**
   * Check if payment is pending
   * @returns {boolean}
   */
  isPending() {
    return this.status === 'pending';
  }

  /**
   * Convert to database format
   * @returns {Object}
   */
  toDatabase() {
    return {
      id: this.id,
      order_id: this.order_id,
      payment_method: this.payment_method,
      amount: this.amount,
      status: this.status,
      verification_method: this.verification_method,
      payment_proof: this.payment_proof,
      payment_gateway_transaction_id: this.payment_gateway_transaction_id,
      verification_timestamp: this.verification_timestamp,
      admin_id: this.admin_id,
      created_timestamp: this.created_timestamp,
    };
  }

  /**
   * Create from database row
   * @param {Object} row Database row
   * @returns {Payment}
   */
  static fromDatabase(row) {
    if (!row) return null;

    return new Payment({
      id: row.id,
      order_id: row.order_id,
      payment_method: row.payment_method,
      amount: row.amount,
      status: row.status,
      verification_method: row.verification_method,
      payment_proof: row.payment_proof,
      payment_gateway_transaction_id: row.payment_gateway_transaction_id,
      verification_timestamp: row.verification_timestamp,
      admin_id: row.admin_id,
      created_timestamp: row.created_timestamp,
    });
  }
}

module.exports = Payment;
