/**
 * Redis pub/sub for real-time notification delivery
 * Publishes order status changes for immediate notification processing
 *
 * Task: T081
 * Requirement: FR-009, FR-010
 */

const { getRedis } = require('../shared/redis-client');
const logger = require('../shared/logger').child('notification-pubsub');

const CHANNEL_PREFIX = 'order:status:';

class NotificationPubSub {
  /**
   * Publish order status change event
   * @param {number} orderId Order ID
   * @param {string} status New order status
   * @param {Object} orderData Order data
   * @returns {Promise<void>}
   */
  async publishStatusChange(orderId, status, orderData = {}) {
    try {
      const redis = getRedis();
      const channel = `${CHANNEL_PREFIX}${orderId}`;
      const message = JSON.stringify({
        orderId,
        status,
        timestamp: new Date().toISOString(),
        ...orderData,
      });

      await redis.publish(channel, message);
      logger.info('Order status change published', { orderId, status, channel });
    } catch (error) {
      logger.error('Error publishing order status change', error, { orderId, status });
      throw error;
    }
  }

  /**
   * Subscribe to order status changes
   * @param {number} orderId Order ID
   * @param {Function} callback Callback function (orderId, status, data)
   * @returns {Promise<Function>} Unsubscribe function
   */
  async subscribeToOrder(orderId, callback) {
    try {
      const redis = getRedis();
      const channel = `${CHANNEL_PREFIX}${orderId}`;
      const subscriber = redis.duplicate();

      await subscriber.subscribe(channel);

      subscriber.on('message', (ch, message) => {
        if (ch === channel) {
          try {
            const data = JSON.parse(message);
            callback(data.orderId, data.status, data);
          } catch (error) {
            logger.error('Error parsing pub/sub message', error, { orderId, message });
          }
        }
      });

      logger.info('Subscribed to order status changes', { orderId, channel });

      // Return unsubscribe function
      return async () => {
        await subscriber.unsubscribe(channel);
        await subscriber.quit();
        logger.info('Unsubscribed from order status changes', { orderId, channel });
      };
    } catch (error) {
      logger.error('Error subscribing to order status changes', error, { orderId });
      throw error;
    }
  }

  /**
   * Subscribe to all order status changes (for notification service)
   * @param {Function} callback Callback function (orderId, status, data)
   * @returns {Promise<Function>} Unsubscribe function
   */
  async subscribeToAll(callback) {
    try {
      const redis = getRedis();
      const pattern = `${CHANNEL_PREFIX}*`;
      const subscriber = redis.duplicate();

      await subscriber.psubscribe(pattern);

      subscriber.on('pmessage', (pattern, channel, message) => {
        try {
          const data = JSON.parse(message);
          callback(data.orderId, data.status, data);
        } catch (error) {
          logger.error('Error parsing pub/sub message', error, { channel, message });
        }
      });

      logger.info('Subscribed to all order status changes', { pattern });

      // Return unsubscribe function
      return async () => {
        await subscriber.punsubscribe(pattern);
        await subscriber.quit();
        logger.info('Unsubscribed from all order status changes', { pattern });
      };
    } catch (error) {
      logger.error('Error subscribing to all order status changes', error);
      throw error;
    }
  }
}

module.exports = new NotificationPubSub();
