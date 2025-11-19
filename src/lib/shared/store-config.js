/**
 * Store configuration service
 * Manages store status (open/closed) and other configuration
 * Used by /open and /close admin commands
 */

const { table } = require('../database/query-builder');
const logger = require('./logger').child('store-config');
const i18n = require('./i18n');

const STORE_STATUS_KEY = 'store_status';
const DEFAULT_STORE_STATUS = 'open';

/**
 * Get store status
 * @returns {Promise<string>} Store status ('open' or 'closed')
 */
async function getStoreStatus() {
  try {
    const config = await table('store_config')
      .select('value')
      .where('key', STORE_STATUS_KEY)
      .first();

    return config ? config.value : DEFAULT_STORE_STATUS;
  } catch (error) {
    logger.error('Error getting store status', error);
    return DEFAULT_STORE_STATUS;
  }
}

/**
 * Set store status
 * @param {string} status Store status ('open' or 'closed')
 * @returns {Promise<void>}
 */
async function setStoreStatus(status) {
  if (status !== 'open' && status !== 'closed') {
    throw new Error(`Invalid store status: ${status}. Must be 'open' or 'closed'`);
  }

  try {
    // Use upsert pattern compatible with both PostgreSQL and MySQL
    const existing = await table('store_config')
      .select('key')
      .where('key', STORE_STATUS_KEY)
      .first();

    if (existing) {
      await table('store_config').where('key', STORE_STATUS_KEY).update({
        value: status,
        updated_at: new Date(),
      });
    } else {
      await table('store_config').insert({
        key: STORE_STATUS_KEY,
        value: status,
        updated_at: new Date(),
      });
    }

    logger.info(`Store status updated to: ${status}`);
  } catch (error) {
    logger.error('Error setting store status', error);
    throw error;
  }
}

/**
 * Check if store is open
 * @returns {Promise<boolean>} True if store is open
 */
async function isStoreOpen() {
  const status = await getStoreStatus();
  return status === 'open';
}

/**
 * Get store closed message
 * @returns {string} Message in Indonesian
 */
function getStoreClosedMessage() {
  return i18n.t('store_closed');
}

module.exports = {
  getStoreStatus,
  setStoreStatus,
  isStoreOpen,
  getStoreClosedMessage,
};
