/**
 * Catalog Synchronization - Syncs product catalog after stock updates
 * Listens to stock updates and invalidates cache, updates availability
 *
 * Tasks: T080, T084, T085, T086, T087
 * Requirements: FR-010, FR-052, FR-104, FR-105
 * Feature: 002-friday-enhancement
 */

const stockNotifier = require('./stock-notifier');
const productRepository = require('../product-repository');
const redisClient = require('../../shared/redis-client');
const logger = require('../../shared/logger').child('catalog-sync');

class CatalogSync {
  constructor() {
    this.subscriber = null;
    this.isSubscribed = false;
  }

  /**
   * Synchronize catalog after stock update (T080)
   * Invalidates cache and updates availability status
   * @param {number} productId Product ID
   * @param {number} quantity New stock quantity
   * @returns {Promise<void>}
   */
  async syncCatalog(productId, quantity) {
    try {
      // Step 1: Invalidate product cache (T085)
      await this.invalidateProductCache(productId);

      // Step 2: Get product to check current availability status
      const product = await productRepository.findById(productId);
      if (!product) {
        logger.warn('Product not found for catalog sync', { productId });
        return;
      }

      // Step 3: Update availability status if needed (T104, T105)
      let newAvailabilityStatus = product.availability_status;

      if (quantity === 0 && product.availability_status !== 'out_of_stock') {
        // Stock reached zero - mark as out of stock (T104)
        newAvailabilityStatus = 'out_of_stock';
        await productRepository.updateAvailabilityStatus(productId, 'out_of_stock');
        logger.info('Product availability status updated to out_of_stock', {
          productId,
          reason: 'stock_reached_zero',
        });
      } else if (quantity > 0 && product.availability_status === 'out_of_stock') {
        // Stock added to out-of-stock product - mark as available (T105)
        newAvailabilityStatus = 'available';
        await productRepository.updateAvailabilityStatus(productId, 'available');
        logger.info('Product availability status updated to available', {
          productId,
          reason: 'stock_added',
        });
      }

      logger.debug('Catalog synchronized', {
        productId,
        quantity,
        availabilityStatus: newAvailabilityStatus,
      });
    } catch (error) {
      // Don't throw - cache sync failures shouldn't block operations (T086)
      logger.error('Error synchronizing catalog', error, {
        productId,
        quantity,
      });
    }
  }

  /**
   * Invalidate product cache (T085)
   * @param {number} productId Product ID
   * @returns {Promise<void>}
   */
  async invalidateProductCache(productId) {
    try {
      const client = redisClient.getRedis();
      if (!client) {
        logger.debug('Redis not available, skipping cache invalidation', {
          productId,
        });
        return;
      }

      // Invalidate product cache keys
      const cacheKeys = [
        `product:${productId}`,
        `product:${productId}:details`,
        'products:list',
        'products:catalog',
      ];

      for (const key of cacheKeys) {
        try {
          await client.del(key);
        } catch (error) {
          // Continue with other keys even if one fails
          logger.warn('Error deleting cache key', error, { key, productId });
        }
      }

      logger.debug('Product cache invalidated', {
        productId,
        keys: cacheKeys,
      });
    } catch (error) {
      // Don't throw - cache invalidation failures shouldn't block operations (T086)
      logger.error('Error invalidating product cache', error, { productId });
    }
  }

  /**
   * Subscribe to stock updates and sync catalog automatically (T084)
   * @returns {Promise<void>}
   */
  async startListening() {
    if (this.isSubscribed) {
      logger.warn('Already subscribed to stock updates');
      return;
    }

    try {
      this.subscriber = await stockNotifier.subscribeToUpdates((update) => {
        // Handle stock update notification
        this.handleStockUpdate(update);
      });

      if (this.subscriber) {
        this.isSubscribed = true;
        logger.info('Catalog sync started listening to stock updates');
      } else {
        logger.warn('Failed to subscribe to stock updates (Redis may be unavailable)');
      }
    } catch (error) {
      logger.error('Error starting catalog sync listener', error);
      this.isSubscribed = false;
    }
  }

  /**
   * Stop listening to stock updates
   * @returns {Promise<void>}
   */
  async stopListening() {
    if (!this.isSubscribed || !this.subscriber) {
      return;
    }

    try {
      await stockNotifier.unsubscribe(this.subscriber);
      this.subscriber = null;
      this.isSubscribed = false;
      logger.info('Catalog sync stopped listening to stock updates');
    } catch (error) {
      logger.error('Error stopping catalog sync listener', error);
      // Force cleanup even if unsubscribe fails
      this.subscriber = null;
      this.isSubscribed = false;
    }
  }

  /**
   * Handle stock update notification (T084)
   * @param {Object} update Stock update notification
   * @param {number} update.productId Product ID
   * @param {number} update.previousQuantity Previous quantity
   * @param {number} update.newQuantity New quantity
   * @param {number} update.adminId Admin ID
   * @param {string} update.timestamp Timestamp
   * @returns {Promise<void>}
   */
  async handleStockUpdate(update) {
    try {
      logger.info('Handling stock update notification', {
        productId: update.productId,
        previousQuantity: update.previousQuantity,
        newQuantity: update.newQuantity,
        adminId: update.adminId,
      });

      // Sync catalog with new quantity
      await this.syncCatalog(update.productId, update.newQuantity);

      logger.debug('Stock update processed and catalog synced', {
        productId: update.productId,
        newQuantity: update.newQuantity,
      });
    } catch (error) {
      logger.error('Error handling stock update notification', error, {
        update,
      });
    }
  }
}

module.exports = new CatalogSync();
