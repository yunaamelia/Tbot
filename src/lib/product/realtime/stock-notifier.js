/**
 * Stock Notifier - Redis pub/sub for real-time stock updates
 * Publishes stock update notifications and subscribes to updates
 *
 * Tasks: T079, T086, T087
 * Requirements: FR-010, FR-052
 * Feature: 002-friday-enhancement
 */

const redisClient = require('../../shared/redis-client');
const logger = require('../../shared/logger').child('stock-notifier');

const STOCK_UPDATE_CHANNEL = 'stock:updated';

class StockNotifier {
  /**
   * Publish stock update notification to Redis (T079)
   * @param {number} productId Product ID
   * @param {number} previousQuantity Quantity before update
   * @param {number} newQuantity Quantity after update
   * @param {number} adminId Admin ID who made the update
   * @returns {Promise<void>}
   */
  async notifyStockUpdate(productId, previousQuantity, newQuantity, adminId) {
    try {
      // Skip Redis operations in test environment to prevent hanging
      if (process.env.NODE_ENV === 'test') {
        logger.debug('Skipping Redis publish in test environment', {
          productId,
          previousQuantity,
          newQuantity,
          adminId,
        });
        return;
      }

      const client = redisClient.getRedis();
      if (!client) {
        logger.warn('Redis not available, skipping stock update notification', {
          productId,
          previousQuantity,
          newQuantity,
          adminId,
        });
        return;
      }

      const message = {
        productId,
        previousQuantity,
        newQuantity,
        adminId,
        timestamp: new Date().toISOString(),
      };

      // ioredis uses publish method directly
      // Add timeout to prevent hanging in test environment
      await Promise.race([
        client.publish(STOCK_UPDATE_CHANNEL, JSON.stringify(message)),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Publish timeout')), 500);
        }),
      ]).catch((error) => {
        // If timeout or error, just log and continue
        if (error.message === 'Publish timeout') {
          logger.warn('Redis publish timeout, skipping notification', {
            productId,
            previousQuantity,
            newQuantity,
            adminId,
          });
        } else {
          throw error; // Re-throw other errors
        }
      });

      logger.info('Stock update notification published', {
        productId,
        previousQuantity,
        newQuantity,
        adminId,
        channel: STOCK_UPDATE_CHANNEL,
      });
    } catch (error) {
      // Don't throw - Redis failures shouldn't block stock updates (T086)
      logger.error('Error publishing stock update notification', error, {
        productId,
        previousQuantity,
        newQuantity,
        adminId,
      });
      // Continue execution even if notification fails
    }
  }

  /**
   * Subscribe to stock update notifications (T079)
   * @param {Function} callback Callback function (update) => void
   * @returns {Promise<void>}
   */
  async subscribeToUpdates(callback) {
    try {
      const client = redisClient.getRedis();
      if (!client) {
        logger.warn('Redis not available, cannot subscribe to stock updates');
        return null;
      }

      // Create subscriber client (duplicate connection for pub/sub)
      // Get Redis config from existing client
      const config = require('../../shared/config');
      const Redis = require('ioredis');
      const subscriber = new Redis({
        host: config.get('REDIS_HOST', 'localhost'),
        port: config.getInt('REDIS_PORT', 6379),
        password: config.get('REDIS_PASSWORD') || undefined,
        db: config.getInt('REDIS_DB', 0),
        retryStrategy: (times) => {
          // In test environment, disable retries to prevent hanging
          if (process.env.NODE_ENV === 'test') {
            return null; // Stop retrying
          }
          const delay = Math.min(times * 50, 2000);
          logger.warn(`Redis subscriber retry attempt ${times}, waiting ${delay}ms`);
          return delay;
        },
        maxRetriesPerRequest: process.env.NODE_ENV === 'test' ? 1 : 3,
        enableOfflineQueue: false, // Don't queue commands when offline
        lazyConnect: process.env.NODE_ENV === 'test', // Don't connect immediately in tests
        connectTimeout: process.env.NODE_ENV === 'test' ? 500 : 10000, // 500ms timeout in tests
        commandTimeout: process.env.NODE_ENV === 'test' ? 500 : 5000, // 500ms command timeout in tests
      });

      // In test environment, skip actual subscription to prevent hanging
      if (process.env.NODE_ENV === 'test') {
        logger.debug('Skipping Redis subscription in test environment');
        return null;
      }

      await subscriber.subscribe(STOCK_UPDATE_CHANNEL);

      subscriber.on('message', (channel, message) => {
        if (channel === STOCK_UPDATE_CHANNEL) {
          try {
            const update = JSON.parse(message);
            logger.debug('Stock update notification received', {
              productId: update.productId,
              previousQuantity: update.previousQuantity,
              newQuantity: update.newQuantity,
            });
            callback(update);
          } catch (error) {
            logger.error('Error parsing stock update notification', error, {
              message,
            });
          }
        }
      });

      logger.info('Subscribed to stock update notifications', {
        channel: STOCK_UPDATE_CHANNEL,
      });

      // Handle connection errors
      subscriber.on('error', (error) => {
        logger.error('Redis subscriber error', error);
      });

      // Return subscriber for cleanup
      return subscriber;
    } catch (error) {
      // Don't throw - Redis failures shouldn't block application (T086)
      logger.error('Error subscribing to stock updates', error);
      return null;
    }
  }

  /**
   * Unsubscribe from stock update notifications
   * @param {Object} subscriber Redis subscriber client
   * @returns {Promise<void>}
   */
  async unsubscribe(subscriber) {
    try {
      if (!subscriber) {
        return;
      }

      try {
        await subscriber.unsubscribe(STOCK_UPDATE_CHANNEL);
      } catch (error) {
        // Ignore if already unsubscribed
        logger.debug('Error unsubscribing from channel (may already be unsubscribed)', error);
      }

      try {
        await subscriber.quit();
      } catch (error) {
        // Try disconnect if quit fails
        try {
          await subscriber.disconnect();
        } catch (disconnectError) {
          logger.debug('Error disconnecting subscriber', disconnectError);
        }
      }

      logger.info('Unsubscribed from stock update notifications', {
        channel: STOCK_UPDATE_CHANNEL,
      });
    } catch (error) {
      logger.error('Error unsubscribing from stock updates', error);
    }
  }
}

module.exports = new StockNotifier();
