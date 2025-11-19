/**
 * Notification repository for database operations
 *
 * Task: T079
 * Requirement: FR-009, FR-010
 */

const { table } = require('../database/query-builder');
const Notification = require('../../models/notification');
const logger = require('../shared/logger').child('notification-repository');

class NotificationRepository {
  /**
   * Create a new notification
   * @param {Notification} notification Notification object
   * @returns {Promise<Notification>} Created notification with ID
   */
  async create(notification) {
    try {
      const [id] = await table('notifications').insert(notification.toDatabase()).returning('id');
      notification.id = id;
      logger.info(`Notification created with ID: ${id}`, {
        notificationId: id,
        orderId: notification.order_id,
        type: notification.type,
      });
      return notification;
    } catch (error) {
      logger.error('Error creating notification', error, {
        notificationData: notification.toDatabase(),
      });
      throw error;
    }
  }

  /**
   * Find notification by ID
   * @param {number} id Notification ID
   * @returns {Promise<Notification|null>} Notification object or null
   */
  async findById(id) {
    try {
      const row = await table('notifications').where({ id }).first();
      return Notification.fromDatabase(row);
    } catch (error) {
      logger.error('Error finding notification by ID', error, { notificationId: id });
      throw error;
    }
  }

  /**
   * Find notifications by order ID
   * @param {number} orderId Order ID
   * @returns {Promise<Array<Notification>>} List of notifications
   */
  async findByOrderId(orderId) {
    try {
      const rows = await table('notifications')
        .where({ order_id: orderId })
        .orderBy('sent_timestamp', 'asc');
      return rows.map(Notification.fromDatabase);
    } catch (error) {
      logger.error('Error finding notifications by order ID', error, { orderId });
      throw error;
    }
  }

  /**
   * Find pending notifications (for retry)
   * Note: This uses a custom field 'status' that may need to be tracked separately
   * For now, we'll use read_status as a proxy
   * @param {number} _maxRetries Maximum retry count (unused for now)
   * @returns {Promise<Array<Notification>>} List of pending notifications
   */
  async findPending(_maxRetries = 3) {
    // For now, return empty array as status tracking is handled in notification service
    // This can be enhanced with a separate tracking table if needed
    return [];
  }

  /**
   * Update notification
   * @param {Notification} notification Notification object
   * @returns {Promise<Notification>} Updated notification
   */
  async update(notification) {
    try {
      await table('notifications').where({ id: notification.id }).update(notification.toDatabase());
      logger.info(`Notification updated with ID: ${notification.id}`, {
        notificationId: notification.id,
        status: notification.status,
      });
      return notification;
    } catch (error) {
      logger.error('Error updating notification', error, {
        notificationData: notification.toDatabase(),
      });
      throw error;
    }
  }
}

module.exports = new NotificationRepository();
