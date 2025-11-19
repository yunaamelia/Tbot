/**
 * Product details handler for displaying comprehensive product information
 * Handles media groups and text-only display (FR-003, FR-044, FR-055)
 *
 * Task: T042, T043, T044
 * Requirement: FR-003, FR-044, FR-055, FR-046
 */

const productService = require('./product-service');
const productDetailsFormatter = require('./product-details-formatter');
const mediaGroupBuilder = require('../telegram/media-group-builder');
const { NotFoundError } = require('../shared/errors');
const logger = require('../shared/logger').child('product-details-handler');

class ProductDetailsHandler {
  /**
   * Handle product details view request
   * @param {number} productId Product ID
   * @param {number} currentCarouselIndex Current carousel index (for back button)
   * @returns {Promise<Object>} Response object with message type and data
   */
  async handleProductDetails(productId, currentCarouselIndex = 0) {
    try {
      // Get product
      const product = await productService.getProductById(productId);
      if (!product) {
        throw new NotFoundError(`Product with ID ${productId} not found`);
      }

      // Get total products for back button
      const totalProducts = await productService.getTotalProductCount();

      // Format product details
      const detailsMessage = productDetailsFormatter.formatDetails(product, {
        currentIndex: currentCarouselIndex,
        totalProducts,
      });

      // Check if product has media
      const hasMedia = productDetailsFormatter.hasMedia(product);

      if (hasMedia) {
        // Build media group
        const mediaGroup = mediaGroupBuilder.buildMediaGroup(
          product.media_files,
          detailsMessage.text
        );

        // Validate media group
        if (!mediaGroupBuilder.validateMediaItems(product.media_files)) {
          logger.warn('Invalid media items format, falling back to text-only', {
            productId,
          });
          return {
            type: 'text',
            message: detailsMessage,
          };
        }

        return {
          type: 'media_group',
          mediaGroup,
          textMessage: detailsMessage, // Fallback if media group fails
        };
      } else {
        // Text-only display (FR-044)
        return {
          type: 'text',
          message: productDetailsFormatter.formatTextOnly(product, {
            currentIndex: currentCarouselIndex,
            totalProducts,
          }),
        };
      }
    } catch (error) {
      logger.error('Error handling product details', error, { productId });
      throw error;
    }
  }

  /**
   * Parse callback data for product details
   * @param {string} callbackData Callback data (e.g., "product_detail_123")
   * @returns {Object|null} Parsed data { productId: number, carouselIndex?: number }
   */
  parseCallbackData(callbackData) {
    // Format: product_detail_<productId> or product_detail_<productId>_<carouselIndex>
    const match = callbackData.match(/^product_detail_(\d+)(?:_(\d+))?$/);
    if (!match) {
      return null;
    }

    return {
      productId: parseInt(match[1], 10),
      carouselIndex: match[2] ? parseInt(match[2], 10) : undefined,
    };
  }

  /**
   * Parse callback data for carousel return
   * @param {string} callbackData Callback data (e.g., "product_carousel_0")
   * @returns {Object|null} Parsed data { index: number }
   */
  parseCarouselCallback(callbackData) {
    const match = callbackData.match(/^product_carousel_(\d+)$/);
    if (!match) {
      return null;
    }

    return {
      index: parseInt(match[1], 10),
    };
  }
}

module.exports = new ProductDetailsHandler();
