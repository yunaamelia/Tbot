/**
 * Notification service with rich media support
 * Handles notification creation, delivery, and retry logic
 *
 * Task: T080
 * Requirement: FR-009, FR-010, FR-011, FR-090
 */

const notificationRepository = require('./notification-repository');
const notificationSender = require('./notification-sender');
const notificationTemplates = require('../shared/notification-templates');
const orderRepository = require('../order/order-repository');
const Notification = require('../../models/notification');
const logger = require('../shared/logger').child('notification-service');

const DELIVERY_TIMEOUT_MS = 10000; // 10 seconds (FR-090)

class NotificationService {
  /**
   * Send order status notification
   * @param {number} orderId Order ID
   * @param {string} notificationType Notification type
   * @param {Object} additionalData Additional data for template
   * @returns {Promise<Notification>} Created notification
   */
  async sendOrderStatusNotification(orderId, notificationType, additionalData = {}) {
    try {
      // Get order data
      const order = await orderRepository.findById(orderId);
      if (!order) {
        throw new Error(`Order with ID ${orderId} not found`);
      }

      // Get template based on notification type
      let templateData;
      switch (notificationType) {
        case 'payment_received':
          templateData = notificationTemplates.paymentReceived({
            ...order.toDatabase(),
            ...additionalData,
          });
          break;
        case 'processing':
          templateData = notificationTemplates.orderProcessing({
            ...order.toDatabase(),
            ...additionalData,
          });
          break;
        case 'account_delivered':
          templateData = notificationTemplates.accountDelivered(
            { ...order.toDatabase(), ...additionalData },
            additionalData.encryptedCredentials
          );
          break;
        case 'completed':
          templateData = notificationTemplates.orderCompleted({
            ...order.toDatabase(),
            ...additionalData,
          });
          break;
        case 'payment_failed':
          templateData = notificationTemplates.paymentFailed(
            { ...order.toDatabase(), ...additionalData },
            additionalData.reason
          );
          break;
        default:
          throw new Error(`Unknown notification type: ${notificationType}`);
      }

      // Create notification record
      const notification = new Notification({
        recipient_id: order.customer_id,
        recipient_type: 'customer',
        type: 'order_status',
        content: templateData.text,
        rich_media_attachments: templateData.media || null,
        order_id: orderId,
        notification_type: notificationType, // Internal tracking
        status: 'pending', // Internal tracking
      });

      await notificationRepository.create(notification);

      // Send notification with timeout (FR-090)
      const sendPromise = notificationSender.sendNotificationWithRetry(order.customer_id, {
        text: templateData.text,
        parse_mode: templateData.parse_mode || 'Markdown',
        media_type: templateData.media_type || 'text',
        notification_type: notificationType,
        media: templateData.media || null,
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Notification delivery timeout')), DELIVERY_TIMEOUT_MS)
      );

      try {
        await Promise.race([sendPromise, timeoutPromise]);
        notification.markSent();
        await notificationRepository.update(notification);

        logger.info('Order status notification sent', {
          orderId,
          notificationId: notification.id,
          type: notificationType,
        });
      } catch (error) {
        notification.markFailed(error.message);
        await notificationRepository.update(notification);

        logger.error('Order status notification failed', error, {
          orderId,
          notificationId: notification.id,
          type: notificationType,
        });

        // Will be retried by retry mechanism
      }

      return notification;
    } catch (error) {
      logger.error('Error sending order status notification', error, {
        orderId,
        notificationType,
      });
      throw error;
    }
  }

  /**
   * Retry failed notifications (T091)
   * @param {number} _maxRetries Maximum retry count (unused for now, tracked in notification model)
   * @returns {Promise<number>} Number of notifications retried
   */
  async retryFailedNotifications(_maxRetries = 3) {
    try {
      const pendingNotifications = await notificationRepository.findPending(_maxRetries);
      let retried = 0;

      for (const notification of pendingNotifications) {
        try {
          notification.incrementRetry();
          await notificationRepository.update(notification);

          const order = await orderRepository.findById(notification.order_id);
          if (!order) {
            continue;
          }

          await notificationSender.sendNotificationWithRetry(notification.recipient_id, {
            text: notification.content,
            parse_mode: 'Markdown',
            media_type: notification.rich_media_attachments ? 'media_group' : 'text',
            notification_type: notification.notification_type,
            media: notification.rich_media_attachments || null,
          });

          notification.markSent();
          await notificationRepository.update(notification);
          retried++;

          logger.info('Failed notification retried successfully', {
            notificationId: notification.id,
            orderId: notification.order_id,
          });
        } catch (error) {
          logger.error('Error retrying notification', error, {
            notificationId: notification.id,
          });
        }
      }

      return retried;
    } catch (error) {
      logger.error('Error retrying failed notifications', error);
      return 0;
    }
  }
}

module.exports = new NotificationService();
