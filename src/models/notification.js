/**
 * Notification model
 * Represents order status notifications sent to customers
 *
 * Task: T078
 * Requirement: FR-009, FR-010, FR-011
 */

const { ValidationError } = require('../lib/shared/errors');
const { validatePositiveInteger } = require('../lib/shared/input-validator');

class Notification {
  constructor(data) {
    this.id = data.id || null;
    this.recipient_id = validatePositiveInteger(data.recipient_id, 'Recipient ID');
    this.recipient_type = data.recipient_type || 'customer'; // 'customer', 'admin'
    this.type = data.type || 'order_status'; // 'order_status', 'payment', 'admin_alert', 'system'
    this.content = data.content || null; // Notification message text
    this.rich_media_attachments = data.rich_media_attachments || null; // JSON data for media
    this.order_id = data.order_id || null;
    this.sent_timestamp = data.sent_timestamp || new Date();
    this.read_timestamp = data.read_timestamp || null;
    this.read_status = data.read_status || 'unread'; // 'unread', 'read'

    // Additional fields for notification service tracking
    this.notification_type = data.notification_type || null; // Internal: 'payment_received', 'processing', etc.
    this.status = data.status || 'sent'; // Internal: 'pending', 'sent', 'failed', 'retrying'
    this.retry_count = data.retry_count || 0;
    this.error_message = data.error_message || null;

    this.validate();
  }

  validate() {
    const validRecipientTypes = ['customer', 'admin'];
    if (!validRecipientTypes.includes(this.recipient_type)) {
      throw new ValidationError('Invalid recipient type');
    }

    const validTypes = ['order_status', 'payment', 'admin_alert', 'system'];
    if (!validTypes.includes(this.type)) {
      throw new ValidationError('Invalid notification type');
    }

    const validReadStatuses = ['unread', 'read'];
    if (!validReadStatuses.includes(this.read_status)) {
      throw new ValidationError('Invalid read status');
    }
  }

  /**
   * Mark notification as sent
   */
  markSent() {
    this.status = 'sent';
    this.sent_timestamp = new Date();
  }

  /**
   * Mark notification as failed
   * @param {string} errorMessage Error message
   */
  markFailed(errorMessage) {
    this.status = 'failed';
    this.error_message = errorMessage;
  }

  /**
   * Increment retry count
   */
  incrementRetry() {
    this.retry_count += 1;
    this.status = 'retrying';
  }

  /**
   * Mark as read
   */
  markRead() {
    this.read_status = 'read';
    this.read_timestamp = new Date();
  }

  toDatabase() {
    return {
      id: this.id,
      recipient_id: this.recipient_id,
      recipient_type: this.recipient_type,
      type: this.type,
      content: this.content,
      rich_media_attachments: this.rich_media_attachments
        ? JSON.stringify(this.rich_media_attachments)
        : null,
      order_id: this.order_id,
      sent_timestamp: this.sent_timestamp,
      read_timestamp: this.read_timestamp,
      read_status: this.read_status,
    };
  }

  static fromDatabase(row) {
    if (!row) return null;
    return new Notification({
      id: row.id,
      recipient_id: row.recipient_id,
      recipient_type: row.recipient_type,
      type: row.type,
      content: row.content,
      rich_media_attachments: row.rich_media_attachments
        ? typeof row.rich_media_attachments === 'string'
          ? JSON.parse(row.rich_media_attachments)
          : row.rich_media_attachments
        : null,
      order_id: row.order_id,
      sent_timestamp: row.sent_timestamp,
      read_timestamp: row.read_timestamp,
      read_status: row.read_status,
    });
  }
}

module.exports = Notification;
