/**
 * Telegram message builder utility
 * Creates inline keyboards, media groups, and rich media messages
 */

/**
 * Create inline keyboard with buttons
 * @param {Array<Array<Object>>} buttons Button matrix
 * @returns {Object} Inline keyboard markup
 */
function createInlineKeyboard(buttons) {
  return {
    inline_keyboard: buttons.map((row) =>
      row.map((button) => ({
        text: button.text,
        callback_data: button.callbackData,
        url: button.url,
      }))
    ),
  };
}

/**
 * Create navigation buttons (Previous/Next)
 * @param {Object} options Navigation options
 * @param {number} options.currentIndex Current item index
 * @param {number} options.totalItems Total number of items
 * @param {string} options.prevCallback Callback data for previous
 * @param {string} options.nextCallback Callback data for next
 * @returns {Array<Array<Object>>} Button rows
 */
function createNavigationButtons({ currentIndex, totalItems, prevCallback, nextCallback }) {
  const buttons = [];

  // Previous button (only if not first item)
  if (currentIndex > 0) {
    buttons.push({
      text: '◀️ Sebelumnya',
      callbackData: prevCallback,
    });
  }

  // Next button (only if not last item)
  if (currentIndex < totalItems - 1) {
    buttons.push({
      text: 'Selanjutnya ▶️',
      callbackData: nextCallback,
    });
  }

  return buttons.length > 0 ? [buttons] : [];
}

/**
 * Create action buttons (e.g., View Details, Buy)
 * @param {Array<Object>} actions Action buttons
 * @returns {Array<Array<Object>>} Button rows
 */
function createActionButtons(actions) {
  return [
    actions.map((action) => ({
      text: action.text,
      callbackData: action.callbackData,
      url: action.url,
    })),
  ];
}

/**
 * Create media group for multiple images/documents
 * @param {Array<Object>} mediaItems Media items (photo, document, etc.)
 * @param {string} caption Caption for media group
 * @returns {Array<Object>} Media group array
 */
function createMediaGroup(mediaItems, caption = '') {
  return mediaItems.map((item, index) => {
    const mediaItem = {
      type: item.type, // 'photo', 'document', 'video', etc.
      media: item.fileId || item.url,
    };

    // Add caption only to first item
    if (index === 0 && caption) {
      mediaItem.caption = caption;
    }

    return mediaItem;
  });
}

/**
 * Format product card message
 * @param {Object} product Product object
 * @returns {Object} Formatted message
 */
function formatProductCard(product) {
  const stockStatus = product.stock_quantity > 0 ? '✅ Tersedia' : '❌ Habis';
  const price = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
  }).format(product.price);

  const text = `*${product.name}*\n\n${product.description || ''}\n\n💰 Harga: ${price}\n📦 Stok: ${stockStatus}`;

  const buttons = [
    {
      text: '📋 Lihat Detail',
      callbackData: `product_detail_${product.id}`,
    },
  ];

  // Add Buy button only if in stock
  if (product.stock_quantity > 0) {
    buttons.push({
      text: '🛒 Beli',
      callbackData: `product_buy_${product.id}`,
    });
  }

  return {
    text,
    parse_mode: 'Markdown',
    reply_markup: createInlineKeyboard([buttons]),
  };
}

module.exports = {
  createInlineKeyboard,
  createNavigationButtons,
  createActionButtons,
  createMediaGroup,
  formatProductCard,
};
