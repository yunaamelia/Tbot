/**
 * Admin command handlers for stock management and store control
 * Handles /stock, /open, /close commands
 *
 * Task: T098, T100, T101
 * Requirement: FR-010, FR-012, FR-013, FR-050
 */

const accessControl = require('../security/access-control');
const stockManager = require('../product/stock-manager');
const { setStoreStatus } = require('../shared/store-config');
const { ValidationError } = require('../shared/errors');
const logger = require('../shared/logger').child('admin-commands');
const i18n = require('../shared/i18n');

class AdminCommands {
  /**
   * Handle /stock command (T098, T099)
   * Format: /stock update <product_id> <quantity>
   * @param {number} telegramUserId Telegram user ID
   * @param {string} commandArgs Command arguments
   * @returns {Promise<Object>} Response message
   */
  async handleStockCommand(telegramUserId, commandArgs) {
    try {
      // Require stock_manage permission (T107)
      const admin = await accessControl.requirePermission(telegramUserId, 'stock_manage');

      // Parse command arguments
      const args = commandArgs.trim().split(/\s+/);
      if (args.length < 3 || args[0] !== 'update') {
        return {
          text:
            `❌ *Format Perintah Salah*\n\n` +
            `Format: /stock update <product_id> <quantity>\n\n` +
            `Contoh: /stock update 1 10`,
          parse_mode: 'Markdown',
        };
      }

      const productId = parseInt(args[1], 10);
      const quantity = parseInt(args[2], 10);

      if (isNaN(productId) || productId <= 0) {
        throw new ValidationError('Product ID harus berupa angka positif');
      }

      if (isNaN(quantity) || quantity < 0) {
        throw new ValidationError('Quantity harus berupa angka non-negatif');
      }

      // Update stock (T099, T104, T105)
      const result = await stockManager.updateStock(productId, quantity, admin.id);

      // Confirmation message (T108)
      const message =
        `✅ *Stok Berhasil Diperbarui*\n\n` +
        `Produk: *${result.product.name}*\n` +
        `Stok Baru: *${quantity}* unit\n` +
        `Status: *${result.product.availability_status === 'available' ? 'Tersedia' : 'Habis'}*\n\n` +
        `Stok telah diperbarui dan tersedia untuk pelanggan.`;

      logger.info('Stock updated via admin command', {
        adminId: admin.id,
        productId,
        quantity,
      });

      return {
        text: message,
        parse_mode: 'Markdown',
      };
    } catch (error) {
      logger.error('Error handling stock command', error, { telegramUserId, commandArgs });
      if (error instanceof ValidationError || error.name === 'UnauthorizedError') {
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
   * Handle /open command (T100)
   * Opens the store for customers
   * @param {number} telegramUserId Telegram user ID
   * @returns {Promise<Object>} Response message
   */
  async handleOpenCommand(telegramUserId) {
    try {
      // Require store_control permission (T107)
      const admin = await accessControl.requirePermission(telegramUserId, 'store_control');

      // Open store
      await setStoreStatus('open');

      // Confirmation message (T109)
      const message = `✅ *Toko Dibuka*\n\nToko telah dibuka dan pelanggan dapat berbelanja.`;

      logger.info('Store opened via admin command', { adminId: admin.id });

      return {
        text: message,
        parse_mode: 'Markdown',
      };
    } catch (error) {
      logger.error('Error handling open command', error, { telegramUserId });
      if (error.name === 'UnauthorizedError') {
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
   * Handle /close command (T101)
   * Closes the store for customers
   * @param {number} telegramUserId Telegram user ID
   * @returns {Promise<Object>} Response message
   */
  async handleCloseCommand(telegramUserId) {
    try {
      // Require store_control permission (T107)
      const admin = await accessControl.requirePermission(telegramUserId, 'store_control');

      // Close store
      await setStoreStatus('closed');

      // Confirmation message (T109)
      const message =
        `🔒 *Toko Ditutup*\n\n` +
        `Toko telah ditutup. Pelanggan tidak dapat berbelanja sampai toko dibuka kembali.`;

      logger.info('Store closed via admin command', { adminId: admin.id });

      return {
        text: message,
        parse_mode: 'Markdown',
      };
    } catch (error) {
      logger.error('Error handling close command', error, { telegramUserId });
      if (error.name === 'UnauthorizedError') {
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

module.exports = new AdminCommands();
