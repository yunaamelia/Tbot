/**
 * Product model
 * Represents a premium account product for sale
 * 
 * Task: T028
 * Requirement: FR-001, FR-002
 */

const { ValidationError } = require('../lib/shared/errors');

class Product {
  constructor(data) {
    this.id = data.id || null;
    this.name = data.name;
    this.description = data.description || null;
    this.price = parseFloat(data.price);
    this.stock_quantity = parseInt(data.stock_quantity, 10);
    this.category = data.category || null;
    this.features = data.features || [];
    this.media_files = data.media_files || [];
    this.availability_status = data.availability_status || 'available';
    this.created_at = data.created_at || new Date();
    this.updated_at = data.updated_at || new Date();

    this.validate();
  }

  validate() {
    if (!this.name || typeof this.name !== 'string' || this.name.trim().length === 0) {
      throw new ValidationError('Product name is required and must be a non-empty string');
    }

    if (this.name.length > 255) {
      throw new ValidationError('Product name must not exceed 255 characters');
    }

    if (isNaN(this.price) || this.price < 0) {
      throw new ValidationError('Product price must be a positive number');
    }

    if (isNaN(this.stock_quantity) || this.stock_quantity < 0) {
      throw new ValidationError('Stock quantity must be a non-negative integer');
    }

    const validStatuses = ['available', 'out_of_stock', 'discontinued'];
    if (!validStatuses.includes(this.availability_status)) {
      throw new ValidationError(`Availability status must be one of: ${validStatuses.join(', ')}`);
    }

    // Auto-update availability_status based on stock
    if (this.stock_quantity === 0 && this.availability_status === 'available') {
      this.availability_status = 'out_of_stock';
    } else if (this.stock_quantity > 0 && this.availability_status === 'out_of_stock') {
      this.availability_status = 'available';
    }
  }

  /**
   * Check if product is available for purchase
   * @returns {boolean}
   */
  isAvailable() {
    return this.availability_status === 'available' && this.stock_quantity > 0;
  }

  /**
   * Convert to database format
   * @returns {Object}
   */
  toDatabase() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      price: this.price,
      stock_quantity: this.stock_quantity,
      category: this.category,
      features: JSON.stringify(this.features),
      media_files: JSON.stringify(this.media_files),
      availability_status: this.availability_status,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }

  /**
   * Create from database row
   * @param {Object} row Database row
   * @returns {Product}
   */
  static fromDatabase(row) {
    if (!row) return null;

    return new Product({
      id: row.id,
      name: row.name,
      description: row.description,
      price: row.price,
      stock_quantity: row.stock_quantity,
      category: row.category,
      features: typeof row.features === 'string' ? JSON.parse(row.features) : row.features,
      media_files: typeof row.media_files === 'string' ? JSON.parse(row.media_files) : row.media_files,
      availability_status: row.availability_status,
      created_at: row.created_at,
      updated_at: row.updated_at,
    });
  }
}

module.exports = Product;

