/**
 * Environment configuration manager
 * Loads and validates environment variables
 */

require('dotenv').config();

const config = {
  /**
   * Get configuration value with optional default
   * @param {string} key Configuration key
   * @param {any} defaultValue Default value if key not found
   * @returns {any} Configuration value
   */
  get(key, defaultValue = undefined) {
    return process.env[key] !== undefined ? process.env[key] : defaultValue;
  },

  /**
   * Get required configuration value (throws if missing)
   * @param {string} key Configuration key
   * @returns {any} Configuration value
   * @throws {Error} If key is missing
   */
  require(key) {
    const value = process.env[key];
    if (value === undefined) {
      throw new Error(`Required configuration key missing: ${key}`);
    }
    return value;
  },

  /**
   * Get boolean configuration value
   * @param {string} key Configuration key
   * @param {boolean} defaultValue Default value
   * @returns {boolean} Boolean value
   */
  getBoolean(key, defaultValue = false) {
    const value = this.get(key);
    if (value === undefined) return defaultValue;
    return value === 'true' || value === '1' || value === 'yes';
  },

  /**
   * Get integer configuration value
   * @param {string} key Configuration key
   * @param {number} defaultValue Default value
   * @returns {number} Integer value
   */
  getInt(key, defaultValue = 0) {
    const value = this.get(key);
    if (value === undefined) return defaultValue;
    return parseInt(value, 10);
  },
};

module.exports = config;

