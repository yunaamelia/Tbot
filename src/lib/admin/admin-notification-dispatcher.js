/**
 * Admin notification dispatcher
 * Sends real-time notifications to admins for orders, payments, and critical events
 *
 * Task: T114
 * Requirement: FR-013, FR-123
 */

const { getBot } = require('../telegram/api-client');
const adminRepository = require('./admin-repository');
const productRepository = require('../product/product-repository');
const customerService = require('../customer/customer-service');
const logger = require('../shared/logger').child('admin-notification-dispatcher');

const ADMIN_DELIVERY_TIMEOUT_MS = 5000; // 5 seconds (FR-123, T123)

// In-memory cache for admin notification read status (T125)
// Maps: messageId -> { adminId, notificationType, readAt }
const adminNotificationReadStatus = new Map();

class AdminNotificationDispatcher {
  /**
   * Send notification to all admins (T115, T116, T121, T122)
   * Respects admin notification preferences (T124)
   * @param {string} notificationType Type of notification
   * @param {Object} data Notification data
   * @param {Object} options Options (actionButtons, etc.)
   * @returns {Promise<Array>} Array of sent notification results
   */
  async sendToAllAdmins(notificationType, data, options = {}) {
    try {
      const admins = await adminRepository.findAll();
      const results = [];

      for (const admin of admins) {
        // Check notification preferences (T124)
        if (!this.shouldNotifyAdmin(admin, notificationType)) {
          logger.debug('Skipping notification for admin due to preferences', {
            adminId: admin.id,
            notificationType,
          });
          continue;
        }

        try {
          const result = await this.sendToAdmin(admin, notificationType, data, options);
          results.push({ adminId: admin.id, success: true, result });
        } catch (error) {
          logger.error('Error sending notification to admin', error, {
            adminId: admin.id,
            notificationType,
          });
          results.push({ adminId: admin.id, success: false, error: error.message });
        }
      }

      return results;
    } catch (error) {
      logger.error('Error sending notifications to all admins', error, { notificationType });
      throw error;
    }
  }

  /**
   * Send notification to a specific admin
   * @param {Admin} admin Admin object
   * @param {string} notificationType Type of notification
   * @param {Object} data Notification data
   * @param {Object} options Options (actionButtons, etc.)
   * @returns {Promise<Object>} Sent message result
   */
  async sendToAdmin(admin, notificationType, data, options = {}) {
    try {
      const bot = getBot();
      const message = await this.formatNotificationMessage(notificationType, data, options);

      // Send with timeout (T123)
      const sendPromise = bot.telegram.sendMessage(admin.telegram_user_id, message.text, {
        parse_mode: message.parse_mode || 'Markdown',
        reply_markup: message.reply_markup || undefined,
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error('Admin notification delivery timeout')),
          ADMIN_DELIVERY_TIMEOUT_MS
        )
      );

      const result = await Promise.race([sendPromise, timeoutPromise]);

      // Track notification for read status (T125)
      if (result.message_id) {
        adminNotificationReadStatus.set(result.message_id.toString(), {
          adminId: admin.id,
          adminTelegramId: admin.telegram_user_id,
          notificationType,
          sentAt: new Date(),
          readAt: null,
          read: false,
        });
      }

      logger.info('Admin notification sent successfully', {
        adminId: admin.id,
        notificationType,
        messageId: result.message_id,
      });

      return result;
    } catch (error) {
      logger.error('Error sending notification to admin', error, {
        adminId: admin.id,
        notificationType,
      });
      throw error;
    }
  }

  /**
   * Format notification message based on type
   * @param {string} notificationType Type of notification
   * @param {Object} data Notification data
   * @param {Object} options Options
   * @returns {Promise<Object>} Formatted message
   */
  async formatNotificationMessage(notificationType, data, options = {}) {
    switch (notificationType) {
      case 'new_order':
        return await this.formatNewOrderNotification(data, options);
      case 'payment_proof':
        return await this.formatPaymentProofNotification(data, options);
      case 'qris_verified':
        return await this.formatQRISVerifiedNotification(data, options);
      case 'payment_failed':
        return await this.formatPaymentFailedNotification(data, options);
      default:
        throw new Error(`Unknown admin notification type: ${notificationType}`);
    }
  }

  /**
   * Format new order notification (T115)
   * @param {Object} data Order data
   * @param {Object} _options Options (unused)
   * @returns {Object} Formatted message
   */
  async formatNewOrderNotification(data, _options = {}) {
    const order = data.order;
    const product = await productRepository.findById(order.product_id);
    const customer = await customerService.getCustomerById(order.customer_id);

    const text =
      `🆕 *Pesanan Baru*\n\n` +
      `*ID Pesanan:* #${order.id}\n` +
      `*Pelanggan:* ${customer.name || 'Tidak diketahui'}` +
      (customer.username ? ` (@${customer.username})` : '') +
      `\n*Produk:* ${product ? product.name : 'Tidak ditemukan'}\n` +
      `*Jumlah:* ${order.quantity}\n` +
      `*Total:* Rp ${parseFloat(order.total_amount).toLocaleString('id-ID')}\n` +
      `*Metode Pembayaran:* ${order.payment_method === 'qris' ? 'QRIS' : 'Transfer Bank Manual'}\n` +
      `*Status:* ${this.getOrderStatusText(order.order_status)}\n` +
      `*Tanggal:* ${new Date(order.created_timestamp).toLocaleString('id-ID')}\n\n` +
      `Pesanan menunggu verifikasi pembayaran.`;

    return {
      text,
      parse_mode: 'Markdown',
    };
  }

  /**
   * Format payment proof notification (T116)
   * @param {Object} data Payment proof data
   * @param {Object} options Options with actionButtons
   * @returns {Object} Formatted message
   */
  async formatPaymentProofNotification(data, options = {}) {
    const order = data.order;
    const payment = data.payment;
    const product = await productRepository.findById(order.product_id);
    const customer = await customerService.getCustomerById(order.customer_id);

    const text =
      `💳 *Bukti Pembayaran Diterima*\n\n` +
      `*ID Pesanan:* #${order.id}\n` +
      `*Pelanggan:* ${customer.name || 'Tidak diketahui'}` +
      (customer.username ? ` (@${customer.username})` : '') +
      `\n*Produk:* ${product ? product.name : 'Tidak ditemukan'}\n` +
      `*Jumlah:* Rp ${parseFloat(order.total_amount).toLocaleString('id-ID')}\n` +
      `*Metode:* Transfer Bank Manual\n` +
      `*Status Pembayaran:* ${payment.status}\n\n` +
      `Silakan verifikasi bukti pembayaran.`;

    const reply_markup = options.actionButtons || {
      inline_keyboard: [
        [
          {
            text: '✅ Verifikasi',
            callback_data: `admin_payment_verify_${payment.id}`,
          },
          {
            text: '❌ Tolak',
            callback_data: `admin_payment_reject_${payment.id}`,
          },
        ],
        [
          {
            text: '📋 Lihat Detail Pesanan',
            callback_data: `admin_order_view_${order.id}`,
          },
        ],
      ],
    };

    return {
      text,
      parse_mode: 'Markdown',
      reply_markup,
    };
  }

  /**
   * Format QRIS verified notification (T121)
   * @param {Object} data QRIS verification data
   * @param {Object} _options Options (unused)
   * @returns {Object} Formatted message
   */
  async formatQRISVerifiedNotification(data, _options = {}) {
    const order = data.order;
    const product = await productRepository.findById(order.product_id);

    const text =
      `✅ *Pembayaran QRIS Terverifikasi Otomatis*\n\n` +
      `*ID Pesanan:* #${order.id}\n` +
      `*Produk:* ${product ? product.name : 'Tidak ditemukan'}\n` +
      `*Jumlah:* Rp ${parseFloat(order.total_amount).toLocaleString('id-ID')}\n` +
      `*Status:* Pembayaran berhasil diverifikasi secara otomatis\n` +
      `*Waktu:* ${new Date().toLocaleString('id-ID')}\n\n` +
      `Pesanan siap diproses.`;

    return {
      text,
      parse_mode: 'Markdown',
    };
  }

  /**
   * Format payment failed notification (T122)
   * @param {Object} data Payment failure data
   * @param {Object} _options Options (unused)
   * @returns {Object} Formatted message
   */
  async formatPaymentFailedNotification(data, _options = {}) {
    const order = data.order;
    const payment = data.payment;
    const reason = data.reason || 'Tidak diketahui';
    const product = await productRepository.findById(order.product_id);

    const text =
      `⚠️ *Pembayaran Gagal atau Memerlukan Perhatian*\n\n` +
      `*ID Pesanan:* #${order.id}\n` +
      `*Produk:* ${product ? product.name : 'Tidak ditemukan'}\n` +
      `*Jumlah:* Rp ${parseFloat(order.total_amount).toLocaleString('id-ID')}\n` +
      `*Alasan:* ${reason}\n` +
      `*Status Pembayaran:* ${payment.status}\n\n` +
      `Tindakan diperlukan untuk menangani pembayaran ini.`;

    return {
      text,
      parse_mode: 'Markdown',
    };
  }

  /**
   * Check if admin should receive notification based on preferences (T124)
   * @param {Admin} admin Admin object
   * @param {string} notificationType Notification type
   * @returns {boolean} True if admin should be notified
   */
  shouldNotifyAdmin(admin, notificationType) {
    const preferences = admin.notification_preferences || {};

    // If no preferences set, notify by default
    if (!preferences || Object.keys(preferences).length === 0) {
      return true;
    }

    // Check if notification type is disabled
    if (preferences.disabled_types && preferences.disabled_types.includes(notificationType)) {
      return false;
    }

    // Check if all notifications are disabled
    if (preferences.all_disabled === true) {
      return false;
    }

    return true;
  }

  /**
   * Mark admin notification as read (T125)
   * Called when admin interacts with notification (e.g., clicks action button)
   * @param {number} messageId Telegram message ID
   * @param {number} adminTelegramId Admin Telegram user ID
   * @returns {Promise<void>}
   */
  markNotificationAsRead(messageId, adminTelegramId) {
    try {
      const key = messageId.toString();
      const notification = adminNotificationReadStatus.get(key);

      if (notification && notification.adminTelegramId === adminTelegramId) {
        notification.read = true;
        notification.readAt = new Date();
        adminNotificationReadStatus.set(key, notification);

        logger.info('Admin notification marked as read', {
          messageId,
          adminTelegramId,
          notificationType: notification.notificationType,
        });
      }
    } catch (error) {
      logger.error('Error marking notification as read', error, { messageId, adminTelegramId });
    }
  }

  /**
   * Get notification read status (T125)
   * @param {number} messageId Telegram message ID
   * @param {number} adminTelegramId Admin Telegram user ID
   * @returns {Object|null} Read status or null if not found
   */
  getNotificationReadStatus(messageId, adminTelegramId) {
    const key = messageId.toString();
    const notification = adminNotificationReadStatus.get(key);

    if (notification && notification.adminTelegramId === adminTelegramId) {
      return {
        read: notification.read,
        readAt: notification.readAt,
        sentAt: notification.sentAt,
        notificationType: notification.notificationType,
      };
    }

    return null;
  }

  /**
   * Get order status text in Indonesian
   * @param {string} status Order status
   * @returns {string} Status text
   */
  getOrderStatusText(status) {
    const statusMap = {
      pending_payment: 'Menunggu Pembayaran',
      payment_received: 'Pembayaran Diterima',
      processing: 'Sedang Diproses',
      account_delivered: 'Akun Terkirim',
      completed: 'Selesai',
      cancelled: 'Dibatalkan',
    };

    return statusMap[status] || status;
  }
}

module.exports = new AdminNotificationDispatcher();
