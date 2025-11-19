/**
 * Product card formatter for card-style display
 * Provides intuitive interface with clear, discoverable options (FR-046, Article XIII)
 * 
 * Task: T032
 * Requirement: FR-001, FR-046, FR-047
 */

const i18n = require('../shared/i18n');

class ProductCardFormatter {
  /**
   * Format product as card-style message
   * Card format: product image/icon, name, price, stock status (FR-001)
   * @param {Product} product Product instance
   * @param {Object} options Formatting options
   * @param {number} options.currentIndex Current product index (for carousel)
   * @param {number} options.totalProducts Total number of products
   * @returns {Object} Formatted message object for Telegram
   */
  formatCard(product, options = {}) {
    const { currentIndex = 0, totalProducts = 1 } = options;

    // Format price in IDR
    const priceFormatted = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
    }).format(product.price);

    // Stock status with emoji
    let stockStatus;
    if (product.stock_quantity > 0) {
      stockStatus = `✅ Tersedia (${product.stock_quantity} unit)`;
    } else {
      stockStatus = '❌ Habis';
    }

    // Build card text
    let cardText = `*${product.name}*\n\n`;

    if (product.description) {
      cardText += `${product.description}\n\n`;
    }

    cardText += `💰 Harga: ${priceFormatted}\n`;
    cardText += `📦 Stok: ${stockStatus}`;

    if (product.category) {
      cardText += `\n🏷️ Kategori: ${product.category}`;
    }

    // Add carousel indicator if multiple products
    if (totalProducts > 1) {
      cardText += `\n\n📄 Produk ${currentIndex + 1} dari ${totalProducts}`;
    }

    // Build inline keyboard buttons
    const buttons = [];

    // View Details button (always available)
    buttons.push({
      text: '📋 Lihat Detail',
      callbackData: `product_detail_${product.id}`,
    });

    // Buy button (only if in stock)
    if (product.isAvailable()) {
      buttons.push({
        text: '🛒 Beli',
        callbackData: `product_buy_${product.id}`,
      });
    }

    // Build inline keyboard
    const inlineKeyboard = {
      inline_keyboard: [buttons],
    };

    return {
      text: cardText,
      parse_mode: 'Markdown',
      reply_markup: inlineKeyboard,
    };
  }

  /**
   * Format empty catalog message
   * @returns {Object} Formatted message object
   */
  formatEmptyCatalog() {
    const text = i18n.t('product_list_empty');
    return {
      text,
      parse_mode: 'Markdown',
    };
  }
}

module.exports = new ProductCardFormatter();

