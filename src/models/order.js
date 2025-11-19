/**
 * Order model with state machine validation
 * Represents a customer purchase transaction
 *
 * Task: T051
 * Requirement: FR-004, FR-025, FR-033
 */

const { ValidationError } = require('../lib/shared/errors');

const ORDER_STATUSES = [
  'pending_payment',
  'payment_received',
  'processing',
  'account_delivered',
  'completed',
  'cancelled',
];

const PAYMENT_STATUSES = ['pending', 'verified', 'failed', 'refunded'];

const PAYMENT_METHODS = ['qris', 'manual_bank_transfer'];

/**
 * State machine transitions for order status
 */
const STATUS_TRANSITIONS = {
  pending_payment: ['payment_received', 'cancelled'],
  payment_received: ['processing', 'cancelled'],
  processing: ['account_delivered', 'cancelled'],
  account_delivered: ['completed', 'cancelled'],
  completed: [], // Terminal state
  cancelled: [], // Terminal state
};

class Order {
  constructor(data) {
    this.id = data.id || null;
    this.customer_id = parseInt(data.customer_id, 10);
    this.product_id = parseInt(data.product_id, 10);
    this.quantity = parseInt(data.quantity, 10);
    this.total_amount = parseFloat(data.total_amount);
    this.payment_method = data.payment_method;
    this.payment_status = data.payment_status || 'pending';
    this.order_status = data.order_status || 'pending_payment';
    this.created_timestamp = data.created_timestamp || new Date();
    this.payment_verification_timestamp = data.payment_verification_timestamp || null;
    this.completed_timestamp = data.completed_timestamp || null;
    this.account_credentials = data.account_credentials || null; // Encrypted at rest

    this.validate();
  }

  validate() {
    if (!this.customer_id || this.customer_id <= 0) {
      throw new ValidationError('Customer ID is required and must be positive');
    }

    if (!this.product_id || this.product_id <= 0) {
      throw new ValidationError('Product ID is required and must be positive');
    }

    if (!this.quantity || this.quantity <= 0) {
      throw new ValidationError('Quantity must be a positive integer');
    }

    if (isNaN(this.total_amount) || this.total_amount <= 0) {
      throw new ValidationError('Total amount must be a positive number');
    }

    if (!PAYMENT_METHODS.includes(this.payment_method)) {
      throw new ValidationError(`Payment method must be one of: ${PAYMENT_METHODS.join(', ')}`);
    }

    if (!PAYMENT_STATUSES.includes(this.payment_status)) {
      throw new ValidationError(`Payment status must be one of: ${PAYMENT_STATUSES.join(', ')}`);
    }

    if (!ORDER_STATUSES.includes(this.order_status)) {
      throw new ValidationError(`Order status must be one of: ${ORDER_STATUSES.join(', ')}`);
    }

    // Validate state machine transition
    this.validateStateTransition(this.order_status);
  }

  /**
   * Validate state machine transition (FR-025)
   * @param {string} newStatus New order status
   * @returns {boolean} True if transition is valid
   */
  canTransitionTo(newStatus) {
    const allowedTransitions = STATUS_TRANSITIONS[this.order_status] || [];
    return allowedTransitions.includes(newStatus);
  }

  /**
   * Validate state machine transition
   * @param {string} status Order status
   */
  validateStateTransition(status) {
    if (!ORDER_STATUSES.includes(status)) {
      throw new ValidationError(`Invalid order status: ${status}`);
    }
  }

  /**
   * Transition order status (with validation)
   * @param {string} newStatus New order status
   * @throws {ValidationError} If transition is not allowed
   */
  transitionTo(newStatus) {
    if (!this.canTransitionTo(newStatus)) {
      throw new ValidationError(`Cannot transition from ${this.order_status} to ${newStatus}`);
    }

    this.order_status = newStatus;

    // Set timestamps based on status
    if (newStatus === 'payment_received' && !this.payment_verification_timestamp) {
      this.payment_verification_timestamp = new Date();
    }

    if (newStatus === 'completed' && !this.completed_timestamp) {
      this.completed_timestamp = new Date();
    }
  }

  /**
   * Check if order can proceed to processing
   * @returns {boolean}
   */
  canProceedToProcessing() {
    return this.order_status === 'payment_received' && this.payment_status === 'verified';
  }

  /**
   * Check if order is completed
   * @returns {boolean}
   */
  isCompleted() {
    return this.order_status === 'completed';
  }

  /**
   * Check if order is cancelled
   * @returns {boolean}
   */
  isCancelled() {
    return this.order_status === 'cancelled';
  }

  /**
   * Convert to database format
   * @returns {Object}
   */
  toDatabase() {
    return {
      id: this.id,
      customer_id: this.customer_id,
      product_id: this.product_id,
      quantity: this.quantity,
      total_amount: this.total_amount,
      payment_method: this.payment_method,
      payment_status: this.payment_status,
      order_status: this.order_status,
      created_timestamp: this.created_timestamp,
      payment_verification_timestamp: this.payment_verification_timestamp,
      completed_timestamp: this.completed_timestamp,
      account_credentials: this.account_credentials, // Already encrypted
    };
  }

  /**
   * Create from database row
   * @param {Object} row Database row
   * @returns {Order}
   */
  static fromDatabase(row) {
    if (!row) return null;

    return new Order({
      id: row.id,
      customer_id: row.customer_id,
      product_id: row.product_id,
      quantity: row.quantity,
      total_amount: row.total_amount,
      payment_method: row.payment_method,
      payment_status: row.payment_status,
      order_status: row.order_status,
      created_timestamp: row.created_timestamp,
      payment_verification_timestamp: row.payment_verification_timestamp,
      completed_timestamp: row.completed_timestamp,
      account_credentials: row.account_credentials,
    });
  }
}

module.exports = Order;
