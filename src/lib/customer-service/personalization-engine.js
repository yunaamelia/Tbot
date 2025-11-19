/**
 * Personalization engine for customer experience
 * Provides name, purchase history, and behavior-based recommendations (FR-018)
 *
 * Task: T142
 * Requirement: FR-018, FR-030
 */

const customerService = require('../customer/customer-service');
const orderRepository = require('../order/order-repository');
const productRepository = require('../product/product-repository');
const productService = require('../product/product-service');
const logger = require('../shared/logger').child('personalization-engine');

class PersonalizationEngine {
  /**
   * Get personalized greeting with customer name
   * @param {number} customerTelegramId Customer Telegram user ID
   * @returns {Promise<string>} Personalized greeting
   */
  async getPersonalizedGreeting(customerTelegramId) {
    try {
      const customer = await customerService.findByTelegramId(customerTelegramId);
      if (customer && customer.name) {
        return `Halo, ${customer.name}! 👋`;
      }
      return 'Halo! 👋';
    } catch (error) {
      logger.error('Error getting personalized greeting', error, {
        customerTelegramId,
      });
      return 'Halo! 👋';
    }
  }

  /**
   * Get purchase history-based recommendations
   * Suggests products based on past purchases (FR-018)
   * @param {number} customerTelegramId Customer Telegram user ID
   * @param {number} limit Maximum number of recommendations
   * @returns {Promise<Array>} Array of recommended products
   */
  async getPurchaseHistoryRecommendations(customerTelegramId, limit = 3) {
    try {
      const customer = await customerService.findByTelegramId(customerTelegramId);
      if (!customer || !customer.purchase_history || customer.purchase_history.length === 0) {
        // No purchase history - return default recommendations
        return this.getDefaultRecommendations(limit);
      }

      // Get all orders from purchase history
      const orders = await Promise.all(
        customer.purchase_history.map((orderId) => orderRepository.findById(orderId))
      );

      // Filter out null orders
      const validOrders = orders.filter((order) => order !== null);

      if (validOrders.length === 0) {
        return this.getDefaultRecommendations(limit);
      }

      // Extract product categories from purchase history
      const categoryCounts = {};
      const productIds = new Set();

      for (const order of validOrders) {
        const product = await productRepository.findById(order.product_id);
        if (product && product.category) {
          categoryCounts[product.category] = (categoryCounts[product.category] || 0) + 1;
          productIds.add(product.id);
        }
      }

      // Find most purchased category
      const topCategory = Object.keys(categoryCounts).reduce((a, b) =>
        categoryCounts[a] > categoryCounts[b] ? a : b
      );

      // Get products from same category (excluding already purchased)
      const recommendations = await productRepository.findByCategory(topCategory);
      const filtered = recommendations
        .filter(
          (product) => !productIds.has(product.id) && product.availability_status === 'available'
        )
        .slice(0, limit);

      // If not enough recommendations, add popular products
      if (filtered.length < limit) {
        const popular = await this.getPopularProducts(limit - filtered.length);
        const popularFiltered = popular.filter(
          (product) => !productIds.has(product.id) && !filtered.some((p) => p.id === product.id)
        );
        filtered.push(...popularFiltered.slice(0, limit - filtered.length));
      }

      return filtered.length > 0 ? filtered : this.getDefaultRecommendations(limit);
    } catch (error) {
      logger.error('Error getting purchase history recommendations', error, {
        customerTelegramId,
      });
      return this.getDefaultRecommendations(limit);
    }
  }

  /**
   * Get behavior-based recommendations
   * Suggests products based on browsing patterns (FR-018, FR-030)
   * @param {number} customerTelegramId Customer Telegram user ID
   * @param {number} limit Maximum number of recommendations
   * @returns {Promise<Array>} Array of recommended products
   */
  async getBehaviorBasedRecommendations(customerTelegramId, limit = 3) {
    try {
      const customer = await customerService.findByTelegramId(customerTelegramId);
      if (!customer || !customer.behavior_patterns) {
        return this.getDefaultRecommendations(limit);
      }

      const behavior = customer.behavior_patterns;
      const browsedProducts = behavior.browsed_products || [];
      const categoryPreferences = behavior.category_preferences || {};

      // If customer has browsed products, recommend similar ones
      if (browsedProducts.length > 0) {
        const browsedProductIds = new Set(browsedProducts);
        const recommendations = [];

        // Get products from browsed categories
        for (const productId of browsedProducts.slice(0, 5)) {
          const product = await productRepository.findById(productId);
          if (product && product.category) {
            const similar = await productRepository.findByCategory(product.category);
            const filtered = similar.filter(
              (p) =>
                !browsedProductIds.has(p.id) &&
                p.availability_status === 'available' &&
                recommendations.length < limit
            );
            recommendations.push(...filtered);
          }
        }

        if (recommendations.length >= limit) {
          return recommendations.slice(0, limit);
        }
      }

      // Use category preferences if available
      if (Object.keys(categoryPreferences).length > 0) {
        const topCategory = Object.keys(categoryPreferences).reduce((a, b) =>
          categoryPreferences[a] > categoryPreferences[b] ? a : b
        );

        const categoryProducts = await productRepository.findByCategory(topCategory);
        const filtered = categoryProducts
          .filter((product) => product.availability_status === 'available')
          .slice(0, limit);

        if (filtered.length > 0) {
          return filtered;
        }
      }

      // Fallback to default recommendations
      return this.getDefaultRecommendations(limit);
    } catch (error) {
      logger.error('Error getting behavior-based recommendations', error, {
        customerTelegramId,
      });
      return this.getDefaultRecommendations(limit);
    }
  }

  /**
   * Get default recommendations for customers with no history
   * Returns popular products or category-based suggestions (FR-018, EC-012)
   * @param {number} limit Maximum number of recommendations
   * @returns {Promise<Array>} Array of recommended products
   */
  async getDefaultRecommendations(limit = 3) {
    try {
      // Get popular products (most ordered)
      return await this.getPopularProducts(limit);
    } catch (error) {
      logger.error('Error getting default recommendations', error);
      // Fallback: get any available products
      const products = await productService.getAllProducts();
      return products.filter((p) => p.availability_status === 'available').slice(0, limit);
    }
  }

  /**
   * Get popular products based on order count
   * @param {number} limit Maximum number of products
   * @returns {Promise<Array>} Array of popular products
   */
  async getPopularProducts(limit = 3) {
    try {
      // Get products ordered by number of orders
      const { table } = require('../database/query-builder');
      const popularProducts = await table('orders')
        .select('products.*')
        .count('orders.id as order_count')
        .join('products', 'orders.product_id', 'products.id')
        .where('products.availability_status', 'available')
        .groupBy('products.id')
        .orderBy('order_count', 'desc')
        .limit(limit);

      // Map to Product objects
      const products = await Promise.all(
        popularProducts.map(async (row) => {
          // eslint-disable-next-line no-unused-vars
          const { order_count, ...productData } = row;
          return productRepository.findById(productData.id);
        })
      );

      // Filter out null products
      return products.filter((p) => p !== null);
    } catch (error) {
      logger.error('Error getting popular products', error);
      // Fallback: get any available products
      const products = await productService.getAllProducts();
      return products.filter((p) => p.availability_status === 'available').slice(0, limit);
    }
  }

  /**
   * Update customer behavior patterns
   * Tracks browsing patterns for personalization (FR-018)
   * @param {number} customerTelegramId Customer Telegram user ID
   * @param {number} productId Product ID that was browsed
   * @returns {Promise<void>}
   */
  async updateBrowsingBehavior(customerTelegramId, productId) {
    try {
      const customer = await customerService.findByTelegramId(customerTelegramId);
      if (!customer) {
        return;
      }

      const product = await productRepository.findById(productId);
      if (!product) {
        return;
      }

      const behavior = customer.behavior_patterns || {};
      const browsedProducts = behavior.browsed_products || [];

      // Add product to browsed list (keep last 20)
      if (!browsedProducts.includes(productId)) {
        browsedProducts.push(productId);
        if (browsedProducts.length > 20) {
          browsedProducts.shift();
        }
      }

      // Update category preferences
      if (product.category) {
        const categoryPreferences = behavior.category_preferences || {};
        categoryPreferences[product.category] = (categoryPreferences[product.category] || 0) + 1;
        behavior.category_preferences = categoryPreferences;
      }

      behavior.browsed_products = browsedProducts;
      behavior.last_browsed = new Date().toISOString();

      // Update customer behavior patterns
      const { table } = require('../database/query-builder');
      await table('customers').where('id', customer.id).update({
        behavior_patterns: behavior,
        last_activity_timestamp: new Date(),
      });

      logger.debug('Browsing behavior updated', {
        customerId: customer.id,
        productId,
        category: product.category,
      });
    } catch (error) {
      logger.error('Error updating browsing behavior', error, {
        customerTelegramId,
        productId,
      });
      // Don't throw - this is a non-critical operation
    }
  }

  /**
   * Update purchase frequency in behavior patterns
   * @param {number} customerTelegramId Customer Telegram user ID
   * @returns {Promise<void>}
   */
  async updatePurchaseFrequency(customerTelegramId) {
    try {
      const customer = await customerService.findByTelegramId(customerTelegramId);
      if (!customer) {
        return;
      }

      const behavior = customer.behavior_patterns || {};
      const purchaseHistory = customer.purchase_history || [];

      // Calculate purchase frequency
      let frequency = 'low';
      if (purchaseHistory.length >= 10) {
        frequency = 'high';
      } else if (purchaseHistory.length >= 3) {
        frequency = 'medium';
      }

      behavior.purchase_frequency = frequency;
      behavior.last_purchase = new Date().toISOString();

      // Update customer behavior patterns
      const { table } = require('../database/query-builder');
      await table('customers').where('id', customer.id).update({
        behavior_patterns: behavior,
      });

      logger.debug('Purchase frequency updated', {
        customerId: customer.id,
        frequency,
        purchaseCount: purchaseHistory.length,
      });
    } catch (error) {
      logger.error('Error updating purchase frequency', error, {
        customerTelegramId,
      });
      // Don't throw - this is a non-critical operation
    }
  }
}

module.exports = new PersonalizationEngine();
