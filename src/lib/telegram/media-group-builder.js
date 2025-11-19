/**
 * Media group builder for Telegram media groups
 * Supports multiple images/documents in a single media group (FR-003, FR-055)
 * Maximum 10 files per group (FR-055, Article VIII)
 *
 * Task: T040
 * Requirement: FR-003, FR-055
 */

class MediaGroupBuilder {
  /**
   * Build media group array for Telegram API
   * @param {Array<Object>} mediaItems Media items from product
   * @param {string} caption Caption text (will be added to first item only)
   * @returns {Array<Object>} Media group array for Telegram API
   */
  buildMediaGroup(mediaItems, caption = '') {
    if (!Array.isArray(mediaItems) || mediaItems.length === 0) {
      return [];
    }

    // Limit to 10 files per group (FR-055)
    const limitedItems = mediaItems.slice(0, 10);

    return limitedItems.map((item, index) => {
      const mediaItem = {
        type: item.type || 'photo', // 'photo', 'document', 'video'
        media: item.fileId || item.url || item.media,
      };

      // Add caption only to first item (Telegram requirement)
      if (index === 0 && caption) {
        mediaItem.caption = caption;
        mediaItem.parse_mode = 'Markdown'; // Support Markdown in caption
      }

      return mediaItem;
    });
  }

  /**
   * Validate media items format
   * @param {Array<Object>} mediaItems Media items to validate
   * @returns {boolean} True if valid
   */
  validateMediaItems(mediaItems) {
    if (!Array.isArray(mediaItems)) {
      return false;
    }

    // Check each item has required fields
    return mediaItems.every((item) => {
      const hasType = item.type && ['photo', 'document', 'video'].includes(item.type);
      const hasMedia = item.fileId || item.url || item.media;
      return hasType && hasMedia;
    });
  }

  /**
   * Filter media items by type
   * @param {Array<Object>} mediaItems Media items
   * @param {string} type Media type ('photo', 'document', 'video')
   * @returns {Array<Object>} Filtered media items
   */
  filterByType(mediaItems, type) {
    if (!Array.isArray(mediaItems)) {
      return [];
    }
    return mediaItems.filter((item) => item.type === type);
  }
}

module.exports = new MediaGroupBuilder();
