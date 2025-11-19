/**
 * Audit logger for credential access logging
 * Logs all credential access and delivery operations (FR-021, FR-051)
 *
 * Task: T128
 * Requirement: FR-021, FR-051
 */

const { table } = require('../database/query-builder');
const logger = require('../shared/logger').child('audit-logger');

class AuditLogger {
  /**
   * Log credential access or delivery (T131)
   * @param {Object} logData Audit log data
   * @param {number} logData.adminId Admin ID (null for system actions)
   * @param {string} logData.actionType Action type (e.g., 'credential_delivery', 'credential_access')
   * @param {string} logData.entityType Entity type (e.g., 'order')
   * @param {number} logData.entityId Entity ID
   * @param {Object} logData.details Additional details (JSON)
   * @param {string} logData.ipAddress IP address (optional)
   * @returns {Promise<number>} Audit log entry ID
   */
  async logCredentialAccess(logData) {
    try {
      const {
        adminId = null,
        actionType,
        entityType,
        entityId,
        details = {},
        ipAddress = null,
      } = logData;

      if (!actionType) {
        throw new Error('actionType is required for audit log');
      }

      const [logId] = await table('audit_logs')
        .insert({
          admin_id: adminId,
          action_type: actionType,
          entity_type: entityType,
          entity_id: entityId,
          details: JSON.stringify(details),
          ip_address: ipAddress,
          timestamp: new Date(),
        })
        .returning('id');

      logger.info('Audit log entry created', {
        logId: logId || 'unknown',
        actionType,
        entityType,
        entityId,
        adminId,
      });

      return logId || null;
    } catch (error) {
      logger.error('Error creating audit log entry', error, logData);
      // Don't throw - audit logging failure shouldn't block operations
      return null;
    }
  }

  /**
   * Log admin action
   * @param {Object} logData Audit log data
   * @returns {Promise<number>} Audit log entry ID
   */
  async logAdminAction(logData) {
    return this.logCredentialAccess({
      ...logData,
      actionType: logData.actionType || 'admin_action',
    });
  }

  /**
   * Get audit logs for an entity
   * @param {string} entityType Entity type
   * @param {number} entityId Entity ID
   * @param {Object} options Query options
   * @returns {Promise<Array>} Audit log entries
   */
  async getAuditLogs(entityType, entityId, options = {}) {
    try {
      const limit = options.limit || 50;
      const offset = options.offset || 0;

      const logs = await table('audit_logs')
        .where('entity_type', entityType)
        .where('entity_id', entityId)
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .offset(offset);

      return logs.map((log) => ({
        id: log.id,
        adminId: log.admin_id,
        actionType: log.action_type,
        entityType: log.entity_type,
        entityId: log.entity_id,
        details: typeof log.details === 'string' ? JSON.parse(log.details) : log.details,
        ipAddress: log.ip_address,
        timestamp: log.timestamp,
      }));
    } catch (error) {
      logger.error('Error getting audit logs', error, { entityType, entityId });
      return [];
    }
  }

  /**
   * Get audit logs for an admin
   * @param {number} adminId Admin ID
   * @param {Object} options Query options
   * @returns {Promise<Array>} Audit log entries
   */
  async getAdminAuditLogs(adminId, options = {}) {
    try {
      const limit = options.limit || 50;
      const offset = options.offset || 0;

      const logs = await table('audit_logs')
        .where('admin_id', adminId)
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .offset(offset);

      return logs.map((log) => ({
        id: log.id,
        adminId: log.admin_id,
        actionType: log.action_type,
        entityType: log.entity_type,
        entityId: log.entity_id,
        details: typeof log.details === 'string' ? JSON.parse(log.details) : log.details,
        ipAddress: log.ip_address,
        timestamp: log.timestamp,
      }));
    } catch (error) {
      logger.error('Error getting admin audit logs', error, { adminId });
      return [];
    }
  }
}

module.exports = new AuditLogger();
