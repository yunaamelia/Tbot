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
const checkoutHandler = require('./lib/order/checkout-handler');
const qrisHandler = require('./lib/payment/qris-handler');
const manualVerificationHandler = require('./lib/payment/manual-verification');
const customerService = require('./lib/customer/customer-service');
const paymentService = require('./lib/payment/payment-service');
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

      // Handle checkout callbacks (T064, T065, T066)
      if (callbackData.startsWith('product_buy_')) {
        const productId = parseInt(callbackData.replace('product_buy_', ''), 10);
        const userId = ctx.from.id;

        // Get or create customer (for future use)
        await customerService.getOrCreateCustomer(userId, {
          name: ctx.from.first_name,
          username: ctx.from.username,
        });

        // Start checkout
        const checkoutResponse = await checkoutHandler.startCheckout(userId, productId, 1);

        await ctx.editMessageText(checkoutResponse.message.text, {
          parse_mode: checkoutResponse.message.parse_mode,
          reply_markup: checkoutResponse.message.reply_markup,
        });

        await ctx.answerCallbackQuery();
        return;
      }

      // Handle checkout confirmation
      if (callbackData === 'checkout_confirm') {
        const userId = ctx.from.id;
        // Get or create customer (for future use)
        await customerService.getOrCreateCustomer(userId, {
          name: ctx.from.first_name,
          username: ctx.from.username,
        });

        // Proceed to payment method selection
        const paymentMethodResponse = await checkoutHandler.selectPaymentMethod(userId);

        await ctx.editMessageText(paymentMethodResponse.message.text, {
          parse_mode: paymentMethodResponse.message.parse_mode,
          reply_markup: paymentMethodResponse.message.reply_markup,
        });

        await ctx.answerCallbackQuery();
        return;
      }

      // Handle checkout cancel
      if (callbackData === 'checkout_cancel') {
        const userId = ctx.from.id;
        await checkoutHandler.cancelCheckout(userId);
        await ctx.editMessageText(i18n.t('checkout_cancelled'));
        await ctx.answerCallbackQuery();
        return;
      }

      // Handle payment method selection
      if (callbackData === 'checkout_payment_qris' || callbackData === 'checkout_payment_manual') {
        const userId = ctx.from.id;
        const customer = await customerService.getOrCreateCustomer(userId, {
          name: ctx.from.first_name,
          username: ctx.from.username,
        });

        const session = await checkoutHandler.getCurrentSession(userId);
        if (!session) {
          await ctx.answerCallbackQuery('Sesi checkout tidak ditemukan');
          return;
        }

        // Determine payment method
        const paymentMethod =
          callbackData === 'checkout_payment_qris' ? 'qris' : 'manual_bank_transfer';

        // Confirm checkout and create order
        const order = await checkoutHandler.confirmCheckout(userId, customer.id, paymentMethod);

        // Create payment record
        await paymentService.createPayment(order.id, paymentMethod, order.total_amount);

        // Update session with payment method
        const checkoutSession = require('./lib/order/checkout-session');
        await checkoutSession.updateStep(userId, 'payment_processing', {
          paymentMethod,
          orderId: order.id,
        });

        if (paymentMethod === 'qris') {
          // Generate QRIS payment (T067)
          const qrisData = await qrisHandler.generateQRIS(
            order.id,
            order.total_amount,
            customer.name || 'Customer'
          );

          const qrisMessage = qrisHandler.formatQRISMessage(qrisData, order.id);

          // Send QRIS code/image
          if (qrisData.qrCodeUrl) {
            try {
              await ctx.replyWithPhoto(qrisData.qrCodeUrl, {
                caption: qrisMessage.text,
                parse_mode: qrisMessage.parse_mode,
              });
            } catch (error) {
              // Fallback to text if photo fails
              await ctx.reply(qrisMessage.text, {
                parse_mode: qrisMessage.parse_mode,
              });
            }
          } else {
            await ctx.reply(qrisMessage.text, {
              parse_mode: qrisMessage.parse_mode,
            });
          }
        } else {
          // Manual bank transfer (T068)
          const manualMessage = manualVerificationHandler.formatManualTransferInstructions(
            order.id,
            order.total_amount
          );

          await ctx.editMessageText(manualMessage.text, {
            parse_mode: manualMessage.parse_mode,
          });
        }

        await ctx.answerCallbackQuery();
        return;
      }

      // Handle back to order summary
      if (callbackData === 'checkout_back_summary') {
        const userId = ctx.from.id;
        const session = await checkoutHandler.getCurrentSession(userId);
        if (session) {
          const summaryMessage = checkoutHandler.formatOrderSummary(session);
          await ctx.editMessageText(summaryMessage.text, {
            parse_mode: summaryMessage.parse_mode,
            reply_markup: summaryMessage.reply_markup,
          });
        }
        await ctx.answerCallbackQuery();
        return;
      }
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

      // Start checkout timeout cleanup scheduler (T074)
      const checkoutTimeout = require('./lib/order/checkout-timeout');
      checkoutTimeout.startCleanupScheduler();

      // Start notification retry scheduler (T091)
      const notificationRetryScheduler = require('./lib/admin/notification-retry-scheduler');
      notificationRetryScheduler.startScheduler();
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
