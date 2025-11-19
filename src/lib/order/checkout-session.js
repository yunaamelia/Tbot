/**
 * Checkout session management using Redis for multi-step checkout state
 * Manages checkout state across multiple steps (T073, FR-004)
 *
 * Task: T073
 * Requirement: FR-004, EC-004
 */

const { getRedis } = require('../shared/redis-client');
const logger = require('../shared/logger').child('checkout-session');

const SESSION_PREFIX = 'checkout:session:';
const SESSION_TTL = 15 * 60; // 15 minutes (EC-016: abandoned checkout timeout)

class CheckoutSession {
  /**
   * Create or update checkout session
   * @param {number} userId Telegram user ID
   * @param {Object} sessionData Session data
   * @returns {Promise<void>}
   */
  async setSession(userId, sessionData) {
    try {
      const redis = getRedis();
      const key = `${SESSION_PREFIX}${userId}`;
      await redis.setex(key, SESSION_TTL, JSON.stringify(sessionData));
      logger.debug('Checkout session created/updated', { userId, step: sessionData.step });
    } catch (error) {
      logger.error('Error setting checkout session', error, { userId });
      throw error;
    }
  }

  /**
   * Get checkout session
   * @param {number} userId Telegram user ID
   * @returns {Promise<Object|null>} Session data or null if not found
   */
  async getSession(userId) {
    try {
      const redis = getRedis();
      const key = `${SESSION_PREFIX}${userId}`;
      const data = await redis.get(key);
      if (!data) {
        return null;
      }
      return JSON.parse(data);
    } catch (error) {
      logger.error('Error getting checkout session', error, { userId });
      return null; // Return null on error to allow graceful degradation
    }
  }

  /**
   * Delete checkout session
   * @param {number} userId Telegram user ID
   * @returns {Promise<void>}
   */
  async deleteSession(userId) {
    try {
      const redis = getRedis();
      const key = `${SESSION_PREFIX}${userId}`;
      await redis.del(key);
      logger.debug('Checkout session deleted', { userId });
    } catch (error) {
      logger.error('Error deleting checkout session', error, { userId });
      // Don't throw - session deletion is not critical
    }
  }

  /**
   * Update session step
   * @param {number} userId Telegram user ID
   * @param {string} step Step name (e.g., 'order_summary', 'payment_method', 'payment_processing')
   * @param {Object} additionalData Additional data to merge
   * @returns {Promise<void>}
   */
  async updateStep(userId, step, additionalData = {}) {
    try {
      const session = await this.getSession(userId);
      if (!session) {
        throw new Error(`No checkout session found for user ${userId}`);
      }

      const updatedSession = {
        ...session,
        step,
        ...additionalData,
        updatedAt: new Date().toISOString(),
      };

      await this.setSession(userId, updatedSession);
    } catch (error) {
      logger.error('Error updating checkout session step', error, { userId, step });
      throw error;
    }
  }

  /**
   * Check if session exists and is valid
   * @param {number} userId Telegram user ID
   * @returns {Promise<boolean>}
   */
  async hasSession(userId) {
    try {
      const session = await this.getSession(userId);
      return session !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get all active checkout sessions (for cleanup/monitoring)
   * @returns {Promise<Array<Object>>} Array of session data
   */
  async getAllSessions() {
    try {
      const redis = getRedis();
      const keys = await redis.keys(`${SESSION_PREFIX}*`);
      const sessions = [];

      for (const key of keys) {
        const data = await redis.get(key);
        if (data) {
          sessions.push(JSON.parse(data));
        }
      }

      return sessions;
    } catch (error) {
      logger.error('Error getting all checkout sessions', error);
      return [];
    }
  }

  /**
   * Cleanup abandoned checkout sessions (T074)
   * Sessions older than SESSION_TTL are automatically expired by Redis
   * This method can be called periodically to release reserved stock
   * @returns {Promise<number>} Number of sessions cleaned up
   */
  async cleanupAbandonedSessions() {
    try {
      const redis = getRedis();
      const keys = await redis.keys(`${SESSION_PREFIX}*`);
      let cleaned = 0;

      for (const key of keys) {
        const ttl = await redis.ttl(key);
        if (ttl === -1) {
          // Key exists but has no expiration - set expiration
          await redis.expire(key, SESSION_TTL);
          cleaned++;
        }
      }

      logger.info('Abandoned checkout sessions cleaned up', { cleaned });
      return cleaned;
    } catch (error) {
      logger.error('Error cleaning up abandoned checkout sessions', error);
      return 0;
    }
  }
}

module.exports = new CheckoutSession();
