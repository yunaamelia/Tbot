/**
 * Notification retry scheduler
 * Periodically retries failed notifications
 *
 * Task: T091
 * Requirement: FR-011
 */

const notificationService = require('./notification-service');
const logger = require('../shared/logger').child('notification-retry-scheduler');
const nodeCron = require('node-cron');

class NotificationRetryScheduler {
  constructor() {
    this.cronTask = null;
  }

  /**
   * Start retry scheduler
   * Runs every 5 minutes to retry failed notifications
   */
  startScheduler() {
    // Run retry every 5 minutes
    this.cronTask = nodeCron.schedule('*/5 * * * *', async () => {
      try {
        const retried = await notificationService.retryFailedNotifications(3);
        if (retried > 0) {
          logger.info('Notification retry scheduler completed', { retried });
        }
      } catch (error) {
        logger.error('Error in notification retry scheduler', error);
      }
    });

    logger.info('Notification retry scheduler started');
  }

  /**
   * Stop the retry scheduler
   * @returns {void}
   */
  stopScheduler() {
    if (this.cronTask) {
      this.cronTask.stop();
      this.cronTask = null;
      logger.info('Notification retry scheduler stopped');
    }
  }
}

module.exports = new NotificationRetryScheduler();
