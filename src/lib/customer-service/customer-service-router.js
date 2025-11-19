/**
 * Customer service router
 * Routes customer queries to FAQ or live admin chat based on query type (FR-014)
 *
 * Task: T147
 * Requirement: FR-014
 */

const faqHandler = require('./faq-handler');
const chatHandler = require('./chat-handler');
const ticketService = require('./ticket-service');
const logger = require('../shared/logger').child('customer-service-router');

class CustomerServiceRouter {
  /**
   * Route customer query to appropriate service
   * @param {number} customerTelegramId Customer Telegram user ID
   * @param {string} query Customer query text
   * @returns {Promise<Object>} Routing result with service type and response
   */
  async routeQuery(customerTelegramId, query) {
    try {
      const lowerQuery = query.toLowerCase().trim();

      // Check if query matches FAQ keywords
      const faqKeywords = [
        'pembayaran',
        'payment',
        'bayar',
        'pengiriman',
        'delivery',
        'kirim',
        'kredensial',
        'credentials',
        'akun',
        'account',
        'refund',
        'pengembalian',
        'stok',
        'stock',
        'tersedia',
        'available',
        'bantuan',
        'help',
        'faq',
        'pertanyaan',
        'question',
      ];

      const matchesFAQ = faqKeywords.some((keyword) => lowerQuery.includes(keyword));

      if (matchesFAQ) {
        // Try to find matching FAQ
        const matchingFAQs = faqHandler.searchFAQs(query);
        if (matchingFAQs.length > 0) {
          return {
            serviceType: 'faq',
            response: faqHandler.formatFAQList(matchingFAQs),
            message: 'Saya menemukan beberapa FAQ yang mungkin membantu Anda:',
          };
        }
      }

      // Check if query is a support request
      const supportKeywords = [
        'masalah',
        'problem',
        'error',
        'gagal',
        'failed',
        'tidak bekerja',
        "doesn't work",
        'bug',
        'keluhan',
        'complaint',
        'tiket',
        'ticket',
        'support',
      ];

      const isSupportRequest = supportKeywords.some((keyword) => lowerQuery.includes(keyword));

      if (isSupportRequest) {
        // Create support ticket
        try {
          const ticket = await ticketService.createTicket(
            customerTelegramId,
            'Support Request',
            query
          );
          return {
            serviceType: 'ticket',
            response: {
              text: `✅ Tiket support telah dibuat dengan ID #${ticket.id}. Admin akan meninjau dan merespons segera.`,
              parse_mode: 'Markdown',
            },
            ticketId: ticket.id,
          };
        } catch (error) {
          logger.error('Error creating ticket', error);
          // Fallback to chat
        }
      }

      // Default: Start live chat
      try {
        const chatSession = await chatHandler.startChat(customerTelegramId, query);
        return {
          serviceType: 'chat',
          response: {
            text: chatSession.message,
            parse_mode: 'Markdown',
          },
          sessionId: chatSession.sessionId,
        };
      } catch (error) {
        logger.error('Error starting chat', error);
        // Fallback: Show FAQ list
        return {
          serviceType: 'faq',
          response: faqHandler.formatFAQList(),
          message:
            'Saya akan menghubungkan Anda dengan admin. Sementara itu, berikut FAQ yang mungkin membantu:',
        };
      }
    } catch (error) {
      logger.error('Error routing customer query', error, {
        customerTelegramId,
        query: query.substring(0, 100),
      });
      // Fallback: Show FAQ list
      return {
        serviceType: 'faq',
        response: faqHandler.formatFAQList(),
        message: 'Maaf, terjadi kesalahan. Berikut FAQ yang mungkin membantu:',
      };
    }
  }

  /**
   * Check if message should be routed to customer service
   * @param {string} message Message text
   * @returns {boolean} True if message should be routed
   */
  shouldRouteToCustomerService(message) {
    if (!message || message.trim().length === 0) {
      return false;
    }

    const lowerMessage = message.toLowerCase().trim();

    // Check for customer service keywords
    const serviceKeywords = [
      'help',
      'bantuan',
      'tolong',
      'help me',
      'support',
      'customer service',
      'cs',
      'admin',
      'pertanyaan',
      'question',
      'faq',
      'masalah',
      'problem',
    ];

    return serviceKeywords.some((keyword) => lowerMessage.includes(keyword));
  }
}

module.exports = new CustomerServiceRouter();
