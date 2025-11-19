/**
 * Stock manager with stock update logic
 * Handles stock updates and automatic product availability changes
 *
 * Task: T097
 * Requirement: FR-010, FR-052, FR-104, FR-105
 */

const stockRepository = require('./stock-repository');
const productRepository = require('./product-repository');
const { NotFoundError, ConflictError } = require('../shared/errors');
const logger = require('../shared/logger').child('stock-manager');

class StockManager {
  /**
   * Update stock quantity for a product (T099, T104, T105)
   * Automatically updates product availability status
   * @param {number} productId Product ID
   * @param {number} newQuantity New stock quantity
   * @param {number} adminId Admin ID performing the update
   * @returns {Promise<Object>} Updated stock and product
   */
  async updateStock(productId, newQuantity, adminId) {
    try {
      if (newQuantity < 0) {
        throw new ConflictError('Stock quantity cannot be negative');
      }

      // Get current stock
      const stock = await stockRepository.findByProductId(productId);
      if (!stock) {
        throw new NotFoundError(`Stock not found for product ${productId}`);
      }

      // Get product
      const product = await productRepository.findById(productId);
      if (!product) {
        throw new NotFoundError(`Product with ID ${productId} not found`);
      }

      // Update stock quantity
      const updatedStock = await stockRepository.updateQuantity(productId, newQuantity, adminId);

      // Determine new availability status (T104, T105)
      let newAvailabilityStatus = product.availability_status;

      if (newQuantity === 0) {
        // Stock reached zero - mark as out of stock (T104)
        newAvailabilityStatus = 'out_of_stock';
      } else if (product.availability_status === 'out_of_stock' && newQuantity > 0) {
        // Stock added to out-of-stock product - mark as available (T105)
        newAvailabilityStatus = 'available';
      }

      // Update product availability status if changed
      if (newAvailabilityStatus !== product.availability_status) {
        await productRepository.updateAvailabilityStatus(productId, newAvailabilityStatus);
        logger.info('Product availability status updated', {
          productId,
          oldStatus: product.availability_status,
          newStatus: newAvailabilityStatus,
        });
      }

      // Update product stock_quantity to match
      await productRepository.updateStockQuantity(productId, newQuantity);

      logger.info('Stock updated successfully', {
        productId,
        oldQuantity: stock.current_quantity,
        newQuantity,
        adminId,
      });

      return {
        stock: updatedStock,
        product: {
          ...product.toDatabase(),
          stock_quantity: newQuantity,
          availability_status: newAvailabilityStatus,
        },
      };
    } catch (error) {
      logger.error('Error updating stock', error, { productId, newQuantity, adminId });
      throw error;
    }
  }

  /**
   * Get stock information for a product
   * @param {number} productId Product ID
   * @returns {Promise<Object>} Stock information
   */
  async getStockInfo(productId) {
    try {
      const stock = await stockRepository.findByProductId(productId);
      if (!stock) {
        throw new NotFoundError(`Stock not found for product ${productId}`);
      }

      const product = await productRepository.findById(productId);
      if (!product) {
        throw new NotFoundError(`Product with ID ${productId} not found`);
      }

      return {
        productId,
        currentQuantity: stock.current_quantity,
        reservedQuantity: stock.reserved_quantity,
        availableQuantity: stock.current_quantity - stock.reserved_quantity,
        productName: product.name,
        availabilityStatus: product.availability_status,
      };
    } catch (error) {
      logger.error('Error getting stock info', error, { productId });
      throw error;
    }
  }
}

module.exports = new StockManager();
