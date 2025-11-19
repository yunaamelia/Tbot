/**
 * Encryption service using Node.js crypto (AES-256)
 * Provides credential encryption at rest (FR-019, FR-049)
 *
 * Task: T126
 * Requirement: FR-019, FR-049, FR-044
 */

const crypto = require('crypto');
const logger = require('../shared/logger').child('encryption-service');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const TAG_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits

class EncryptionService {
  /**
   * Get encryption key from environment
   * @returns {Buffer} Encryption key
   * @throws {Error} If key is not configured
   */
  getEncryptionKey() {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
      throw new Error('ENCRYPTION_KEY environment variable is required for credential encryption');
    }

    // Derive key from environment variable using PBKDF2
    // This ensures consistent key length and adds key stretching
    return crypto.pbkdf2Sync(key, 'credential-encryption-salt', 100000, KEY_LENGTH, 'sha256');
  }

  /**
   * Encrypt credentials (T129)
   * @param {string} plaintext Credentials to encrypt
   * @returns {string} Encrypted credentials (base64 encoded)
   * @throws {Error} If encryption fails
   */
  encrypt(plaintext) {
    try {
      if (!plaintext || typeof plaintext !== 'string') {
        throw new Error('Plaintext must be a non-empty string');
      }

      const key = this.getEncryptionKey();
      const iv = crypto.randomBytes(IV_LENGTH);
      const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

      let encrypted = cipher.update(plaintext, 'utf8', 'base64');
      encrypted += cipher.final('base64');
      const tag = cipher.getAuthTag();

      // Combine IV, tag, and encrypted data
      const combined = Buffer.concat([iv, tag, Buffer.from(encrypted, 'base64')]).toString(
        'base64'
      );

      logger.debug('Credentials encrypted successfully', {
        plaintextLength: plaintext.length,
        encryptedLength: combined.length,
      });

      return combined;
    } catch (error) {
      logger.error('Error encrypting credentials', error);
      throw new Error('Failed to encrypt credentials');
    }
  }

  /**
   * Decrypt credentials
   * @param {string} encrypted Encrypted credentials (base64 encoded)
   * @returns {string} Decrypted credentials
   * @throws {Error} If decryption fails
   */
  decrypt(encrypted) {
    try {
      if (!encrypted || typeof encrypted !== 'string') {
        throw new Error('Encrypted data must be a non-empty string');
      }

      const key = this.getEncryptionKey();
      const combined = Buffer.from(encrypted, 'base64');

      // Extract IV, tag, and encrypted data
      const iv = combined.slice(0, IV_LENGTH);
      const tag = combined.slice(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
      const encryptedData = combined.slice(IV_LENGTH + TAG_LENGTH);

      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(tag);

      let decrypted = decipher.update(encryptedData, null, 'utf8');
      decrypted += decipher.final('utf8');

      logger.debug('Credentials decrypted successfully', {
        encryptedLength: encrypted.length,
        decryptedLength: decrypted.length,
      });

      return decrypted;
    } catch (error) {
      logger.error('Error decrypting credentials', error);
      throw new Error('Failed to decrypt credentials');
    }
  }

  /**
   * Hash sensitive data (one-way, for logging purposes)
   * Used to log credential access without exposing actual credentials (FR-044)
   * @param {string} data Sensitive data
   * @returns {string} Hashed value (first 8 chars for identification)
   */
  hashForLogging(data) {
    if (!data || typeof data !== 'string') {
      return '[INVALID]';
    }

    const hash = crypto.createHash('sha256').update(data).digest('hex');
    return hash.substring(0, 8); // First 8 chars for identification
  }
}

module.exports = new EncryptionService();
