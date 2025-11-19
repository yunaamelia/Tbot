/**
 * Product carousel handler for inline keyboard navigation
 * Handles next/previous navigation through product catalog
 * 
 * Task: T033
 * Requirement: FR-002
 */

const productService = require('./product-service');
const productCardFormatter = require('./product-card-formatter');
const { createNavigationButtons } = require('../telegram/message-builder');
const { NotFoundError } = require('../shared/errors');
const logger = require('../shared/logger').child('product-carousel');

class ProductCarouselHandler {
  /**
   * Get product card for carousel at specific index
   * @param {number} index Product index (0-based)
   * @returns {Promise<Object>} Formatted message with navigation buttons
   */
  async getProductCard(index) {
    try {
      const product = await productService.getProductAtIndex(index);
      if (!product) {
        throw new NotFoundError(`Product at index ${index} not found`);
      }

      const totalProducts = await productService.getTotalProductCount();

      // Format product card
      const cardMessage = productCardFormatter.formatCard(product, {
        currentIndex: index,
        totalProducts,
      });

      // Add navigation buttons
      const navButtons = createNavigationButtons({
        currentIndex: index,
        totalItems: totalProducts,
        prevCallback: `product_prev_${index}`,
        nextCallback: `product_next_${index}`,
      });

      // Merge navigation buttons with action buttons
      if (navButtons.length > 0) {
        cardMessage.reply_markup.inline_keyboard.push(...navButtons);
      }

      return cardMessage;
    } catch (error) {
      logger.error('Error getting product card for carousel', error, { index });
      throw error;
    }
  }

  /**
   * Handle next navigation
   * @param {number} currentIndex Current product index
   * @returns {Promise<Object>} Next product card message
   */
  async handleNext(currentIndex) {
    try {
      const totalProducts = await productService.getTotalProductCount();
      const nextIndex = currentIndex + 1;

      if (nextIndex >= totalProducts) {
        // Already at last product, return current
        return this.getProductCard(currentIndex);
      }

      return this.getProductCard(nextIndex);
    } catch (error) {
      logger.error('Error handling next navigation', error, { currentIndex });
      throw error;
    }
  }

  /**
   * Handle previous navigation
   * @param {number} currentIndex Current product index
   * @returns {Promise<Object>} Previous product card message
   */
  async handlePrevious(currentIndex) {
    try {
      const prevIndex = currentIndex - 1;

      if (prevIndex < 0) {
        // Already at first product, return current
        return this.getProductCard(0);
      }

      return this.getProductCard(prevIndex);
    } catch (error) {
      logger.error('Error handling previous navigation', error, { currentIndex });
      throw error;
    }
  }

  /**
   * Parse callback data to extract index
   * @param {string} callbackData Callback data (e.g., "product_next_1")
   * @returns {Object} Parsed data { action: 'next'|'prev', index: number }
   */
  parseCallbackData(callbackData) {
    const match = callbackData.match(/^product_(next|prev)_(\d+)$/);
    if (!match) {
      return null;
    }

    return {
      action: match[1], // 'next' or 'prev'
      index: parseInt(match[2], 10),
    };
  }
}

module.exports = new ProductCarouselHandler();

