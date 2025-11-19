/**
 * Stock model with reserved quantity tracking
 * Represents inventory levels for products
 *
 * Task: T053
 * Requirement: FR-010, FR-033
 */

const { ValidationError } = require('../lib/shared/errors');

class Stock {
  constructor(data) {
    this.id = data.id || null;
    this.product_id = parseInt(data.product_id, 10);
    this.current_quantity = parseInt(data.current_quantity, 10) || 0;
    this.reserved_quantity = parseInt(data.reserved_quantity, 10) || 0;
    this.last_updated_timestamp = data.last_updated_timestamp || new Date();
    this.last_updated_by = data.last_updated_by || null;

    this.validate();
  }

  validate() {
    if (!this.product_id || this.product_id <= 0) {
      throw new ValidationError('Product ID is required and must be positive');
    }

    if (isNaN(this.current_quantity) || this.current_quantity < 0) {
      throw new ValidationError('Current quantity cannot be negative');
    }

    if (isNaN(this.reserved_quantity) || this.reserved_quantity < 0) {
      throw new ValidationError('Reserved quantity cannot be negative');
    }

    // Business rule: reserved quantity cannot exceed current quantity
    if (this.reserved_quantity > this.current_quantity) {
      throw new ValidationError('Reserved quantity cannot exceed current quantity');
    }
  }

  /**
   * Get available quantity (current - reserved)
   * @returns {number}
   */
  getAvailableQuantity() {
    return this.current_quantity - this.reserved_quantity;
  }

  /**
   * Reserve quantity for an order (FR-033)
   * @param {number} quantity Quantity to reserve
   * @throws {ValidationError} If insufficient stock
   */
  reserve(quantity) {
    if (quantity <= 0) {
      throw new ValidationError('Reserve quantity must be positive');
    }

    const available = this.getAvailableQuantity();
    if (quantity > available) {
      throw new ValidationError(
        `Insufficient stock. Available: ${available}, Requested: ${quantity}`
      );
    }

    this.reserved_quantity += quantity;
    this.last_updated_timestamp = new Date();
    this.validate();
  }

  /**
   * Release reserved quantity (when order cancelled)
   * @param {number} quantity Quantity to release
   */
  releaseReserved(quantity) {
    if (quantity <= 0) {
      throw new ValidationError('Release quantity must be positive');
    }

    if (quantity > this.reserved_quantity) {
      throw new ValidationError(
        `Cannot release more than reserved. Reserved: ${this.reserved_quantity}, Requested: ${quantity}`
      );
    }

    this.reserved_quantity -= quantity;
    this.last_updated_timestamp = new Date();
    this.validate();
  }

  /**
   * Deduct stock when payment verified (FR-033)
   * Decreases both current_quantity and reserved_quantity
   * @param {number} quantity Quantity to deduct
   */
  deduct(quantity) {
    if (quantity <= 0) {
      throw new ValidationError('Deduct quantity must be positive');
    }

    if (quantity > this.reserved_quantity) {
      throw new ValidationError(
        `Cannot deduct more than reserved. Reserved: ${this.reserved_quantity}, Requested: ${quantity}`
      );
    }

    if (quantity > this.current_quantity) {
      throw new ValidationError(
        `Cannot deduct more than current. Current: ${this.current_quantity}, Requested: ${quantity}`
      );
    }

    this.current_quantity -= quantity;
    this.reserved_quantity -= quantity;
    this.last_updated_timestamp = new Date();
    this.validate();
  }

  /**
   * Add stock (admin action)
   * @param {number} quantity Quantity to add
   * @param {number} adminId Admin ID who added stock
   */
  add(quantity, adminId = null) {
    if (quantity <= 0) {
      throw new ValidationError('Add quantity must be positive');
    }

    this.current_quantity += quantity;
    this.last_updated_by = adminId;
    this.last_updated_timestamp = new Date();
    this.validate();
  }

  /**
   * Check if stock is available
   * @param {number} quantity Required quantity
   * @returns {boolean}
   */
  isAvailable(quantity) {
    return this.getAvailableQuantity() >= quantity;
  }

  /**
   * Convert to database format
   * @returns {Object}
   */
  toDatabase() {
    return {
      id: this.id,
      product_id: this.product_id,
      current_quantity: this.current_quantity,
      reserved_quantity: this.reserved_quantity,
      last_updated_timestamp: this.last_updated_timestamp,
      last_updated_by: this.last_updated_by,
    };
  }

  /**
   * Create from database row
   * @param {Object} row Database row
   * @returns {Stock}
   */
  static fromDatabase(row) {
    if (!row) return null;

    return new Stock({
      id: row.id,
      product_id: row.product_id,
      current_quantity: row.current_quantity,
      reserved_quantity: row.reserved_quantity,
      last_updated_timestamp: row.last_updated_timestamp,
      last_updated_by: row.last_updated_by,
    });
  }
}

module.exports = Stock;
