/**
 * Stock manager with stock update logic
 * Handles stock updates and automatic product availability changes
 * Implements real-time stock management with Redis pub/sub
 *
 * Tasks: T081, T082, T083, T087, T087A
 * Requirement: FR-010, FR-052, FR-104, FR-105
 * Feature: 002-friday-enhancement
 */

const stockRepository = require('./stock-repository');
const productRepository = require('./product-repository');
const stockNotifier = require('./realtime/stock-notifier');
const { transaction } = require('../database/query-builder');
const { NotFoundError, ConflictError } = require('../shared/errors');
const logger = require('../shared/logger').child('stock-manager');

class StockManager {
  /**
   * Update stock quantity for a product (T099, T104, T105, T081, T082, T083, T087A)
   * Automatically updates product availability status
   * Publishes Redis notifications for real-time updates
   * Uses database transactions for atomicity
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

      // Use database transaction for atomicity (T087A)
      return await transaction(async (trx) => {
        // Get current stock with row-level locking
        const stock = await stockRepository.findByProductId(productId);
        if (!stock) {
          throw new NotFoundError(`Stock not found for product ${productId}`);
        }

        // Get product
        const product = await productRepository.findById(productId);
        if (!product) {
          throw new NotFoundError(`Product with ID ${productId} not found`);
        }

        const previousQuantity = stock.current_quantity;

        // Update stock quantity with history tracking (T082, T083)
        const updatedStock = await stockRepository.updateQuantity(
          productId,
          newQuantity,
          adminId,
          trx
        );

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
          await productRepository.updateAvailabilityStatus(productId, newAvailabilityStatus, trx);
          logger.info('Product availability status updated', {
            productId,
            oldStatus: product.availability_status,
            newStatus: newAvailabilityStatus,
          });
        }

        // Update product stock_quantity to match
        await productRepository.updateStockQuantity(productId, newQuantity, trx);

        // Publish Redis notification for real-time updates (T081)
        // Do this after transaction succeeds to ensure consistency
        try {
          await stockNotifier.notifyStockUpdate(productId, previousQuantity, newQuantity, adminId);
        } catch (notificationError) {
          // Don't throw - notification failures shouldn't block stock updates (T086)
          logger.error('Error publishing stock update notification', notificationError, {
            productId,
            previousQuantity,
            newQuantity,
            adminId,
          });
        }

        logger.info('Stock updated successfully', {
          productId,
          oldQuantity: previousQuantity,
          newQuantity,
          adminId,
          verificationMethod: 'realtime',
        });

        return {
          stock: updatedStock,
          product: {
            ...product.toDatabase(),
            stock_quantity: newQuantity,
            availability_status: newAvailabilityStatus,
          },
        };
      });
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
