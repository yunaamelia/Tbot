/**
 * Stock repository with reserved quantity tracking
 * Uses database transactions for stock operations (FR-033)
 *
 * Task: T056
 * Requirement: FR-010, FR-033, FR-052
 */

const { table } = require('../database/query-builder');
const { getDb } = require('../database/db-connection');
const Stock = require('../../models/stock');
const { NotFoundError, ConflictError } = require('../shared/errors');
const logger = require('../shared/logger').child('stock-repository');

class StockRepository {
  /**
   * Find stock by product ID
   * @param {number} productId Product ID
   * @returns {Promise<Stock|null>}
   */
  async findByProductId(productId) {
    try {
      const row = await table('stock').where('product_id', productId).first();
      return Stock.fromDatabase(row);
    } catch (error) {
      logger.error('Error finding stock by product ID', error, { productId });
      throw error;
    }
  }

  /**
   * Create or update stock record
   * @param {Stock} stock Stock instance
   * @returns {Promise<Stock>}
   */
  /**
   * Upsert stock record
   * @param {Stock} stock Stock instance
   * @param {Function} trx Optional transaction function
   * @returns {Promise<Stock>}
   */
  async upsert(stock, trx = null) {
    try {
      const query = trx || table('stock');
      const existing = await this.findByProductId(stock.product_id);

      if (existing) {
        await query.where('product_id', stock.product_id).update(stock.toDatabase());
        return this.findByProductId(stock.product_id);
      } else {
        const [stockId] = await query.insert(stock.toDatabase()).returning('id');
        return Stock.fromDatabase({ ...stock.toDatabase(), id: stockId });
      }
    } catch (error) {
      logger.error('Error upserting stock', error, { productId: stock.product_id });
      throw error;
    }
  }

  /**
   * Reserve stock with row-level locking (FR-033)
   * Uses database transaction with FOR UPDATE lock
   * @param {number} productId Product ID
   * @param {number} quantity Quantity to reserve
   * @param {Function} trx Knex transaction function
   * @returns {Promise<Stock>} Updated stock
   * @throws {ConflictError} If insufficient stock
   */
  async reserveWithLock(productId, quantity, trx = null) {
    try {
      const dbTable = trx ? trx('stock') : getDb()('stock');

      // Use FOR UPDATE lock for row-level locking (FR-033)
      const row = await dbTable.where('product_id', productId).forUpdate().first();

      if (!row) {
        throw new NotFoundError(`Stock record not found for product ${productId}`);
      }

      const stock = Stock.fromDatabase(row);
      stock.reserve(quantity);

      await dbTable.where('product_id', productId).update({
        reserved_quantity: stock.reserved_quantity,
        current_quantity: stock.current_quantity,
        last_updated_timestamp: stock.last_updated_timestamp,
      });

      return stock;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ConflictError) {
        throw error;
      }
      logger.error('Error reserving stock with lock', error, { productId, quantity });
      throw error;
    }
  }

  /**
   * Deduct stock when payment verified (FR-033)
   * Uses database transaction
   * @param {number} productId Product ID
   * @param {number} quantity Quantity to deduct
   * @param {Function} trx Knex transaction function
   * @returns {Promise<Stock>} Updated stock
   */
  async deductWithLock(productId, quantity, trx = null) {
    try {
      const dbTable = trx ? trx('stock') : getDb()('stock');

      // Use FOR UPDATE lock
      const row = await dbTable.where('product_id', productId).forUpdate().first();

      if (!row) {
        throw new NotFoundError(`Stock record not found for product ${productId}`);
      }

      const stock = Stock.fromDatabase(row);
      stock.deduct(quantity);

      await dbTable.where('product_id', productId).update({
        current_quantity: stock.current_quantity,
        reserved_quantity: stock.reserved_quantity,
        last_updated_timestamp: stock.last_updated_timestamp,
      });

      return stock;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Error deducting stock with lock', error, { productId, quantity });
      throw error;
    }
  }

  /**
   * Release reserved stock (when order cancelled)
   * @param {number} productId Product ID
   * @param {number} quantity Quantity to release
   * @returns {Promise<Stock>} Updated stock
   */
  async releaseReserved(productId, quantity) {
    try {
      const stock = await this.findByProductId(productId);
      if (!stock) {
        throw new NotFoundError(`Stock record not found for product ${productId}`);
      }

      stock.releaseReserved(quantity);

      await table('stock').where('product_id', productId).update({
        reserved_quantity: stock.reserved_quantity,
        last_updated_timestamp: stock.last_updated_timestamp,
      });

      return stock;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Error releasing reserved stock', error, { productId, quantity });
      throw error;
    }
  }

  /**
   * Update stock quantity (admin action) (T082, T083)
   * Adds tracking for last_updated_by and update_history
   * @param {number} productId Product ID
   * @param {number} newQuantity New stock quantity
   * @param {number} adminId Admin ID
   * @param {Function} trx Optional transaction function
   * @returns {Promise<Stock>} Updated stock
   */
  async updateQuantity(productId, newQuantity, adminId = null, trx = null) {
    try {
      const query = trx || table('stock');
      const stock = await this.findByProductId(productId);
      if (!stock) {
        // Create new stock record if doesn't exist
        const newStock = new Stock({
          product_id: productId,
          current_quantity: newQuantity,
          reserved_quantity: 0,
          last_updated_by: adminId,
        });
        const createdStock = await this.upsert(newStock, trx);

        // Initialize update_history for new stock
        const updateHistory = [
          {
            admin_id: adminId,
            previous_quantity: 0,
            new_quantity: newQuantity,
            timestamp: new Date().toISOString(),
          },
        ];

        await query.where('product_id', productId).update({
          update_history: JSON.stringify(updateHistory),
        });

        createdStock.update_history = updateHistory;
        return createdStock;
      }

      const previousQuantity = stock.current_quantity;
      stock.current_quantity = newQuantity;
      stock.last_updated_by = adminId;
      stock.last_updated_timestamp = new Date();

      // Update update_history JSON field (T083)
      let updateHistory = [];
      try {
        const existingStock = await (trx || table('stock')).where('product_id', productId).first();
        if (existingStock && existingStock.update_history) {
          updateHistory =
            typeof existingStock.update_history === 'string'
              ? JSON.parse(existingStock.update_history)
              : existingStock.update_history;
        }
      } catch (error) {
        // If history doesn't exist or is invalid, start fresh
        updateHistory = [];
      }

      // Add new update record to history
      updateHistory.push({
        admin_id: adminId,
        previous_quantity: previousQuantity,
        new_quantity: newQuantity,
        timestamp: new Date().toISOString(),
      });

      // Keep only last 50 updates to prevent unbounded growth
      if (updateHistory.length > 50) {
        updateHistory = updateHistory.slice(-50);
      }

      stock.validate();

      await query.where('product_id', productId).update({
        current_quantity: stock.current_quantity,
        last_updated_by: stock.last_updated_by,
        last_updated_timestamp: stock.last_updated_timestamp,
        update_history: JSON.stringify(updateHistory),
      });

      // Update product availability_status based on stock
      const productQuery = trx || table('products');
      await productQuery.where('id', productId).update({
        stock_quantity: newQuantity,
        availability_status: newQuantity > 0 ? 'available' : 'out_of_stock',
        updated_at: new Date(),
      });

      // Update stock model with history
      stock.update_history = updateHistory;

      return stock;
    } catch (error) {
      logger.error('Error updating stock quantity', error, { productId, newQuantity, adminId });
      throw error;
    }
  }
}

module.exports = new StockRepository();
