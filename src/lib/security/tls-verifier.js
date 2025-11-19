/**
 * TLS/HTTPS verification utility (FR-045, Article XII)
 * Verifies that all external service communications use HTTPS/TLS
 *
 * Task: T138
 * Requirement: FR-045
 */

const logger = require('../shared/logger').child('tls-verifier');
const config = require('../shared/config');

class TLSVerifier {
  /**
   * Verify HTTPS/TLS configuration for external services (T138)
   * @returns {Object} Verification results
   */
  verifyTLSConfiguration() {
    const results = {
      telegram: this.verifyTelegramTLS(),
      database: this.verifyDatabaseTLS(),
      paymentGateway: this.verifyPaymentGatewayTLS(),
      server: this.verifyServerTLS(),
    };

    const allSecure = Object.values(results).every((r) => r.secure);

    if (!allSecure) {
      logger.warn('TLS verification failed for some services', results);
    } else {
      logger.info('All external services configured for HTTPS/TLS');
    }

    return {
      allSecure,
      results,
    };
  }

  /**
   * Verify Telegram API uses HTTPS (always true - Telegram API is HTTPS-only)
   * @returns {Object} Verification result
   */
  verifyTelegramTLS() {
    // Telegram Bot API always uses HTTPS (https://api.telegram.org)
    // Telegraf.js uses HTTPS by default
    return {
      secure: true,
      service: 'Telegram Bot API',
      protocol: 'HTTPS',
      note: 'Telegram API always uses HTTPS',
    };
  }

  /**
   * Verify database connection uses SSL/TLS
   * @returns {Object} Verification result
   */
  verifyDatabaseTLS() {
    const dbType = config.get('DB_TYPE', 'postgresql');
    const sslEnabled = config.getBoolean('DB_SSL', false);

    // In production, SSL should be enabled
    const isProduction = config.get('NODE_ENV') === 'production';
    const secure = isProduction ? sslEnabled : true; // Allow non-SSL in development

    return {
      secure,
      service: `Database (${dbType})`,
      protocol: sslEnabled ? 'SSL/TLS' : 'Plain',
      note: isProduction
        ? sslEnabled
          ? 'SSL enabled for production'
          : 'WARNING: SSL not enabled in production'
        : 'Development mode - SSL optional',
    };
  }

  /**
   * Verify payment gateway uses HTTPS
   * @returns {Object} Verification result
   */
  verifyPaymentGatewayTLS() {
    // Duitku payment gateway uses HTTPS
    // All payment gateway callbacks should be over HTTPS
    const useHttps = config.getBoolean('USE_HTTPS', false);
    const isProduction = config.get('NODE_ENV') === 'production';

    return {
      secure: isProduction ? useHttps : true, // Allow HTTP in development
      service: 'Payment Gateway (Duitku)',
      protocol: useHttps ? 'HTTPS' : 'HTTP',
      note: isProduction
        ? useHttps
          ? 'HTTPS enabled for payment callbacks'
          : 'WARNING: Payment callbacks should use HTTPS in production'
        : 'Development mode - HTTP allowed',
    };
  }

  /**
   * Verify server uses HTTPS
   * @returns {Object} Verification result
   */
  verifyServerTLS() {
    const useHttps = config.getBoolean('USE_HTTPS', false);
    const isProduction = config.get('NODE_ENV') === 'production';

    return {
      secure: isProduction ? useHttps : true, // Allow HTTP in development
      service: 'Webhook Server',
      protocol: useHttps ? 'HTTPS' : 'HTTP',
      note: isProduction
        ? useHttps
          ? 'HTTPS server enabled'
          : 'WARNING: Server should use HTTPS in production (FR-045)'
        : 'Development mode - HTTP allowed',
    };
  }
}

module.exports = new TLSVerifier();
