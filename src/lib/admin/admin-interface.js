/**
 * Admin interface for viewing order history and customer information
 *
 * Task: T110, T111
 * Requirement: FR-029
 */

const { table } = require('../database/query-builder');
const orderRepository = require('../order/order-repository');
const customerService = require('../customer/customer-service');
const productRepository = require('../product/product-repository');
const accessControl = require('../security/access-control');
const { NotFoundError } = require('../shared/errors');
const logger = require('../shared/logger').child('admin-interface');
const i18n = require('../shared/i18n');

class AdminInterface {
  /**
   * Get order history with pagination (T110)
   * @param {number} telegramUserId Admin Telegram user ID
   * @param {Object} options Pagination and filter options
   * @param {number} options.limit Number of orders to return (default: 10)
   * @param {number} options.offset Offset for pagination (default: 0)
   * @param {string} options.status Filter by order status (optional)
   * @returns {Promise<Object>} Order history with formatted messages
   */
  async getOrderHistory(telegramUserId, options = {}) {
    try {
      // Require order_view permission
      await accessControl.requirePermission(telegramUserId, 'order_view');

      const limit = options.limit || 10;
      const offset = options.offset || 0;
      const statusFilter = options.status;

      // Build query
      let query = table('orders')
        .select(
          'orders.*',
          'customers.name as customer_name',
          'customers.username as customer_username',
          'customers.telegram_user_id as customer_telegram_id',
          'products.name as product_name'
        )
        .leftJoin('customers', 'orders.customer_id', 'customers.id')
        .leftJoin('products', 'orders.product_id', 'products.id')
        .orderBy('orders.created_timestamp', 'desc')
        .limit(limit)
        .offset(offset);

      if (statusFilter) {
        query = query.where('orders.order_status', statusFilter);
      }

      const rows = await query;

      // Format orders for display
      const formattedOrders = await Promise.all(
        rows.map(async (row) => {
          const orderStatusMap = {
            pending_payment: 'Menunggu Pembayaran',
            payment_received: 'Pembayaran Diterima',
            processing: 'Sedang Diproses',
            account_delivered: 'Akun Terkirim',
            completed: 'Selesai',
            cancelled: 'Dibatalkan',
          };

          const paymentStatusMap = {
            pending: 'Menunggu',
            verified: 'Terverifikasi',
            failed: 'Gagal',
            refunded: 'Dikembalikan',
          };

          return {
            id: row.id,
            customerName: row.customer_name || 'Tidak diketahui',
            customerUsername: row.customer_username || '-',
            customerTelegramId: row.customer_telegram_id,
            productName: row.product_name || 'Produk tidak ditemukan',
            quantity: row.quantity,
            totalAmount: parseFloat(row.total_amount),
            orderStatus: orderStatusMap[row.order_status] || row.order_status,
            paymentStatus: paymentStatusMap[row.payment_status] || row.payment_status,
            paymentMethod: row.payment_method === 'qris' ? 'QRIS' : 'Transfer Bank Manual',
            createdAt: new Date(row.created_timestamp),
          };
        })
      );

      // Get total count for pagination
      let countQuery = table('orders');
      if (statusFilter) {
        countQuery = countQuery.where('order_status', statusFilter);
      }
      const [{ count }] = await countQuery.count('id as count');
      const totalCount = parseInt(count, 10);

      return {
        orders: formattedOrders,
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + limit < totalCount,
        },
      };
    } catch (error) {
      logger.error('Error getting order history', error, { telegramUserId, options });
      throw error;
    }
  }

  /**
   * Format order history as message (T110)
   * @param {number} telegramUserId Admin Telegram user ID
   * @param {Object} options Pagination and filter options
   * @returns {Promise<Object>} Formatted message with order history
   */
  async formatOrderHistoryMessage(telegramUserId, options = {}) {
    try {
      const history = await this.getOrderHistory(telegramUserId, options);

      if (history.orders.length === 0) {
        return {
          text: '📋 *Riwayat Pesanan*\n\nTidak ada pesanan yang ditemukan.',
          parse_mode: 'Markdown',
        };
      }

      let text = '📋 *Riwayat Pesanan*\n\n';

      history.orders.forEach((order, index) => {
        text += `*${index + 1}. Pesanan #${order.id}*\n`;
        text += `Pelanggan: ${order.customerName}`;
        if (order.customerUsername && order.customerUsername !== '-') {
          text += ` (@${order.customerUsername})`;
        }
        text += `\nProduk: ${order.productName}\n`;
        text += `Jumlah: ${order.quantity}\n`;
        text += `Total: Rp ${order.totalAmount.toLocaleString('id-ID')}\n`;
        text += `Status: ${order.orderStatus}\n`;
        text += `Pembayaran: ${order.paymentStatus} (${order.paymentMethod})\n`;
        text += `Tanggal: ${order.createdAt.toLocaleDateString('id-ID')}\n\n`;
      });

      // Add pagination info
      if (history.pagination.total > history.pagination.limit) {
        text += `\n_Menampilkan ${history.pagination.offset + 1}-${Math.min(history.pagination.offset + history.pagination.limit, history.pagination.total)} dari ${history.pagination.total} pesanan_`;
      }

      return {
        text,
        parse_mode: 'Markdown',
      };
    } catch (error) {
      logger.error('Error formatting order history message', error, { telegramUserId });
      if (error instanceof NotFoundError || error.name === 'UnauthorizedError') {
        return {
          text: `❌ ${error.message}`,
          parse_mode: 'Markdown',
        };
      }
      return {
        text: i18n.t('error_generic'),
        parse_mode: 'Markdown',
      };
    }
  }

  /**
   * Get customer information (T111)
   * @param {number} telegramUserId Admin Telegram user ID
   * @param {number} customerId Customer ID
   * @returns {Promise<Object>} Customer information with order history
   */
  async getCustomerInfo(telegramUserId, customerId) {
    try {
      // Require customer_view permission
      await accessControl.requirePermission(telegramUserId, 'customer_view');

      // Get customer
      const customer = await customerService.getCustomerById(customerId);

      // Get customer orders
      const orders = await orderRepository.findByCustomerId(customerId);

      // Get order details with products
      const ordersWithDetails = await Promise.all(
        orders.map(async (order) => {
          const product = await productRepository.findById(order.product_id);
          return {
            id: order.id,
            productName: product ? product.name : 'Produk tidak ditemukan',
            quantity: order.quantity,
            totalAmount: parseFloat(order.total_amount),
            orderStatus: order.order_status,
            paymentStatus: order.payment_status,
            paymentMethod: order.payment_method,
            createdAt: order.created_timestamp,
          };
        })
      );

      return {
        customer: {
          id: customer.id,
          telegramUserId: customer.telegram_user_id,
          name: customer.name || 'Tidak diketahui',
          username: customer.username || '-',
          registrationDate: customer.registration_timestamp,
          lastActivity: customer.last_activity_timestamp,
          totalOrders: orders.length,
        },
        orders: ordersWithDetails,
      };
    } catch (error) {
      logger.error('Error getting customer info', error, { telegramUserId, customerId });
      throw error;
    }
  }

  /**
   * Format customer information as message (T111)
   * @param {number} telegramUserId Admin Telegram user ID
   * @param {number} customerId Customer ID
   * @returns {Promise<Object>} Formatted message with customer information
   */
  async formatCustomerInfoMessage(telegramUserId, customerId) {
    try {
      const info = await this.getCustomerInfo(telegramUserId, customerId);

      let text = '👤 *Informasi Pelanggan*\n\n';
      text += `*ID:* ${info.customer.id}\n`;
      text += `*Nama:* ${info.customer.name}\n`;
      if (info.customer.username && info.customer.username !== '-') {
        text += `*Username:* @${info.customer.username}\n`;
      }
      text += `*Telegram ID:* ${info.customer.telegramUserId}\n`;
      text += `*Total Pesanan:* ${info.customer.totalOrders}\n`;
      text += `*Tanggal Registrasi:* ${new Date(info.customer.registrationDate).toLocaleDateString('id-ID')}\n`;
      text += `*Aktivitas Terakhir:* ${new Date(info.customer.lastActivity).toLocaleDateString('id-ID')}\n\n`;

      if (info.orders.length > 0) {
        text += '*Riwayat Pesanan:*\n\n';
        info.orders.slice(0, 10).forEach((order, index) => {
          text += `${index + 1}. Pesanan #${order.id}\n`;
          text += `   Produk: ${order.productName}\n`;
          text += `   Jumlah: ${order.quantity} | Total: Rp ${order.totalAmount.toLocaleString('id-ID')}\n`;
          text += `   Status: ${order.orderStatus} | Pembayaran: ${order.paymentStatus}\n\n`;
        });

        if (info.orders.length > 10) {
          text += `_... dan ${info.orders.length - 10} pesanan lainnya_`;
        }
      } else {
        text += '*Belum ada pesanan*';
      }

      return {
        text,
        parse_mode: 'Markdown',
      };
    } catch (error) {
      logger.error('Error formatting customer info message', error, { telegramUserId, customerId });
      if (error instanceof NotFoundError || error.name === 'UnauthorizedError') {
        return {
          text: `❌ ${error.message}`,
          parse_mode: 'Markdown',
        };
      }
      return {
        text: i18n.t('error_generic'),
        parse_mode: 'Markdown',
      };
    }
  }
}

module.exports = new AdminInterface();
