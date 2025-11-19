/**
 * Admin repository for database operations
 *
 * Task: T095
 * Requirement: FR-050
 */

const { table } = require('../database/query-builder');
const Admin = require('../../models/admin');
const logger = require('../shared/logger').child('admin-repository');

class AdminRepository {
  /**
   * Find admin by Telegram user ID
   * @param {number} telegramUserId Telegram user ID
   * @returns {Promise<Admin|null>} Admin object or null if not found
   */
  async findByTelegramId(telegramUserId) {
    try {
      const row = await table('admins').where('telegram_user_id', telegramUserId).first();
      return Admin.fromDatabase(row);
    } catch (error) {
      logger.error('Error finding admin by Telegram ID', error, { telegramUserId });
      return null;
    }
  }

  /**
   * Find admin by ID
   * @param {number} adminId Admin ID
   * @returns {Promise<Admin|null>} Admin object or null if not found
   */
  async findById(adminId) {
    try {
      const row = await table('admins').where('id', adminId).first();
      return Admin.fromDatabase(row);
    } catch (error) {
      logger.error('Error finding admin by ID', error, { adminId });
      return null;
    }
  }

  /**
   * Find all admins
   * @returns {Promise<Array<Admin>>} List of admins
   */
  async findAll() {
    try {
      const rows = await table('admins').orderBy('created_timestamp', 'asc');
      return rows.map(Admin.fromDatabase);
    } catch (error) {
      logger.error('Error finding all admins', error);
      return [];
    }
  }

  /**
   * Update admin last activity
   * @param {number} adminId Admin ID
   * @returns {Promise<void>}
   */
  async updateActivity(adminId) {
    try {
      await table('admins').where('id', adminId).update({ last_activity_timestamp: new Date() });
    } catch (error) {
      logger.error('Error updating admin activity', error, { adminId });
      throw error;
    }
  }
}

module.exports = new AdminRepository();
