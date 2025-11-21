/**
 * Admin command handlers for stock management and store control
 * Handles /stock, /open, /close commands
 *
 * Task: T098, T100, T101
 * Requirement: FR-010, FR-012, FR-013, FR-050
 */

const accessControl = require('../security/access-control');
const stockManager = require('../product/stock-manager');
const productService = require('../product/product-service');
const { setStoreStatus } = require('../shared/store-config');
const { ValidationError } = require('../shared/errors');
const logger = require('../shared/logger').child('admin-commands');
const i18n = require('../shared/i18n');
const commandRegistry = require('./hierarchy/command-registry');

/**
 * Escape HTML special characters for Telegram HTML parse mode
 * @param {string} text Text to escape
 * @returns {string} Escaped text
 */
function escapeHTML(text) {
  if (!text || typeof text !== 'string') {
    return String(text || '');
  }
  // Escape HTML special characters: & < >
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

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
            `💡 <b>Update Stok Produk</b>\n\n` +
            `📋 <b>Format:</b>\n` +
            `<code>/admin stock update product_id quantity</code>\n\n` +
            `📝 <b>Contoh:</b>\n` +
            `<code>/admin stock update 1 50</code>\n\n` +
            `💬 <i>Gunakan format di atas untuk mengupdate stok produk. Product ID adalah ID produk yang ingin diupdate.</i>`,
          parse_mode: 'HTML',
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
      // Use HTML parse mode which is safer for dynamic content
      const productName = escapeHTML(result.product.name);
      const statusText = escapeHTML(
        result.product.availability_status === 'available' ? 'Tersedia' : 'Habis'
      );

      const message =
        `✅ <b>Stok Berhasil Diperbarui</b>\n\n` +
        `Produk: <b>${productName}</b>\n` +
        `Stok Baru: <b>${quantity}</b> unit\n` +
        `Status: <b>${statusText}</b>\n\n` +
        `Stok telah diperbarui dan tersedia untuk pelanggan.`;

      logger.info('Stock updated via admin command', {
        adminId: admin.id,
        productId,
        quantity,
      });

      return {
        text: message,
        parse_mode: 'HTML',
      };
    } catch (error) {
      logger.error('Error handling stock command', error, { telegramUserId, commandArgs });
      if (error instanceof ValidationError || error.name === 'UnauthorizedError') {
        const errorMessage = escapeHTML(error.message);
        return {
          text: `❌ ${errorMessage}`,
          parse_mode: 'HTML',
        };
      }
      return {
        text: escapeHTML(i18n.t('error_generic')),
        parse_mode: 'HTML',
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

  /**
   * Handle /addproduct command
   * Starts wizard mode for adding products step-by-step
   * @param {number} telegramUserId Telegram user ID
   * @param {string} commandArgs Command arguments (legacy format still supported)
   * @returns {Promise<Object>} Response message
   */
  async handleAddProductCommand(telegramUserId, commandArgs) {
    try {
      // Require stock_manage permission
      const admin = await accessControl.requirePermission(telegramUserId, 'stock_manage');

      // Parse command arguments (format: name|description|price|stock|category)
      const args = commandArgs.trim();

      // If args provided, use legacy format (backward compatibility)
      if (args) {
        const parts = args.split('|').map((p) => p.trim());
        if (parts.length < 4) {
          return {
            text:
              `❌ <b>Format Perintah Salah</b>\n\n` +
              `Format: /admin product add name|description|price|stock|category\n\n` +
              `Minimal diperlukan: name|description|price|stock\n\n` +
              `💡 <i>Atau gunakan mode wizard tanpa argumen untuk input step-by-step.</i>`,
            parse_mode: 'HTML',
          };
        }

        const [name, description, priceStr, stockStr, category] = parts;

        if (!name || name.length === 0) {
          throw new ValidationError('Nama produk harus diisi');
        }

        const price = parseFloat(priceStr);
        if (isNaN(price) || price < 0) {
          throw new ValidationError('Harga harus berupa angka positif');
        }

        const stock = parseInt(stockStr, 10);
        if (isNaN(stock) || stock < 0) {
          throw new ValidationError('Stok harus berupa angka non-negatif');
        }

        // Create product
        const productData = {
          name: name,
          description: description || null,
          price: price,
          stock_quantity: stock,
          category: category || null,
          features: [],
          media_files: [],
          availability_status: stock > 0 ? 'available' : 'out_of_stock',
        };

        const product = await productService.createProduct(productData);

        const productName = escapeHTML(product.name);
        const message =
          `✅ <b>Produk Berhasil Ditambahkan</b>\n\n` +
          `ID: <b>${product.id}</b>\n` +
          `Nama: <b>${productName}</b>\n` +
          `Harga: <b>Rp ${price.toLocaleString('id-ID')}</b>\n` +
          `Stok: <b>${stock}</b> unit\n` +
          `Status: <b>${product.availability_status === 'available' ? 'Tersedia' : 'Habis'}</b>\n\n` +
          `Produk telah ditambahkan dan tersedia untuk pelanggan.`;

        logger.info('Product created via admin command', {
          adminId: admin.id,
          productId: product.id,
          productName: product.name,
        });

        return {
          text: message,
          parse_mode: 'HTML',
        };
      }

      // No args provided - start wizard mode
      const wizardHandler = require('./wizard/product-add-wizard-handler');
      const wizardMessage = await wizardHandler.startWizardFlow(telegramUserId);

      return wizardMessage;
    } catch (error) {
      logger.error('Error handling addproduct command', error, { telegramUserId, commandArgs });
      if (error instanceof ValidationError || error.name === 'UnauthorizedError') {
        const errorMessage = escapeHTML(error.message);
        return {
          text: `❌ ${errorMessage}`,
          parse_mode: 'HTML',
        };
      }
      return {
        text: escapeHTML(i18n.t('error_generic')),
        parse_mode: 'HTML',
      };
    }
  }
  /**
   * Register all commands in hierarchical structure (T067)
   * This method should be called during initialization
   */
  registerHierarchicalCommands() {
    // Register admin.product.add command
    commandRegistry.registerCommand(
      'admin.product.add',
      (telegramUserId, args) => this.handleAddProductCommand(telegramUserId, args),
      {
        permissions: ['stock_manage'],
        description: 'Tambah produk baru',
        usage: '/admin product add name|description|price|stock|category',
      }
    );

    // Register admin.stock.update command
    commandRegistry.registerCommand(
      'admin.stock.update',
      (telegramUserId, args) => this.handleStockCommand(telegramUserId, args),
      {
        permissions: ['stock_manage'],
        description: 'Update stok produk',
        usage: '/admin stock update product_id quantity',
      }
    );

    // Register admin.store.open command
    commandRegistry.registerCommand(
      'admin.store.open',
      (telegramUserId) => this.handleOpenCommand(telegramUserId),
      {
        permissions: ['store_control'],
        description: 'Buka toko',
        usage: '/admin store open',
      }
    );

    // Register admin.store.close command
    commandRegistry.registerCommand(
      'admin.store.close',
      (telegramUserId) => this.handleCloseCommand(telegramUserId),
      {
        permissions: ['store_control'],
        description: 'Tutup toko',
        usage: '/admin store close',
      }
    );

    logger.info('Hierarchical commands registered');
  }
}

const adminCommandsInstance = new AdminCommands();

// Auto-register hierarchical commands on module load (T067)
adminCommandsInstance.registerHierarchicalCommands();

module.exports = adminCommandsInstance;
