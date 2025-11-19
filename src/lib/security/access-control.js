/**
 * Access control service for admin authentication and authorization
 *
 * Task: T096
 * Requirement: FR-050, FR-020, FR-032
 */

const adminRepository = require('../admin/admin-repository');
const { UnauthorizedError } = require('../shared/errors');
const logger = require('../shared/logger').child('access-control');

class AccessControlService {
  /**
   * Authenticate admin by Telegram user ID
   * @param {number} telegramUserId Telegram user ID
   * @returns {Promise<Admin|null>} Admin object or null if not found
   */
  async authenticateAdmin(telegramUserId) {
    try {
      const admin = await adminRepository.findByTelegramId(telegramUserId);
      if (admin) {
        // Update last activity
        await adminRepository.updateActivity(admin.id);
      }
      return admin;
    } catch (error) {
      logger.error('Error authenticating admin', error, { telegramUserId });
      return null;
    }
  }

  /**
   * Check if user is admin
   * @param {number} telegramUserId Telegram user ID
   * @returns {Promise<boolean>} True if user is admin
   */
  async isAdmin(telegramUserId) {
    const admin = await this.authenticateAdmin(telegramUserId);
    return admin !== null;
  }

  /**
   * Require admin authentication (throws if not admin)
   * @param {number} telegramUserId Telegram user ID
   * @returns {Promise<Admin>} Admin object
   * @throws {UnauthorizedError} If user is not admin
   */
  async requireAdmin(telegramUserId) {
    const admin = await this.authenticateAdmin(telegramUserId);
    if (!admin) {
      throw new UnauthorizedError('Anda bukan admin. Akses ditolak.');
    }
    return admin;
  }

  /**
   * Require specific permission (throws if admin doesn't have permission)
   * @param {number} telegramUserId Telegram user ID
   * @param {string} permission Required permission
   * @returns {Promise<Admin>} Admin object
   * @throws {UnauthorizedError} If user is not admin or doesn't have permission
   */
  async requirePermission(telegramUserId, permission) {
    const admin = await this.requireAdmin(telegramUserId);
    if (!admin.hasPermission(permission)) {
      throw new UnauthorizedError(
        `Anda tidak memiliki izin untuk melakukan tindakan ini. Diperlukan: ${permission}`
      );
    }
    return admin;
  }

  /**
   * Require any of the specified permissions
   * @param {number} telegramUserId Telegram user ID
   * @param {Array<string>} permissions Array of permissions (at least one required)
   * @returns {Promise<Admin>} Admin object
   * @throws {UnauthorizedError} If user is not admin or doesn't have any permission
   */
  async requireAnyPermission(telegramUserId, permissions) {
    const admin = await this.requireAdmin(telegramUserId);
    if (!admin.hasAnyPermission(permissions)) {
      throw new UnauthorizedError(
        `Anda tidak memiliki izin untuk melakukan tindakan ini. Diperlukan salah satu dari: ${permissions.join(', ')}`
      );
    }
    return admin;
  }
}

module.exports = new AccessControlService();
