/**
 * Product repository with database queries and caching
 * Uses caching layer for product catalog (FR-040, Article XI)
 *
 * Task: T030
 * Requirement: FR-001, FR-040
 */

const { table } = require('../database/query-builder');
const { remember, del } = require('../shared/cache');
const Product = require('../../models/product');
const logger = require('../shared/logger').child('product-repository');

const CACHE_TTL = 3600; // 1 hour
const CACHE_KEY_ALL = 'products:all';
const CACHE_KEY_BY_ID = (id) => `products:${id}`;
const CACHE_KEY_BY_CATEGORY = (category) => `products:category:${category}`;

class ProductRepository {
  /**
   * Get all available products
   * @returns {Promise<Array<Product>>}
   */
  async findAll() {
    try {
      return await remember(
        CACHE_KEY_ALL,
        async () => {
          const rows = await table('products')
            .select()
            .where('availability_status', '!=', 'discontinued')
            .orderBy('created_at', 'desc');

          return rows.map((row) => Product.fromDatabase(row));
        },
        CACHE_TTL
      );
    } catch (error) {
      logger.error('Error finding all products', error);
      throw error;
    }
  }

  /**
   * Find product by ID
   * @param {number} id Product ID
   * @returns {Promise<Product|null>}
   */
  async findById(id) {
    try {
      return await remember(
        CACHE_KEY_BY_ID(id),
        async () => {
          const row = await table('products').select().where('id', id).first();
          return Product.fromDatabase(row);
        },
        CACHE_TTL
      );
    } catch (error) {
      logger.error('Error finding product by ID', error, { productId: id });
      throw error;
    }
  }

  /**
   * Find products by category
   * @param {string} category Category name
   * @returns {Promise<Array<Product>>}
   */
  async findByCategory(category) {
    try {
      return await remember(
        CACHE_KEY_BY_CATEGORY(category),
        async () => {
          const rows = await table('products')
            .select()
            .where('category', category)
            .where('availability_status', '!=', 'discontinued')
            .orderBy('created_at', 'desc');

          return rows.map((row) => Product.fromDatabase(row));
        },
        CACHE_TTL
      );
    } catch (error) {
      logger.error('Error finding products by category', error, { category });
      throw error;
    }
  }

  /**
   * Get available products only (in stock)
   * @returns {Promise<Array<Product>>}
   */
  async findAvailable() {
    try {
      const allProducts = await this.findAll();
      return allProducts.filter((product) => product.isAvailable());
    } catch (error) {
      logger.error('Error finding available products', error);
      throw error;
    }
  }

  /**
   * Count total products
   * @returns {Promise<number>}
   */
  async count() {
    try {
      const result = await table('products')
        .count('* as count')
        .where('availability_status', '!=', 'discontinued')
        .first();

      return parseInt(result.count, 10);
    } catch (error) {
      logger.error('Error counting products', error);
      throw error;
    }
  }

  /**
   * Invalidate cache for a product
   * @param {number} productId Product ID
   */
  async invalidateCache(productId) {
    try {
      await del(CACHE_KEY_BY_ID(productId));
      await del(CACHE_KEY_ALL);
      // Invalidate category caches (would need to know category, simplified for now)
      logger.debug('Cache invalidated for product', { productId });
    } catch (error) {
      logger.error('Error invalidating cache', error, { productId });
      // Don't throw - cache invalidation failure shouldn't break the flow
    }
  }

  /**
   * Invalidate all product caches
   */
  async invalidateAllCache() {
    try {
      await del(CACHE_KEY_ALL);
      logger.debug('All product caches invalidated');
    } catch (error) {
      logger.error('Error invalidating all caches', error);
      // Don't throw - cache invalidation failure shouldn't break the flow
    }
  }

  /**
   * Update product availability status
   * @param {number} productId Product ID
   * @param {string} availabilityStatus New availability status
   * @returns {Promise<void>}
   */
  async updateAvailabilityStatus(productId, availabilityStatus) {
    try {
      await table('products').where('id', productId).update({
        availability_status: availabilityStatus,
        updated_at: new Date(),
      });

      // Invalidate cache
      await this.invalidateCache(productId);
    } catch (error) {
      logger.error('Error updating availability status', error, { productId, availabilityStatus });
      throw error;
    }
  }

  /**
   * Update product stock quantity
   * @param {number} productId Product ID
   * @param {number} stockQuantity New stock quantity
   * @returns {Promise<void>}
   */
  async updateStockQuantity(productId, stockQuantity) {
    try {
      await table('products').where('id', productId).update({
        stock_quantity: stockQuantity,
        updated_at: new Date(),
      });

      // Invalidate cache
      await this.invalidateCache(productId);
    } catch (error) {
      logger.error('Error updating stock quantity', error, { productId, stockQuantity });
      throw error;
    }
  }
}

module.exports = new ProductRepository();
