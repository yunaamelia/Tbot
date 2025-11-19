/**
 * HMAC signature verification for payment gateway webhooks (FR-031)
 *
 * Task: T134
 * Requirement: FR-031, FR-045
 */

const crypto = require('crypto');
const config = require('../shared/config');
const logger = require('../shared/logger').child('webhook-verifier');

class WebhookVerifier {
  /**
   * Verify HMAC signature for payment gateway webhook (T134)
   * @param {Object} payload Webhook payload
   * @param {string} signature Provided signature from webhook
   * @param {string} secret Secret key for HMAC
   * @param {string} rawBody Optional raw body string (for consistent JSON serialization)
   * @returns {boolean} True if signature is valid
   */
  verifyHMAC(payload, signature, secret, rawBody = null) {
    try {
      if (!signature || !secret) {
        logger.warn('Missing signature or secret for HMAC verification');
        return false;
      }

      // Use raw body if provided (for consistent JSON serialization)
      // Otherwise, convert payload to string
      const payloadString =
        rawBody || (typeof payload === 'string' ? payload : JSON.stringify(payload));

      // Generate expected signature using SHA-256 (FR-031)
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payloadString)
        .digest('hex');

      // Constant-time comparison to prevent timing attacks
      // Both signatures must be valid hex strings of the same length
      if (signature.length !== expectedSignature.length) {
        return false;
      }

      let isValid = false;
      try {
        isValid = crypto.timingSafeEqual(
          Buffer.from(signature, 'hex'),
          Buffer.from(expectedSignature, 'hex')
        );
      } catch (error) {
        // Invalid hex string in signature
        logger.warn('Invalid signature format (not valid hex)', {
          signatureLength: signature.length,
          expectedLength: expectedSignature.length,
        });
        return false;
      }

      if (!isValid) {
        logger.warn('HMAC signature verification failed', {
          providedSignature: signature.substring(0, 8) + '...',
          expectedSignature: expectedSignature.substring(0, 8) + '...',
        });
      }

      return isValid;
    } catch (error) {
      logger.error('Error verifying HMAC signature', error);
      return false;
    }
  }

  /**
   * Verify Duitku payment gateway webhook signature
   * @param {Object} req Express request object
   * @returns {boolean} True if signature is valid
   */
  verifyDuitkuWebhook(req) {
    try {
      const secret = config.get('DUITKU_API_KEY', 'test_secret');
      if (!secret) {
        logger.warn('DUITKU_API_KEY not configured');
        return false;
      }

      // Express lowercases headers, so check lowercase version
      // Also check original case for compatibility
      const signature =
        req.headers['x-duitku-signature'] ||
        req.headers['x-duitku-signature'] ||
        req.headers['X-Duitku-Signature'] ||
        req.body.signature;

      if (!signature) {
        logger.warn('Missing signature in Duitku webhook');
        return false;
      }

      // Use raw body if available (for consistent JSON serialization)
      const rawBody = req.rawBody || null;
      return this.verifyHMAC(req.body, signature, secret, rawBody);
    } catch (error) {
      logger.error('Error verifying Duitku webhook', error);
      return false;
    }
  }

  /**
   * Verify generic webhook signature
   * @param {Object} req Express request object
   * @param {string} secretKeyEnvVar Environment variable name for secret key
   * @param {string} signatureHeader Header name for signature
   * @returns {boolean} True if signature is valid
   */
  verifyGenericWebhook(req, secretKeyEnvVar, signatureHeader) {
    try {
      const secret = config.get(secretKeyEnvVar);
      if (!secret) {
        logger.warn(`${secretKeyEnvVar} not configured`);
        return false;
      }

      const signature = req.headers[signatureHeader] || req.body.signature;

      if (!signature) {
        logger.warn(`Missing signature in ${signatureHeader} header`);
        return false;
      }

      return this.verifyHMAC(req.body, signature, secret);
    } catch (error) {
      logger.error('Error verifying generic webhook', error, {
        secretKeyEnvVar,
        signatureHeader,
      });
      return false;
    }
  }
}

module.exports = new WebhookVerifier();
