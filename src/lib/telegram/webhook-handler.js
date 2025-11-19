/**
 * Telegram webhook handler
 * Processes incoming webhook updates from Telegram
 */

const logger = require('../shared/logger').child('webhook');
const { getBot } = require('./api-client');

/**
 * Handle incoming webhook update
 * @param {Object} update Telegram update object
 * @returns {Promise<void>}
 */
async function handleUpdate(update) {
  try {
    const bot = getBot();
    await bot.handleUpdate(update);
  } catch (error) {
    logger.error('Error handling webhook update', error, {
      updateId: update.update_id,
    });
    throw error;
  }
}

/**
 * Verify webhook secret (if configured)
 * @param {Object} req Express request object
 * @returns {boolean} True if valid
 */
function verifyWebhookSecret(req) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret) {
    return true; // No secret configured, allow all
  }

  const providedSecret = req.headers['x-telegram-bot-api-secret-token'];
  return providedSecret === secret;
}

/**
 * Express middleware for webhook handling
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @param {Function} next Next middleware
 */
async function webhookMiddleware(req, res, next) {
  try {
    // Verify webhook secret
    if (!verifyWebhookSecret(req)) {
      logger.warn('Invalid webhook secret', {
        ip: req.ip,
      });
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Handle update
    const update = req.body;
    await handleUpdate(update);

    // Respond immediately to Telegram
    res.status(200).json({ ok: true });
  } catch (error) {
    logger.error('Webhook middleware error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  handleUpdate,
  verifyWebhookSecret,
  webhookMiddleware,
};

