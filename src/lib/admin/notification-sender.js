/**
 * Notification sender using Telegram Bot API
 * Sends rich media notifications to customers
 *
 * Task: T083
 * Requirement: FR-009, FR-010, FR-011
 */

const { getBot } = require('../telegram/api-client');
const customerService = require('../customer/customer-service');
const logger = require('../shared/logger').child('notification-sender');

class NotificationSender {
  /**
   * Send notification to customer
   * @param {number} customerId Customer ID
   * @param {Object} notificationData Notification data with message and media
   * @returns {Promise<boolean>} True if sent successfully
   */
  async sendNotification(customerId, notificationData) {
    try {
      // Get customer Telegram user ID
      const customer = await customerService.getCustomerById(customerId);
      if (!customer) {
        throw new Error(`Customer with ID ${customerId} not found`);
      }

      const bot = getBot();
      const telegramUserId = customer.telegram_user_id;

      // Send based on media type
      if (notificationData.media_type === 'photo' && notificationData.photo) {
        await bot.telegram.sendPhoto(telegramUserId, notificationData.photo, {
          caption: notificationData.text,
          parse_mode: notificationData.parse_mode || 'Markdown',
        });
      } else if (notificationData.media_type === 'document' && notificationData.document) {
        await bot.telegram.sendDocument(telegramUserId, notificationData.document, {
          caption: notificationData.text,
          parse_mode: notificationData.parse_mode || 'Markdown',
        });
      } else if (notificationData.media_type === 'media_group' && notificationData.media) {
        await bot.telegram.sendMediaGroup(telegramUserId, notificationData.media);
        // Also send text message if provided
        if (notificationData.text) {
          await bot.telegram.sendMessage(telegramUserId, notificationData.text, {
            parse_mode: notificationData.parse_mode || 'Markdown',
          });
        }
      } else {
        // Text-only notification
        await bot.telegram.sendMessage(telegramUserId, notificationData.text, {
          parse_mode: notificationData.parse_mode || 'Markdown',
        });
      }

      logger.info('Notification sent successfully', {
        customerId,
        telegramUserId,
        type: notificationData.notification_type,
      });

      return true;
    } catch (error) {
      logger.error('Error sending notification', error, {
        customerId,
        notificationData: notificationData.notification_type,
      });
      throw error;
    }
  }

  /**
   * Send notification with retry logic (T091)
   * @param {number} customerId Customer ID
   * @param {Object} notificationData Notification data
   * @param {number} maxRetries Maximum retry attempts
   * @returns {Promise<boolean>} True if sent successfully
   */
  async sendNotificationWithRetry(customerId, notificationData, maxRetries = 3) {
    let lastError = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        await this.sendNotification(customerId, notificationData);
        return true;
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries) {
          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, attempt) * 1000;
          logger.warn(`Notification send failed, retrying in ${delay}ms`, {
            customerId,
            attempt: attempt + 1,
            maxRetries,
          });
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    logger.error('Notification send failed after all retries', lastError, {
      customerId,
      maxRetries,
    });
    throw lastError;
  }
}

module.exports = new NotificationSender();
