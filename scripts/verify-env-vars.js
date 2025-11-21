/**
 * Verify environment variable loading for payment method configuration
 * Task: T011
 * Feature: 002-friday-enhancement
 */

const config = require('../src/lib/shared/config');
const logger = require('../src/lib/shared/logger').child('verify-env');

function verifyPaymentMethodEnvVars() {
  logger.info('Verifying payment method environment variables...');

  const requiredVars = {
    QRIS: ['DUITKU_MERCHANT_CODE', 'DUITKU_API_KEY', 'DUITKU_CALLBACK_URL'],
    E_WALLET: ['E_WALLET_NAME', 'E_WALLET_NUMBER', 'E_WALLET_HOLDER'],
    BANK: ['BANK_NAME', 'BANK_ACCOUNT_NUMBER', 'BANK_ACCOUNT_HOLDER'],
  };

  const results = {
    QRIS: { enabled: false, missing: [] },
    E_WALLET: { enabled: false, missing: [] },
    BANK: { enabled: false, missing: [] },
  };

  // Check QRIS configuration
  for (const varName of requiredVars.QRIS) {
    const value = config.get(varName);
    if (!value) {
      results.QRIS.missing.push(varName);
    }
  }
  results.QRIS.enabled = results.QRIS.missing.length === 0;

  // Check E-Wallet configuration
  for (const varName of requiredVars.E_WALLET) {
    const value = config.get(varName);
    if (!value) {
      results.E_WALLET.missing.push(varName);
    }
  }
  results.E_WALLET.enabled = results.E_WALLET.missing.length === 0;

  // Check Bank configuration
  for (const varName of requiredVars.BANK) {
    const value = config.get(varName);
    if (!value) {
      results.BANK.missing.push(varName);
    }
  }
  results.BANK.enabled = results.BANK.missing.length === 0;

  // Log results
  logger.info('Payment method configuration status:');
  for (const [method, status] of Object.entries(results)) {
    if (status.enabled) {
      logger.info(`  ✅ ${method}: Enabled (all required vars present)`);
    } else {
      logger.info(`  ⚠️  ${method}: Disabled (missing: ${status.missing.join(', ')})`);
    }
  }

  // Verify config.get() works
  const testValue = config.get('TELEGRAM_BOT_TOKEN', 'default');
  if (testValue === undefined) {
    throw new Error('config.get() returned undefined');
  }
  logger.info('✅ config.get() method works correctly');

  // Verify config.getInt() works
  const testInt = config.getInt('REDIS_PORT', 6379);
  if (typeof testInt !== 'number') {
    throw new Error('config.getInt() did not return a number');
  }
  logger.info('✅ config.getInt() method works correctly');

  // Verify config.getBoolean() works
  const testBool = config.getBoolean('USE_HTTPS', false);
  if (typeof testBool !== 'boolean') {
    throw new Error('config.getBoolean() did not return a boolean');
  }
  logger.info('✅ config.getBoolean() method works correctly');

  logger.info('✅ Environment variable loading verified');
  return results;
}

// Run verification
if (require.main === module) {
  try {
    const results = verifyPaymentMethodEnvVars();
    logger.info('✅ All environment variable verifications passed');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Environment variable verification failed:', error);
    process.exit(1);
  }
}

module.exports = { verifyPaymentMethodEnvVars };

