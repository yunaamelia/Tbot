/**
 * Checkout timeout handling (abandoned checkout cleanup)
 * Automatically releases reserved stock after timeout period
 *
 * Task: T074
 * Requirement: EC-016, FR-004
 */

const checkoutSession = require('./checkout-session');
const orderService = require('./order-service');
const logger = require('../shared/logger').child('checkout-timeout');
const nodeCron = require('node-cron');

const TIMEOUT_MINUTES = 15; // EC-016: 15 minutes timeout

class CheckoutTimeoutHandler {
  constructor() {
    this.cronTask = null;
  }

  /**
   * Start periodic cleanup of abandoned checkouts (T074)
   * Runs every 5 minutes to check for abandoned sessions
   */
  startCleanupScheduler() {
    // Run cleanup every 5 minutes
    this.cronTask = nodeCron.schedule('*/5 * * * *', async () => {
      try {
        await this.cleanupAbandonedCheckouts();
      } catch (error) {
        logger.error('Error in checkout cleanup scheduler', error);
      }
    });

    logger.info('Checkout timeout cleanup scheduler started');
  }

  /**
   * Stop the cleanup scheduler
   * @returns {void}
   */
  stopCleanupScheduler() {
    if (this.cronTask) {
      this.cronTask.stop();
      this.cronTask = null;
      logger.info('Checkout timeout cleanup scheduler stopped');
    }
  }

  /**
   * Cleanup abandoned checkouts and release reserved stock
   * @returns {Promise<number>} Number of abandoned checkouts cleaned up
   */
  async cleanupAbandonedCheckouts() {
    try {
      const allSessions = await checkoutSession.getAllSessions();
      const now = new Date();
      let cleaned = 0;

      for (const session of allSessions) {
        const sessionAge = now - new Date(session.createdAt);
        const ageMinutes = sessionAge / (1000 * 60);

        // If session is older than timeout period and still in order_summary or payment_method step
        if (
          ageMinutes > TIMEOUT_MINUTES &&
          (session.step === 'order_summary' || session.step === 'payment_method')
        ) {
          try {
            // If order was created, cancel it to release stock
            if (session.orderId) {
              await orderService.cancelOrder(session.orderId);
              logger.info('Abandoned checkout order cancelled', {
                userId: session.userId,
                orderId: session.orderId,
              });
            }

            // Delete session
            await checkoutSession.deleteSession(session.userId);
            cleaned++;

            logger.info('Abandoned checkout cleaned up', {
              userId: session.userId,
              ageMinutes: Math.round(ageMinutes),
            });
          } catch (error) {
            logger.error('Error cleaning up abandoned checkout', error, {
              userId: session.userId,
            });
          }
        }
      }

      if (cleaned > 0) {
        logger.info('Abandoned checkouts cleaned up', { count: cleaned });
      }

      return cleaned;
    } catch (error) {
      logger.error('Error cleaning up abandoned checkouts', error);
      return 0;
    }
  }

  /**
   * Check if checkout session has timed out
   * @param {Object} session Session data
   * @returns {boolean} True if session has timed out
   */
  isTimedOut(session) {
    if (!session || !session.createdAt) {
      return true;
    }

    const now = new Date();
    const sessionAge = now - new Date(session.createdAt);
    const ageMinutes = sessionAge / (1000 * 60);

    return ageMinutes > TIMEOUT_MINUTES;
  }
}

module.exports = new CheckoutTimeoutHandler();
