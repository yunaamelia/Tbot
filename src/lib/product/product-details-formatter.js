/**
 * Product details formatter for comprehensive product information display
 * Provides detailed product view with media groups, description, price, features, and stock status
 * All text content in Indonesian language (FR-045, Article XIII)
 *
 * Task: T039, T043, T044, T045
 * Requirement: FR-003, FR-045, FR-046, FR-047
 */

class ProductDetailsFormatter {
  /**
   * Format product details message
   * @param {Product} product Product instance
   * @param {Object} options Formatting options
   * @param {number} options.currentIndex Current product index (for back button)
   * @param {number} options.totalProducts Total number of products
   * @returns {Object} Formatted message object for Telegram
   */
  formatDetails(product, options = {}) {
    const { currentIndex = 0, totalProducts = 1 } = options;

    // Format price in IDR (Indonesian Rupiah)
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

    // Build details text (all in Indonesian - FR-045)
    let detailsText = `*${product.name}*\n\n`;

    // Description
    if (product.description) {
      detailsText += `${product.description}\n\n`;
    }

    // Price
    detailsText += `💰 *Harga:* ${priceFormatted}\n`;

    // Stock status
    detailsText += `📦 *Stok:* ${stockStatus}\n`;

    // Category
    if (product.category) {
      detailsText += `🏷️ *Kategori:* ${product.category}\n`;
    }

    // Features list
    if (product.features && product.features.length > 0) {
      detailsText += `\n✨ *Fitur:*\n`;
      product.features.forEach((feature, index) => {
        detailsText += `${index + 1}. ${feature}\n`;
      });
    }

    // Build inline keyboard with action buttons
    const buttons = [];

    // Back button to return to carousel (T046)
    if (currentIndex >= 0 && totalProducts > 0) {
      buttons.push({
        text: '◀️ Kembali',
        callbackData: `product_carousel_${currentIndex}`,
      });
    }

    // Buy button (only if in stock)
    if (product.isAvailable()) {
      buttons.push({
        text: '🛒 Beli',
        callbackData: `product_buy_${product.id}`,
      });
    }

    return {
      text: detailsText,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: buttons.length > 0 ? [buttons] : [],
      },
    };
  }

  /**
   * Format text-only product details (for products without media)
   * @param {Product} product Product instance
   * @param {Object} options Formatting options
   * @returns {Object} Formatted message object for Telegram
   */
  formatTextOnly(product, options = {}) {
    // Use same formatter as formatDetails, but explicitly for text-only display
    return this.formatDetails(product, options);
  }

  /**
   * Check if product has media files
   * @param {Product} product Product instance
   * @returns {boolean}
   */
  hasMedia(product) {
    return (
      product.media_files && Array.isArray(product.media_files) && product.media_files.length > 0
    );
  }
}

module.exports = new ProductDetailsFormatter();
