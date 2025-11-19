/**
 * Telegram Bot API client using Telegraf.js
 * Direct API access with minimal wrapper (Article VIII)
 */

const { Telegraf } = require('telegraf');
const config = require('../shared/config');
const logger = require('../shared/logger').child('telegram');

let botInstance = null;

/**
 * Get or create Telegram bot instance
 * @returns {Telegraf} Telegraf bot instance
 */
function getBot() {
  if (!botInstance) {
    const token = config.require('TELEGRAM_BOT_TOKEN');
    botInstance = new Telegraf(token);

    // Error handling
    botInstance.catch((err, ctx) => {
      logger.error('Telegram bot error', err, {
        update: ctx.update,
      });
    });

    // Bot will be launched explicitly in bot.js or server.js
    // Don't auto-launch here to allow for proper initialization order
  }

  return botInstance;
}

/**
 * Get direct Telegram API client for advanced operations
 * @returns {Object} Telegram API client
 */
function getApiClient() {
  const bot = getBot();
  return bot.telegram;
}

/**
 * Stop bot gracefully
 * @returns {Promise<void>}
 */
async function stopBot() {
  if (botInstance) {
    await botInstance.stop();
    botInstance = null;
    logger.info('Telegram bot stopped');
  }
}

module.exports = {
  getBot,
  getApiClient,
  stopBot,
};
