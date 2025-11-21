/**
 * Product service with business logic
 * Uses async operations to keep bot non-blocking (FR-041, Article XI)
 *
 * Task: T031
 * Requirement: FR-001, FR-002, FR-041
 */

const productRepository = require('./product-repository');
const { NotFoundError } = require('../shared/errors');
const logger = require('../shared/logger').child('product-service');

class ProductService {
  /**
   * Get all available products for browsing
   * @returns {Promise<Array>}
   */
  async getAllProducts() {
    try {
      const products = await productRepository.findAvailable();
      return products;
    } catch (error) {
      logger.error('Error getting all products', error);
      throw error;
    }
  }

  /**
   * Get product by ID
   * @param {number} productId Product ID
   * @returns {Promise<Product>}
   * @throws {NotFoundError} If product not found
   */
  async getProductById(productId) {
    try {
      const product = await productRepository.findById(productId);
      if (!product) {
        throw new NotFoundError(`Product with ID ${productId} not found`);
      }
      return product;
    } catch (error) {
      logger.error('Error getting product by ID', error, { productId });
      throw error;
    }
  }

  /**
   * Get products by category
   * @param {string} category Category name
   * @returns {Promise<Array>}
   */
  async getProductsByCategory(category) {
    try {
      const products = await productRepository.findByCategory(category);
      return products.filter((product) => product.isAvailable());
    } catch (error) {
      logger.error('Error getting products by category', error, { category });
      throw error;
    }
  }

  /**
   * Get product count
   * @returns {Promise<number>}
   */
  async getProductCount() {
    try {
      return await productRepository.count();
    } catch (error) {
      logger.error('Error getting product count', error);
      throw error;
    }
  }

  /**
   * Check if product catalog is empty
   * @returns {Promise<boolean>}
   */
  async isCatalogEmpty() {
    try {
      const count = await this.getProductCount();
      return count === 0;
    } catch (error) {
      logger.error('Error checking if catalog is empty', error);
      throw error;
    }
  }

  /**
   * Get product at index (for carousel navigation)
   * @param {number} index Product index (0-based)
   * @returns {Promise<Product|null>}
   */
  async getProductAtIndex(index) {
    try {
      const products = await this.getAllProducts();
      if (index < 0 || index >= products.length) {
        return null;
      }
      return products[index];
    } catch (error) {
      logger.error('Error getting product at index', error, { index });
      throw error;
    }
  }

  /**
   * Get total product count for carousel
   * @returns {Promise<number>}
   */
  async getTotalProductCount() {
    try {
      const products = await this.getAllProducts();
      return products.length;
    } catch (error) {
      logger.error('Error getting total product count', error);
      throw error;
    }
  }

  /**
   * Create a new product
   * @param {Object} productData Product data
   * @returns {Promise<Product>} Created product
   */
  async createProduct(productData) {
    try {
      const Product = require('../../models/product');
      const product = new Product(productData);
      const createdProduct = await productRepository.create(product);

      // Create stock record
      const stockRepository = require('./stock-repository');
      const Stock = require('../../models/stock');
      const stock = new Stock({
        product_id: createdProduct.id,
        current_quantity: productData.stock_quantity || 0,
        reserved_quantity: 0,
      });
      await stockRepository.upsert(stock);

      logger.info('Product created', { productId: createdProduct.id, name: createdProduct.name });
      return createdProduct;
    } catch (error) {
      logger.error('Error creating product', error, { productData });
      throw error;
    }
  }
}

module.exports = new ProductService();
