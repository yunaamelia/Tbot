/**
 * Checkout handler with step-by-step wizard
 * Manages the complete checkout flow from product selection to payment
 *
 * Task: T058
 * Requirement: FR-004, FR-025
 */

const orderService = require('./order-service');
const productService = require('../product/product-service');
const stockRepository = require('../product/stock-repository');
const checkoutSession = require('./checkout-session');
const { NotFoundError, ConflictError } = require('../shared/errors');
const i18n = require('../shared/i18n');
const logger = require('../shared/logger').child('checkout-handler');

const CHECKOUT_STEPS = {
  ORDER_SUMMARY: 'order_summary',
  PAYMENT_METHOD: 'payment_method',
  PAYMENT_PROCESSING: 'payment_processing',
  COMPLETED: 'completed',
};

class CheckoutHandler {
  /**
   * Start checkout process (Step 1: Order Summary)
   * @param {number} userId Telegram user ID
   * @param {number} productId Product ID
   * @param {number} quantity Quantity (default: 1)
   * @returns {Promise<Object>} Checkout response with order summary
   */
  async startCheckout(userId, productId, quantity = 1) {
    try {
      // Validate product exists and is available
      const product = await productService.getProductById(productId);
      if (!product) {
        throw new NotFoundError(i18n.t('product_not_found'));
      }

      // Out-of-stock validation (T072)
      const stock = await stockRepository.findByProductId(productId);
      if (!stock || !stock.isAvailable(quantity)) {
        throw new ConflictError(i18n.t('product_out_of_stock'));
      }

      // Check if product is available
      if (!product.isAvailable()) {
        throw new ConflictError(i18n.t('product_out_of_stock'));
      }

      // Calculate total amount
      const totalAmount = product.price * quantity;

      // Create checkout session
      const sessionData = {
        userId,
        productId,
        productName: product.name,
        quantity,
        price: product.price,
        totalAmount,
        step: CHECKOUT_STEPS.ORDER_SUMMARY,
        createdAt: new Date().toISOString(),
      };

      await checkoutSession.setSession(userId, sessionData);

      // Format order summary message (T065)
      const summaryMessage = this.formatOrderSummary(sessionData);

      logger.info('Checkout started', { userId, productId, quantity, totalAmount });

      return {
        step: CHECKOUT_STEPS.ORDER_SUMMARY,
        message: summaryMessage,
        sessionData,
      };
    } catch (error) {
      logger.error('Error starting checkout', error, { userId, productId, quantity });
      throw error;
    }
  }

  /**
   * Format order summary message (Step 1) - Exposed for bot.js
   * @param {Object} sessionData Session data
   * @returns {Object} Formatted message with text and inline keyboard
   */
  formatOrderSummary(sessionData) {
    const text =
      `📋 *Ringkasan Pesanan*\n\n` +
      `Produk: *${sessionData.productName}*\n` +
      `Jumlah: ${sessionData.quantity}\n` +
      `Harga per item: Rp ${sessionData.price.toLocaleString('id-ID')}\n` +
      `*Total: Rp ${sessionData.totalAmount.toLocaleString('id-ID')}*\n\n` +
      `Lanjutkan ke pemilihan metode pembayaran?`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '✅ Konfirmasi', callback_data: 'checkout_confirm' },
          { text: '❌ Batal', callback_data: 'checkout_cancel' },
        ],
      ],
    };

    return { text, reply_markup: keyboard };
  }

  /**
   * Proceed to payment method selection (Step 2)
   * @param {number} userId Telegram user ID
   * @returns {Promise<Object>} Payment method selection response
   */
  async selectPaymentMethod(userId) {
    try {
      const session = await checkoutSession.getSession(userId);
      if (!session) {
        throw new NotFoundError('Checkout session not found. Silakan mulai checkout lagi.');
      }

      if (session.step !== CHECKOUT_STEPS.ORDER_SUMMARY) {
        throw new ConflictError('Invalid checkout step');
      }

      // Update session to payment method selection step
      await checkoutSession.updateStep(userId, CHECKOUT_STEPS.PAYMENT_METHOD);

      // Format payment method selection message (T066)
      const message = this.formatPaymentMethodSelection(session);

      logger.info('Payment method selection', { userId, orderId: session.orderId });

      return {
        step: CHECKOUT_STEPS.PAYMENT_METHOD,
        message,
        sessionData: session,
      };
    } catch (error) {
      logger.error('Error selecting payment method', error, { userId });
      throw error;
    }
  }

  /**
   * Format payment method selection message (Step 2)
   * @param {Object} sessionData Session data
   * @returns {Object} Formatted message with text and inline keyboard
   */
  formatPaymentMethodSelection(sessionData) {
    const text =
      `💳 *Pilih Metode Pembayaran*\n\n` +
      `Total pembayaran: *Rp ${sessionData.totalAmount.toLocaleString('id-ID')}*\n\n` +
      `Pilih metode pembayaran yang Anda inginkan:`;

    const keyboard = {
      inline_keyboard: [
        [
          {
            text: '💳 QRIS Otomatis',
            callback_data: 'checkout_payment_qris',
          },
        ],
        [
          {
            text: '🏦 Transfer Bank Manual',
            callback_data: 'checkout_payment_manual',
          },
        ],
        [{ text: '◀️ Kembali', callback_data: 'checkout_back_summary' }],
      ],
    };

    return { text, reply_markup: keyboard };
  }

  /**
   * Confirm checkout and create order
   * @param {number} userId Telegram user ID
   * @param {number} customerId Customer ID (from database)
   * @param {string} paymentMethod Payment method ('qris' or 'manual_bank_transfer')
   * @returns {Promise<Object>} Created order
   */
  async confirmCheckout(userId, customerId, paymentMethod = 'qris') {
    try {
      const session = await checkoutSession.getSession(userId);
      if (!session) {
        throw new NotFoundError('Checkout session not found');
      }

      // Create order with stock reservation (T070)
      const order = await orderService.createOrder(
        customerId,
        session.productId,
        session.quantity,
        paymentMethod,
        session.price
      );

      // Update session with order ID
      await checkoutSession.updateStep(userId, CHECKOUT_STEPS.PAYMENT_PROCESSING, {
        orderId: order.id,
      });

      logger.info('Checkout confirmed and order created', {
        userId,
        orderId: order.id,
        productId: session.productId,
      });

      return order;
    } catch (error) {
      logger.error('Error confirming checkout', error, { userId });
      // Cleanup session on error
      await checkoutSession.deleteSession(userId);
      throw error;
    }
  }

  /**
   * Cancel checkout and cleanup session
   * @param {number} userId Telegram user ID
   * @returns {Promise<void>}
   */
  async cancelCheckout(userId) {
    try {
      await checkoutSession.deleteSession(userId);
      logger.info('Checkout cancelled', { userId });
    } catch (error) {
      logger.error('Error cancelling checkout', error, { userId });
      throw error;
    }
  }

  /**
   * Get current checkout session
   * @param {number} userId Telegram user ID
   * @returns {Promise<Object|null>} Session data
   */
  async getCurrentSession(userId) {
    return await checkoutSession.getSession(userId);
  }
}

module.exports = new CheckoutHandler();
