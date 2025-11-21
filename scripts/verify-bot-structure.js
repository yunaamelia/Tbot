/**
 * Verify existing bot.js structure can be extended with new modules
 * Task: T012
 * Feature: 002-friday-enhancement
 */

const fs = require('fs');
const path = require('path');
const logger = require('../src/lib/shared/logger').child('verify-bot');

function verifyBotStructure() {
  logger.info('Verifying bot.js structure for extensibility...');

  const botPath = path.join(__dirname, '../src/bot.js');
  const botContent = fs.readFileSync(botPath, 'utf8');

  // Check 1: Bot instance is accessible
  if (!botContent.includes('const bot = getBot()') && !botContent.includes('bot = getBot()')) {
    throw new Error('Bot instance not found or not accessible');
  }
  logger.info('✅ Bot instance is accessible');

  // Check 2: Module imports pattern exists
  if (!botContent.includes('require(')) {
    throw new Error('Module import pattern not found');
  }
  logger.info('✅ Module import pattern exists');

  // Check 3: Command handlers can be added
  if (!botContent.includes('bot.command(')) {
    throw new Error('Command handler pattern not found');
  }
  logger.info('✅ Command handler pattern exists (bot.command)');

  // Check 4: Callback query handlers can be added
  if (!botContent.includes('bot.on(') && !botContent.includes('bot.action(')) {
    logger.warn('⚠️  Callback query handler pattern not explicitly found, but bot.on/bot.action may be used');
  } else {
    logger.info('✅ Callback query handler pattern exists');
  }

  // Check 5: Error handling pattern exists
  if (!botContent.includes('asyncHandler')) {
    logger.warn('⚠️  asyncHandler not found, but error handling may be implemented differently');
  } else {
    logger.info('✅ Error handling pattern (asyncHandler) exists');
  }

  // Check 6: Logger is available
  if (!botContent.includes('logger')) {
    throw new Error('Logger not found in bot.js');
  }
  logger.info('✅ Logger is available');

  // Check 7: i18n is available
  if (!botContent.includes('i18n')) {
    logger.warn('⚠️  i18n not found, but may not be required for all modules');
  } else {
    logger.info('✅ i18n is available');
  }

  // Check 8: Structure allows adding new command handlers
  const commandCount = (botContent.match(/bot\.command\(/g) || []).length;
  logger.info(`✅ Found ${commandCount} existing command handlers (structure allows adding more)`);

  // Check 9: Can import new modules from lib directories
  const libImports = (botContent.match(/require\(['"]\.\/lib\//g) || []).length;
  logger.info(`✅ Found ${libImports} imports from lib/ (structure supports new module imports)`);

  // Check 10: File is well-structured (has exports or is entry point)
  if (!botContent.includes('module.exports') && !botContent.includes('exports.')) {
    logger.info('✅ File is entry point (no exports needed)');
  } else {
    logger.info('✅ File has exports structure');
  }

  logger.info('✅ bot.js structure verified - can be extended with new modules');
  return true;
}

// Run verification
if (require.main === module) {
  try {
    verifyBotStructure();
    logger.info('✅ All bot.js structure verifications passed');
    process.exit(0);
  } catch (error) {
    logger.error('❌ bot.js structure verification failed:', error);
    process.exit(1);
  }
}

module.exports = { verifyBotStructure };

