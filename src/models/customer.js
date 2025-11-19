/**
 * Customer model
 * Represents a user who interacts with the bot
 *
 * Task: T029
 * Requirement: FR-018 (personalization)
 */

const { ValidationError } = require('../lib/shared/errors');
const { validateTelegramUserId } = require('../lib/shared/input-validator');

class Customer {
  constructor(data) {
    this.id = data.id || null;
    this.telegram_user_id = validateTelegramUserId(data.telegram_user_id);
    this.name = data.name || null;
    this.username = data.username || null;
    this.purchase_history = data.purchase_history || [];
    this.behavior_patterns = data.behavior_patterns || {};
    this.preferences = data.preferences || {};
    this.registration_timestamp = data.registration_timestamp || new Date();
    this.last_activity_timestamp = data.last_activity_timestamp || new Date();

    this.validate();
  }

  validate() {
    if (!this.telegram_user_id || this.telegram_user_id <= 0) {
      throw new ValidationError('Telegram user ID is required and must be positive');
    }

    if (this.name && this.name.length > 255) {
      throw new ValidationError('Customer name must not exceed 255 characters');
    }

    if (this.username && this.username.length > 100) {
      throw new ValidationError('Username must not exceed 100 characters');
    }

    if (!Array.isArray(this.purchase_history)) {
      throw new ValidationError('Purchase history must be an array');
    }

    if (typeof this.behavior_patterns !== 'object' || Array.isArray(this.behavior_patterns)) {
      throw new ValidationError('Behavior patterns must be an object');
    }

    if (typeof this.preferences !== 'object' || Array.isArray(this.preferences)) {
      throw new ValidationError('Preferences must be an object');
    }
  }

  /**
   * Update last activity timestamp
   */
  updateActivity() {
    this.last_activity_timestamp = new Date();
  }

  /**
   * Add order to purchase history
   * @param {number} orderId Order ID
   */
  addPurchase(orderId) {
    if (!this.purchase_history.includes(orderId)) {
      this.purchase_history.push(orderId);
    }
  }

  /**
   * Update behavior patterns
   * @param {string} key Behavior key (e.g., 'browsed_products', 'preferred_category')
   * @param {any} value Behavior value
   */
  updateBehavior(key, value) {
    this.behavior_patterns[key] = value;
    this.updateActivity();
  }

  /**
   * Convert to database format
   * @returns {Object}
   */
  toDatabase() {
    return {
      id: this.id,
      telegram_user_id: this.telegram_user_id,
      name: this.name,
      username: this.username,
      purchase_history: JSON.stringify(this.purchase_history),
      behavior_patterns: JSON.stringify(this.behavior_patterns),
      preferences: JSON.stringify(this.preferences),
      registration_timestamp: this.registration_timestamp,
      last_activity_timestamp: this.last_activity_timestamp,
    };
  }

  /**
   * Create from database row
   * @param {Object} row Database row
   * @returns {Customer}
   */
  static fromDatabase(row) {
    if (!row) return null;

    return new Customer({
      id: row.id,
      telegram_user_id: row.telegram_user_id,
      name: row.name,
      username: row.username,
      purchase_history:
        typeof row.purchase_history === 'string'
          ? JSON.parse(row.purchase_history)
          : row.purchase_history || [],
      behavior_patterns:
        typeof row.behavior_patterns === 'string'
          ? JSON.parse(row.behavior_patterns)
          : row.behavior_patterns || {},
      preferences:
        typeof row.preferences === 'string' ? JSON.parse(row.preferences) : row.preferences || {},
      registration_timestamp: row.registration_timestamp,
      last_activity_timestamp: row.last_activity_timestamp,
    });
  }
}

module.exports = Customer;
