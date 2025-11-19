/**
 * Admin model with permissions
 * Represents store administrators with management privileges
 *
 * Task: T094
 * Requirement: FR-050, FR-020
 */

const { ValidationError } = require('../lib/shared/errors');
const { validateTelegramUserId } = require('../lib/shared/input-validator');

const VALID_PERMISSIONS = [
  'stock_manage',
  'payment_verify',
  'store_control',
  'order_view',
  'customer_view',
];

class Admin {
  constructor(data) {
    this.id = data.id || null;
    this.telegram_user_id = validateTelegramUserId(data.telegram_user_id);
    this.name = data.name || null;
    this.username = data.username || null;
    this.permissions = Array.isArray(data.permissions)
      ? data.permissions
      : typeof data.permissions === 'string'
        ? JSON.parse(data.permissions)
        : [];
    this.notification_preferences =
      typeof data.notification_preferences === 'string'
        ? JSON.parse(data.notification_preferences)
        : data.notification_preferences || {};
    this.last_activity_timestamp = data.last_activity_timestamp || new Date();
    this.created_timestamp = data.created_timestamp || new Date();

    this.validate();
  }

  validate() {
    if (!this.telegram_user_id || this.telegram_user_id <= 0) {
      throw new ValidationError('Telegram user ID is required and must be positive');
    }

    // Validate permissions
    if (!Array.isArray(this.permissions) || this.permissions.length === 0) {
      throw new ValidationError('Admin must have at least one permission');
    }

    for (const permission of this.permissions) {
      if (!VALID_PERMISSIONS.includes(permission)) {
        throw new ValidationError(`Invalid permission: ${permission}`);
      }
    }
  }

  /**
   * Check if admin has specific permission
   * @param {string} permission Permission to check
   * @returns {boolean} True if admin has permission
   */
  hasPermission(permission) {
    return this.permissions.includes(permission);
  }

  /**
   * Check if admin has any of the specified permissions
   * @param {Array<string>} permissions Array of permissions
   * @returns {boolean} True if admin has at least one permission
   */
  hasAnyPermission(permissions) {
    return permissions.some((permission) => this.hasPermission(permission));
  }

  /**
   * Update last activity timestamp
   */
  updateActivity() {
    this.last_activity_timestamp = new Date();
  }

  toDatabase() {
    return {
      id: this.id,
      telegram_user_id: this.telegram_user_id,
      name: this.name,
      username: this.username,
      permissions: JSON.stringify(this.permissions),
      notification_preferences: JSON.stringify(this.notification_preferences),
      last_activity_timestamp: this.last_activity_timestamp,
      created_timestamp: this.created_timestamp,
    };
  }

  static fromDatabase(row) {
    if (!row) return null;
    return new Admin({
      id: row.id,
      telegram_user_id: row.telegram_user_id,
      name: row.name,
      username: row.username,
      permissions: row.permissions,
      notification_preferences: row.notification_preferences,
      last_activity_timestamp: row.last_activity_timestamp,
      created_timestamp: row.created_timestamp,
    });
  }
}

module.exports = Admin;
