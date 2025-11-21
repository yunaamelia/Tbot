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
const adminCommands = require('./lib/admin/admin-commands');
const commandRouter = require('./lib/admin/hierarchy/command-router');
const commandHelp = require('./lib/admin/hierarchy/command-help');
const accessControl = require('./lib/security/access-control');
const orderService = require('./lib/order/order-service');
const faqHandler = require('./lib/customer-service/faq-handler');
const chatHandler = require('./lib/customer-service/chat-handler');
const customerServiceRouter = require('./lib/customer-service/customer-service-router');
const personalizationEngine = require('./lib/customer-service/personalization-engine');
const personaService = require('./lib/friday/persona-service');
const { isStoreOpen, getStoreClosedMessage } = require('./lib/shared/store-config');
const { asyncHandler } = require('./lib/shared/errors');
const logger = require('./lib/shared/logger').child('bot');
const i18n = require('./lib/shared/i18n');

// Get bot instance (already initialized in api-client)
const bot = getBot();

/**
 * Helper function to safely edit message text (handles "message is not modified" error)
 * @param {Context} ctx Telegraf context
 * @param {string} text Message text
 * @param {Object} options Message options
 * @returns {Promise<void>}
 */
async function safeEditMessageText(ctx, text, options = {}) {
  try {
    await ctx.editMessageText(text, options);
  } catch (editError) {
    // Ignore "message is not modified" error (Telegram API limitation)
    if (!editError.message || !editError.message.includes('message is not modified')) {
      throw editError;
    }
  }
}

/**
 * Helper function to safely answer callback query
 * @param {Context} ctx Telegraf context
 * @param {string} text Optional text to show
 * @returns {Promise<void>}
 */
async function safeAnswerCallbackQuery(ctx, text = '') {
  if (ctx && typeof ctx.answerCallbackQuery === 'function') {
    try {
      await ctx.answerCallbackQuery(text);
    } catch (answerError) {
      logger.error('Error answering callback query', answerError);
    }
  }
}

/**
 * Admin command handlers (T106, T068)
 */

// /admin hierarchical command handler (T068)
bot.command(
  'admin',
  asyncHandler(async (ctx) => {
    try {
      const commandText = ctx.message.text;
      const parts = commandText.split(' ').slice(1); // Remove '/admin'
      const path = parts.length > 0 ? `admin ${parts.join(' ')}` : 'admin';
      const args = parts.length > 1 ? parts.slice(1).join(' ') : '';

      // Route command through hierarchical system
      const result = await commandRouter.routeCommand(path, ctx.from.id, args);

      if (result.success && result.handler) {
        const response = await result.handler(ctx.from.id, args);
        await ctx.reply(response.text, {
          parse_mode: response.parse_mode || 'Markdown',
        });
      } else {
        // Command not found or error - show error with suggestions
        let errorMessage = `❌ ${result.error || 'Perintah tidak ditemukan.'}\n\n`;

        if (result.suggestions && result.suggestions.length > 0) {
          errorMessage += '*Saran perintah:*\n';
          result.suggestions.forEach((suggestion) => {
            const displayPath = suggestion.replace(/\./g, ' ');
            errorMessage += `• /${displayPath}\n`;
          });
        } else {
          // Show help for admin if no suggestions
          const help = await commandRouter.getHelp('admin', ctx.from.id);
          errorMessage += commandHelp.formatHelpMessage(help);
        }

        await ctx.reply(errorMessage, { parse_mode: 'Markdown' });
      }
    } catch (error) {
      logger.error('Error handling /admin command', error);
      await ctx.reply(i18n.t('error_generic'));
    }
  })
);

// /stock command handler (T098, T099)
bot.command(
  'stock',
  asyncHandler(async (ctx) => {
    try {
      const commandArgs = ctx.message.text.replace('/stock', '').trim();
      const response = await adminCommands.handleStockCommand(ctx.from.id, commandArgs);
      await ctx.reply(response.text, { parse_mode: response.parse_mode });
    } catch (error) {
      logger.error('Error handling /stock command', error);
      await ctx.reply(i18n.t('error_generic'));
    }
  })
);

// /open command handler (T100)
bot.command(
  'open',
  asyncHandler(async (ctx) => {
    try {
      const response = await adminCommands.handleOpenCommand(ctx.from.id);
      await ctx.reply(response.text, { parse_mode: response.parse_mode });
    } catch (error) {
      logger.error('Error handling /open command', error);
      await ctx.reply(i18n.t('error_generic'));
    }
  })
);

// /close command handler (T101)
bot.command(
  'close',
  asyncHandler(async (ctx) => {
    try {
      const response = await adminCommands.handleCloseCommand(ctx.from.id);
      await ctx.reply(response.text, { parse_mode: response.parse_mode });
    } catch (error) {
      logger.error('Error handling /close command', error);
      await ctx.reply(i18n.t('error_generic'));
    }
  })
);

// /addproduct command handler
bot.command(
  'addproduct',
  asyncHandler(async (ctx) => {
    try {
      const commandArgs = ctx.message.text.replace('/addproduct', '').trim();
      const response = await adminCommands.handleAddProductCommand(ctx.from.id, commandArgs);
      await ctx.reply(response.text, { parse_mode: response.parse_mode });
    } catch (error) {
      logger.error('Error handling /addproduct command', error);
      await ctx.reply(i18n.t('error_generic'));
    }
  })
);

/**
 * /start command handler
 * Shows first product card or empty catalog message
 * Includes personalized greeting (T143)
 */
bot.command(
  'start',
  asyncHandler(async (ctx) => {
    try {
      // Get or create customer and update activity
      const userId = ctx.from.id;
      await customerService.getOrCreateCustomer(userId, {
        name: ctx.from.first_name || ctx.from.username,
        username: ctx.from.username,
      });

      // Get FRIDAY personalized greeting (T023, User Story 1)
      const fridayGreeting = await personaService.getGreeting(userId);

      // Get personalized greeting (T143) - combine with FRIDAY greeting
      const personalizedGreeting = await personalizationEngine.getPersonalizedGreeting(userId);
      const greeting = fridayGreeting + '\n\n' + personalizedGreeting;

      // Check if store is open
      const storeOpen = await isStoreOpen();
      if (!storeOpen) {
        await ctx.reply(`${greeting}\n\n${getStoreClosedMessage()}`);
        return;
      }

      // Check if catalog is empty
      const isEmpty = await productService.isCatalogEmpty();
      if (isEmpty) {
        const emptyMessage = productCardFormatter.formatEmptyCatalog();
        await ctx.reply(`${greeting}\n\n${emptyMessage.text}`, {
          parse_mode: emptyMessage.parse_mode,
        });
        return;
      }

      // Get first product card
      const firstCard = await productCarouselHandler.getProductCard(0);

      // Handle media group response (T042D)
      if (firstCard.type === 'media_group') {
        try {
          await ctx.replyWithMediaGroup(firstCard.mediaGroup);
          // Also send text message with buttons (since media group caption is limited)
          await ctx.reply(`${greeting}\n\n${firstCard.textMessage.text}`, {
            parse_mode: firstCard.textMessage.parse_mode,
            reply_markup: firstCard.textMessage.reply_markup,
          });
        } catch (error) {
          logger.error('Error sending media group, falling back to text', error);
          // Fallback to text-only if media group fails
          await ctx.reply(`${greeting}\n\n${firstCard.textMessage.text}`, {
            parse_mode: firstCard.textMessage.parse_mode,
            reply_markup: firstCard.textMessage.reply_markup,
          });
        }
      } else {
        // Text-only display
        await ctx.reply(`${greeting}\n\n${firstCard.text}`, {
          parse_mode: firstCard.parse_mode,
          reply_markup: firstCard.reply_markup,
        });
      }
    } catch (error) {
      logger.error('Error handling /start command', error);
      await ctx.reply(i18n.t('error_generic'));
    }
  })
);

/**
 * /help command handler (T146)
 * Shows FAQ access and customer service options
 */
bot.command(
  'help',
  asyncHandler(async (ctx) => {
    try {
      const userId = ctx.from.id;
      await customerService.getOrCreateCustomer(userId, {
        name: ctx.from.first_name || ctx.from.username,
        username: ctx.from.username,
      });

      const helpMessage =
        `*🆘 Bantuan & Dukungan*\n\n` +
        `Saya di sini untuk membantu Anda! Pilih opsi di bawah ini:\n\n` +
        `• *FAQ* - Lihat pertanyaan yang sering diajukan\n` +
        `• *Chat dengan Admin* - Berbicara langsung dengan admin\n` +
        `• *Buat Tiket* - Buat tiket support untuk masalah spesifik\n\n` +
        `_Gunakan tombol di bawah untuk memulai._`;

      await ctx.reply(helpMessage, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📋 Lihat FAQ', callback_data: 'faq_list' }],
            [{ text: '💬 Chat dengan Admin', callback_data: 'chat_start' }],
            [{ text: '🎫 Buat Tiket Support', callback_data: 'ticket_create' }],
          ],
        },
      });
    } catch (error) {
      logger.error('Error handling /help command', error);
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
          await safeAnswerCallbackQuery(ctx, 'Invalid action');
          return;
        }

        // Handle media group response (T042D)
        if (updatedMessage.type === 'media_group') {
          try {
            await ctx.replyWithMediaGroup(updatedMessage.mediaGroup);
            // Also send text message with buttons
            await ctx.reply(updatedMessage.textMessage.text, {
              parse_mode: updatedMessage.textMessage.parse_mode,
              reply_markup: updatedMessage.textMessage.reply_markup,
            });
          } catch (error) {
            logger.error('Error sending media group, falling back to text', error);
            // Fallback to text-only if media group fails
            await safeEditMessageText(ctx, updatedMessage.textMessage.text, {
              parse_mode: updatedMessage.textMessage.parse_mode,
              reply_markup: updatedMessage.textMessage.reply_markup,
            });
          }
        } else {
          // Text-only display
          await safeEditMessageText(ctx, updatedMessage.text, {
            parse_mode: updatedMessage.parse_mode,
            reply_markup: updatedMessage.reply_markup,
          });
        }

        await safeAnswerCallbackQuery(ctx);
        return;
      }

      // Handle product details view (T042, T043)
      const productDetailsData = productDetailsHandler.parseCallbackData(callbackData);
      if (productDetailsData) {
        const userId = ctx.from.id;
        // Track browsing behavior for personalization (T145)
        await personalizationEngine.updateBrowsingBehavior(userId, productDetailsData.productId);

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
            await safeEditMessageText(ctx, response.textMessage.text, {
              parse_mode: response.textMessage.parse_mode,
              reply_markup: response.textMessage.reply_markup,
            });
          }
        } else {
          // Text-only display (T044)
          await safeEditMessageText(ctx, response.message.text, {
            parse_mode: response.message.parse_mode,
            reply_markup: response.message.reply_markup,
          });
        }

        await safeAnswerCallbackQuery(ctx);
        return;
      }

      // Handle carousel return (T046)
      const carouselData = productDetailsHandler.parseCarouselCallback(callbackData);
      if (carouselData) {
        const cardMessage = await productCarouselHandler.getProductCard(carouselData.index);

        // Handle media group response (T042D)
        if (cardMessage.type === 'media_group') {
          try {
            await ctx.replyWithMediaGroup(cardMessage.mediaGroup);
            // Also send text message with buttons
            await ctx.reply(cardMessage.textMessage.text, {
              parse_mode: cardMessage.textMessage.parse_mode,
              reply_markup: cardMessage.textMessage.reply_markup,
            });
          } catch (error) {
            logger.error('Error sending media group, falling back to text', error);
            // Fallback to text-only if media group fails
            await safeEditMessageText(ctx, cardMessage.textMessage.text, {
              parse_mode: cardMessage.textMessage.parse_mode,
              reply_markup: cardMessage.textMessage.reply_markup,
            });
          }
        } else {
          // Text-only display
          await safeEditMessageText(ctx, cardMessage.text, {
            parse_mode: cardMessage.parse_mode,
            reply_markup: cardMessage.reply_markup,
          });
        }
        await safeAnswerCallbackQuery(ctx);
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

        await safeEditMessageText(ctx, checkoutResponse.message.text, {
          parse_mode: checkoutResponse.message.parse_mode,
          reply_markup: checkoutResponse.message.reply_markup,
        });

        await safeAnswerCallbackQuery(ctx);
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

        await safeEditMessageText(ctx, paymentMethodResponse.message.text, {
          parse_mode: paymentMethodResponse.message.parse_mode,
          reply_markup: paymentMethodResponse.message.reply_markup,
        });

        await safeAnswerCallbackQuery(ctx);
        return;
      }

      // Handle checkout cancel
      if (callbackData === 'checkout_cancel') {
        const userId = ctx.from.id;
        await checkoutHandler.cancelCheckout(userId);
        await safeEditMessageText(ctx, i18n.t('checkout_cancelled'));
        await safeAnswerCallbackQuery(ctx);
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
          await safeAnswerCallbackQuery(ctx, 'Sesi checkout tidak ditemukan');
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

          await safeEditMessageText(ctx, manualMessage.text, {
            parse_mode: manualMessage.parse_mode,
          });
        }

        await safeAnswerCallbackQuery(ctx);
        return;
      }

      // Handle back to order summary
      if (callbackData === 'checkout_back_summary') {
        const userId = ctx.from.id;
        const session = await checkoutHandler.getCurrentSession(userId);
        if (session) {
          const summaryMessage = checkoutHandler.formatOrderSummary(session);
          await safeEditMessageText(ctx, summaryMessage.text, {
            parse_mode: summaryMessage.parse_mode,
            reply_markup: summaryMessage.reply_markup,
          });
        }
        await safeAnswerCallbackQuery(ctx);
        return;
      }

      // Handle FAQ callbacks (T146)
      if (callbackData.startsWith('faq_')) {
        const faqResponse = faqHandler.handleCallback(callbackData);
        if (faqResponse) {
          await safeEditMessageText(ctx, faqResponse.text, {
            parse_mode: faqResponse.parse_mode,
            reply_markup: faqResponse.reply_markup,
          });
          await safeAnswerCallbackQuery(ctx);
          return;
        }
      }

      // Handle chat callbacks (T140)
      if (callbackData.startsWith('chat_')) {
        const userId = ctx.from.id;
        if (callbackData === 'chat_start') {
          const chatSession = await chatHandler.startChat(userId);
          await safeEditMessageText(ctx, chatSession.message, { parse_mode: 'Markdown' });
          await safeAnswerCallbackQuery(ctx, 'Chat dimulai');
          return;
        }

        if (callbackData.startsWith('chat_accept_')) {
          const sessionId = parseInt(callbackData.replace('chat_accept_', ''), 10);
          const adminId = ctx.from.id;
          await chatHandler.acceptChat(sessionId, adminId);
          await safeEditMessageText(ctx, '✅ Chat session telah diterima.', {
            parse_mode: 'Markdown',
          });
          await safeAnswerCallbackQuery(ctx, 'Chat diterima');
          return;
        }

        if (callbackData.startsWith('chat_reject_')) {
          const sessionId = parseInt(callbackData.replace('chat_reject_', ''), 10);
          await chatHandler.closeChat(sessionId, ctx.from.id);
          await safeEditMessageText(ctx, '❌ Chat session ditolak.', { parse_mode: 'Markdown' });
          await safeAnswerCallbackQuery(ctx, 'Chat ditolak');
          return;
        }

        if (callbackData.startsWith('chat_close_')) {
          const sessionId = parseInt(callbackData.replace('chat_close_', ''), 10);
          await chatHandler.closeChat(sessionId, ctx.from.id);
          await safeEditMessageText(ctx, '✅ Chat session ditutup.', { parse_mode: 'Markdown' });
          await safeAnswerCallbackQuery(ctx, 'Chat ditutup');
          return;
        }
      }

      // Handle ticket callbacks (T141)
      if (callbackData.startsWith('ticket_')) {
        if (callbackData === 'ticket_create') {
          await safeEditMessageText(
            ctx,
            'Silakan kirim pesan yang menjelaskan masalah Anda, dan saya akan membuat tiket support untuk Anda.',
            { parse_mode: 'Markdown' }
          );
          await safeAnswerCallbackQuery(ctx, 'Kirim pesan untuk membuat tiket');
          return;
        }
      }

      // Handle admin payment verification (T118, T119)
      if (callbackData.startsWith('admin_payment_verify_')) {
        const adminId = ctx.from.id;
        const paymentId = parseInt(callbackData.replace('admin_payment_verify_', ''), 10);

        try {
          // Require payment_verify permission
          const admin = await accessControl.requirePermission(adminId, 'payment_verify');

          // Mark notification as read (T125)
          const adminNotificationDispatcher = require('./lib/admin/admin-notification-dispatcher');
          if (ctx.callbackQuery.message && ctx.callbackQuery.message.message_id) {
            adminNotificationDispatcher.markNotificationAsRead(
              ctx.callbackQuery.message.message_id,
              adminId
            );
          }

          // Verify payment (T119)
          const payment = await paymentService.verifyManualPayment(paymentId, admin.id);
          const order = await orderService.getOrderById(payment.order_id);

          // Update message to show verification result
          const message =
            `✅ *Pembayaran Diverifikasi*\n\n` +
            `Pembayaran untuk pesanan #${order.id} telah diverifikasi.\n` +
            `Status pesanan: ${order.order_status}\n\n` +
            `Pelanggan telah diberitahu.`;

          await safeEditMessageText(ctx, message, { parse_mode: 'Markdown' });
          await safeAnswerCallbackQuery(ctx, 'Pembayaran berhasil diverifikasi');

          logger.info('Payment verified by admin', {
            adminId: admin.id,
            paymentId,
            orderId: order.id,
          });
        } catch (error) {
          logger.error('Error verifying payment', error, { adminId, paymentId });
          if (error.name === 'UnauthorizedError') {
            await safeAnswerCallbackQuery(
              ctx,
              'Anda tidak memiliki izin untuk melakukan tindakan ini'
            );
          } else {
            await safeAnswerCallbackQuery(ctx, 'Terjadi kesalahan saat memverifikasi pembayaran');
          }
        }
        return;
      }

      // Handle admin payment rejection (T118, T120)
      if (callbackData.startsWith('admin_payment_reject_')) {
        const adminId = ctx.from.id;
        const paymentId = parseInt(callbackData.replace('admin_payment_reject_', ''), 10);

        try {
          // Require payment_verify permission
          const admin = await accessControl.requirePermission(adminId, 'payment_verify');

          // Mark notification as read (T125)
          const adminNotificationDispatcher = require('./lib/admin/admin-notification-dispatcher');
          if (ctx.callbackQuery.message && ctx.callbackQuery.message.message_id) {
            adminNotificationDispatcher.markNotificationAsRead(
              ctx.callbackQuery.message.message_id,
              adminId
            );
          }

          // Reject payment (T120)
          const payment = await paymentService.markPaymentAsFailed(
            paymentId,
            'Pembayaran ditolak oleh admin'
          );
          const order = await orderService.getOrderById(payment.order_id);

          // Update message to show rejection result
          const message =
            `❌ *Pembayaran Ditolak*\n\n` +
            `Pembayaran untuk pesanan #${order.id} telah ditolak.\n` +
            `Alasan: Pembayaran ditolak oleh admin\n\n` +
            `Pelanggan telah diberitahu.`;

          await safeEditMessageText(ctx, message, { parse_mode: 'Markdown' });
          await safeAnswerCallbackQuery(ctx, 'Pembayaran ditolak');

          logger.info('Payment rejected by admin', {
            adminId: admin.id,
            paymentId,
            orderId: order.id,
          });
        } catch (error) {
          logger.error('Error rejecting payment', error, { adminId, paymentId });
          if (error.name === 'UnauthorizedError') {
            await safeAnswerCallbackQuery(
              ctx,
              'Anda tidak memiliki izin untuk melakukan tindakan ini'
            );
          } else {
            await safeAnswerCallbackQuery(ctx, 'Terjadi kesalahan saat menolak pembayaran');
          }
        }
        return;
      }
    } catch (error) {
      logger.error('Error handling callback query', error);
      await safeAnswerCallbackQuery(ctx, i18n.t('error_generic'));
    }
  })
);

/**
 * Text message handler for customer service routing (T147)
 * Routes messages to FAQ, chat, or ticket service based on content
 */
bot.on(
  'text',
  asyncHandler(async (ctx) => {
    try {
      // Skip if message is a command
      if (ctx.message.text.startsWith('/')) {
        return;
      }

      const userId = ctx.from.id;
      const messageText = ctx.message.text;

      // Check if message should be routed to customer service
      if (customerServiceRouter.shouldRouteToCustomerService(messageText)) {
        const routing = await customerServiceRouter.routeQuery(userId, messageText);
        if (routing.response) {
          await ctx.reply(routing.message || '', {
            parse_mode: routing.response.parse_mode,
            reply_markup: routing.response.reply_markup,
          });
        } else {
          await ctx.reply(routing.message || 'Terima kasih. Admin akan merespons segera.');
        }
        return;
      }

      // Check if customer has active chat session
      const activeSession = await chatHandler.getActiveSession(userId);
      if (activeSession && activeSession.status === 'active') {
        // Forward message to admin
        await chatHandler.sendCustomerMessage(activeSession.id, messageText);
        await ctx.reply('✅ Pesan Anda telah dikirim ke admin.');
        return;
      }

      // Track browsing behavior for personalization (T145)
      // This is a simple heuristic - in production, you'd track product views more explicitly
      // For now, we'll just update last activity
      await customerService.getOrCreateCustomer(userId, {
        name: ctx.from.first_name || ctx.from.username,
        username: ctx.from.username,
      });
    } catch (error) {
      logger.error('Error handling text message', error);
      // Don't reply to avoid spam - let other handlers process
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
