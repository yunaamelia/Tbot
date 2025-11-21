/**
 * Payment Method Validator - Validates payment method configuration
 *
 * Task: T050
 * Requirements: FR-006, FR-007
 * Feature: 002-friday-enhancement
 */

const config = require('../../shared/config');
const { ValidationError } = require('../../shared/errors');
const logger = require('../../shared/logger').child('method-validator');

/**
 * Validate that a payment method has all required configuration
 * @param {string} type Payment method type ('qris', 'ewallet', 'bank')
 * @returns {Promise<boolean>} True if method is properly configured
 * @throws {ValidationError} If type is invalid
 */
async function validateMethod(type) {
  try {
    if (!type || typeof type !== 'string') {
      throw new ValidationError('Payment method type must be a non-empty string');
    }

    const normalizedType = type.toLowerCase().trim();

    switch (normalizedType) {
      case 'qris':
        return validateQRIS();
      case 'ewallet':
        return validateEWallet();
      case 'bank':
        return validateBank();
      default:
        throw new ValidationError(
          `Invalid payment method type: ${type}. Must be one of: 'qris', 'ewallet', 'bank'`
        );
    }
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    logger.error('Error validating payment method', error, { type });
    throw error;
  }
}

/**
 * Validate QRIS payment method configuration
 * @returns {boolean} True if all required credentials are present
 */
function validateQRIS() {
  const merchantCode = config.get('DUITKU_MERCHANT_CODE');
  const apiKey = config.get('DUITKU_API_KEY');
  const callbackUrl = config.get('DUITKU_CALLBACK_URL');

  const isValid = !!(merchantCode && apiKey && callbackUrl);

  if (!isValid) {
    logger.debug('QRIS validation failed - missing required credentials', {
      hasMerchantCode: !!merchantCode,
      hasApiKey: !!apiKey,
      hasCallbackUrl: !!callbackUrl,
    });
  }

  return isValid;
}

/**
 * Validate E-Wallet payment method configuration
 * @returns {boolean} True if all required credentials are present
 */
function validateEWallet() {
  const walletName = config.get('E_WALLET_NAME');
  const walletNumber = config.get('E_WALLET_NUMBER');
  const walletHolder = config.get('E_WALLET_HOLDER');

  const isValid = !!(walletName && walletNumber && walletHolder);

  if (!isValid) {
    logger.debug('E-Wallet validation failed - missing required credentials', {
      hasWalletName: !!walletName,
      hasWalletNumber: !!walletNumber,
      hasWalletHolder: !!walletHolder,
    });
  }

  return isValid;
}

/**
 * Validate Bank Transfer payment method configuration
 * @returns {boolean} True if all required credentials are present
 */
function validateBank() {
  const bankName = config.get('BANK_NAME');
  const accountNumber = config.get('BANK_ACCOUNT_NUMBER');
  const accountHolder = config.get('BANK_ACCOUNT_HOLDER');

  const isValid = !!(bankName && accountNumber && accountHolder);

  if (!isValid) {
    logger.debug('Bank Transfer validation failed - missing required credentials', {
      hasBankName: !!bankName,
      hasAccountNumber: !!accountNumber,
      hasAccountHolder: !!accountHolder,
    });
  }

  return isValid;
}

module.exports = {
  validateMethod,
  validateQRIS,
  validateEWallet,
  validateBank,
};
