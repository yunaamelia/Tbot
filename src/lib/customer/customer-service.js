/**
 * Customer service for managing customer data
 * Handles customer creation and retrieval
 */

const { table } = require('../database/query-builder');
const Customer = require('../../models/customer');
const { NotFoundError } = require('../shared/errors');
const logger = require('../shared/logger').child('customer-service');

class CustomerService {
  /**
   * Get or create customer from Telegram user ID
   * @param {number} telegramUserId Telegram user ID
   * @param {Object} userInfo User info from Telegram (name, username)
   * @returns {Promise<Customer>} Customer instance
   */
  async getOrCreateCustomer(telegramUserId, userInfo = {}) {
    try {
      // Try to find existing customer
      const existing = await this.findByTelegramId(telegramUserId);
      if (existing) {
        // Update last activity
        existing.updateActivity();
        await table('customers')
          .where('telegram_user_id', telegramUserId)
          .update({
            last_activity_timestamp: existing.last_activity_timestamp,
            name: userInfo.name || existing.name,
            username: userInfo.username || existing.username,
          });
        return existing;
      }

      // Create new customer
      const customer = new Customer({
        telegram_user_id: telegramUserId,
        name: userInfo.name || null,
        username: userInfo.username || null,
        purchase_history: [],
        behavior_patterns: {},
        preferences: {},
      });

      const [customerId] = await table('customers').insert(customer.toDatabase()).returning('id');

      customer.id = customerId;
      logger.info('New customer created', { customerId, telegramUserId });
      return customer;
    } catch (error) {
      logger.error('Error getting or creating customer', error, { telegramUserId });
      throw error;
    }
  }

  /**
   * Find customer by Telegram user ID
   * @param {number} telegramUserId Telegram user ID
   * @returns {Promise<Customer|null>}
   */
  async findByTelegramId(telegramUserId) {
    try {
      const row = await table('customers').where('telegram_user_id', telegramUserId).first();
      return Customer.fromDatabase(row);
    } catch (error) {
      logger.error('Error finding customer by Telegram ID', error, { telegramUserId });
      return null;
    }
  }

  /**
   * Get customer by ID
   * @param {number} customerId Customer ID
   * @returns {Promise<Customer>}
   * @throws {NotFoundError} If customer not found
   */
  async getCustomerById(customerId) {
    try {
      const row = await table('customers').where('id', customerId).first();
      if (!row) {
        throw new NotFoundError(`Customer with ID ${customerId} not found`);
      }
      return Customer.fromDatabase(row);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Error getting customer by ID', error, { customerId });
      throw error;
    }
  }
}

module.exports = new CustomerService();
