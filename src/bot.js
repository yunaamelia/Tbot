/**
 * Main Telegram bot entry point
 * Handles commands and callback queries for product browsing and details
 *
 * Tasks: T034, T035, T042, T043, T044, T046
 * Requirements: FR-001, FR-002, FR-003, FR-044, FR-046
 */

const { getBot } = require('./lib/telegram/api-client');
const productService = require('./lib/product/product-service');
const productCardFormatter = require('./lib/product/product-card-formatter');
const productCarouselHandler = require('./lib/product/product-carousel-handler');
const productDetailsHandler = require('./lib/product/product-details-handler');
const { isStoreOpen, getStoreClosedMessage } = require('./lib/shared/store-config');
const { asyncHandler } = require('./lib/shared/errors');
const logger = require('./lib/shared/logger').child('bot');
const i18n = require('./lib/shared/i18n');

// Get bot instance (already initialized in api-client)
const bot = getBot();

/**
 * /start command handler
 * Shows first product card or empty catalog message
 */
bot.command(
  'start',
  asyncHandler(async (ctx) => {
    try {
      // Check if store is open
      const storeOpen = await isStoreOpen();
      if (!storeOpen) {
        await ctx.reply(getStoreClosedMessage());
        return;
      }

      // Check if catalog is empty
      const isEmpty = await productService.isCatalogEmpty();
      if (isEmpty) {
        const emptyMessage = productCardFormatter.formatEmptyCatalog();
        await ctx.reply(emptyMessage.text, { parse_mode: emptyMessage.parse_mode });
        return;
      }

      // Get first product card
      const firstCard = await productCarouselHandler.getProductCard(0);
      await ctx.reply(firstCard.text, {
        parse_mode: firstCard.parse_mode,
        reply_markup: firstCard.reply_markup,
      });
    } catch (error) {
      logger.error('Error handling /start command', error);
      await ctx.reply(i18n.t('error_generic'));
    }
  })
);

/**
 * Callback query handler for carousel navigation
 * Handles next/previous buttons
 */
bot.on(
  'callback_query',
  asyncHandler(async (ctx) => {
    try {
      const callbackData = ctx.callbackQuery.data;

      // Parse carousel navigation
      const parsed = productCarouselHandler.parseCallbackData(callbackData);
      if (parsed) {
        let updatedMessage;

        if (parsed.action === 'next') {
          updatedMessage = await productCarouselHandler.handleNext(parsed.index);
        } else if (parsed.action === 'prev') {
          updatedMessage = await productCarouselHandler.handlePrevious(parsed.index);
        } else {
          await ctx.answerCallbackQuery('Invalid action');
          return;
        }

        // Update message with new product card
        await ctx.editMessageText(updatedMessage.text, {
          parse_mode: updatedMessage.parse_mode,
          reply_markup: updatedMessage.reply_markup,
        });

        await ctx.answerCallbackQuery();
        return;
      }

      // Handle product details view (T042, T043)
      const productDetailsData = productDetailsHandler.parseCallbackData(callbackData);
      if (productDetailsData) {
        const response = await productDetailsHandler.handleProductDetails(
          productDetailsData.productId,
          productDetailsData.carouselIndex
        );

        if (response.type === 'media_group') {
          // Send media group with caption
          try {
            await ctx.replyWithMediaGroup(response.mediaGroup);
            // Also send text message with buttons (since media group caption is limited)
            await ctx.reply(response.textMessage.text, {
              parse_mode: response.textMessage.parse_mode,
              reply_markup: response.textMessage.reply_markup,
            });
          } catch (error) {
            logger.error('Error sending media group, falling back to text', error);
            // Fallback to text-only if media group fails
            await ctx.editMessageText(response.textMessage.text, {
              parse_mode: response.textMessage.parse_mode,
              reply_markup: response.textMessage.reply_markup,
            });
          }
        } else {
          // Text-only display (T044)
          await ctx.editMessageText(response.message.text, {
            parse_mode: response.message.parse_mode,
            reply_markup: response.message.reply_markup,
          });
        }

        await ctx.answerCallbackQuery();
        return;
      }

      // Handle carousel return (T046)
      const carouselData = productDetailsHandler.parseCarouselCallback(callbackData);
      if (carouselData) {
        const cardMessage = await productCarouselHandler.getProductCard(carouselData.index);
        await ctx.editMessageText(cardMessage.text, {
          parse_mode: cardMessage.parse_mode,
          reply_markup: cardMessage.reply_markup,
        });
        await ctx.answerCallbackQuery();
        return;
      }

      // Handle other callback queries (product_buy) - will be implemented in later phases
      await ctx.answerCallbackQuery('Fitur ini akan segera tersedia');
    } catch (error) {
      logger.error('Error handling callback query', error);
      await ctx.answerCallbackQuery(i18n.t('error_generic'));
    }
  })
);

// Error handling middleware (FR-036, Article X)
bot.catch((err, ctx) => {
  logger.error('Unhandled bot error', err, {
    update: ctx.update,
  });
  // Try to send error message to user
  if (ctx.reply) {
    ctx.reply(i18n.t('error_generic')).catch(() => {
      // Ignore errors when sending error message
    });
  }
});

// Launch bot if this file is run directly
if (require.main === module) {
  bot
    .launch()
    .then(() => {
      logger.info('Bot launched successfully');
    })
    .catch((err) => {
      logger.error('Failed to launch bot', err);
      process.exit(1);
    });

  // Graceful shutdown
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}

module.exports = bot;
