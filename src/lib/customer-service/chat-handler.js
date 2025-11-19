/**
 * Chat handler for live admin chat
 * Manages live chat between customers and admins (FR-014)
 *
 * Task: T140
 * Requirement: FR-014
 */

const { table } = require('../database/query-builder');
const { getBot } = require('../telegram/api-client');
const customerService = require('../customer/customer-service');
const adminRepository = require('../admin/admin-repository');
const logger = require('../shared/logger').child('chat-handler');

class ChatHandler {
  /**
   * Start a live chat session
   * @param {number} customerTelegramId Customer Telegram user ID
   * @param {string} initialMessage Initial message from customer
   * @returns {Promise<Object>} Chat session info
   */
  async startChat(customerTelegramId, initialMessage = null) {
    try {
      const customer = await customerService.getOrCreateCustomer(customerTelegramId, {
        name: null, // Will be updated from Telegram context
        username: null,
      });

      // Check if there's an active chat session
      const existingSession = await this.getActiveSession(customerTelegramId);
      if (existingSession) {
        return {
          sessionId: existingSession.id,
          status: 'active',
          message: 'Anda sudah memiliki sesi chat aktif. Admin akan merespons segera.',
        };
      }

      // Create new chat session
      const [session] = await table('chat_sessions')
        .insert({
          customer_id: customer.id,
          status: 'waiting',
          created_timestamp: new Date(),
          updated_timestamp: new Date(),
        })
        .returning('id');

      const sessionId = session?.id || session;

      // Notify admins about new chat request
      const admins = await adminRepository.findAll();
      const bot = getBot();
      const customerData = customer;

      const adminNotification =
        `*💬 Chat Baru dari Customer*\n\n` +
        `*Customer:* ${customerData.name || customerData.username || `User ${customerTelegramId}`}\n` +
        `*Telegram ID:* ${customerTelegramId}\n` +
        `${initialMessage ? `*Pesan:* ${initialMessage.substring(0, 200)}${initialMessage.length > 200 ? '...' : ''}\n` : ''}` +
        `\nGunakan callback \`chat_accept_${sessionId}\` untuk menerima chat.`;

      for (const admin of admins) {
        if (admin.hasPermission('customer_view')) {
          await bot.telegram.sendMessage(admin.telegram_user_id, adminNotification, {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: '✅ Terima Chat',
                    callback_data: `chat_accept_${sessionId}`,
                  },
                  {
                    text: '❌ Tolak',
                    callback_data: `chat_reject_${sessionId}`,
                  },
                ],
              ],
            },
          });
        }
      }

      // Send initial message if provided
      if (initialMessage) {
        await this.sendCustomerMessage(sessionId, initialMessage);
      }

      // Notify customer
      await bot.telegram.sendMessage(
        customerTelegramId,
        '✅ Permintaan chat Anda telah dikirim ke admin. Admin akan merespons segera.\n\n' +
          'Anda dapat mengirim pesan sekarang, dan admin akan melihatnya.'
      );

      logger.info('Chat session started', {
        sessionId,
        customerId: customer.id,
      });

      return {
        sessionId,
        status: 'waiting',
        message: 'Chat session dimulai. Admin akan merespons segera.',
      };
    } catch (error) {
      logger.error('Error starting chat session', error, {
        customerTelegramId,
      });
      throw error;
    }
  }

  /**
   * Get active chat session for customer
   * @param {number} customerTelegramId Customer Telegram user ID
   * @returns {Promise<Object|null>} Active session or null
   */
  async getActiveSession(customerTelegramId) {
    try {
      const customer = await customerService.findByTelegramId(customerTelegramId);
      if (!customer) {
        return null;
      }

      const session = await table('chat_sessions')
        .where('customer_id', customer.id)
        .whereIn('status', ['waiting', 'active'])
        .orderBy('created_timestamp', 'desc')
        .first();

      return session
        ? {
            id: session.id,
            customerId: session.customer_id,
            adminId: session.admin_id,
            status: session.status,
            createdTimestamp: session.created_timestamp,
            updatedTimestamp: session.updated_timestamp,
          }
        : null;
    } catch (error) {
      logger.error('Error getting active session', error, {
        customerTelegramId,
      });
      return null;
    }
  }

  /**
   * Accept chat session by admin
   * @param {number} sessionId Session ID
   * @param {number} adminTelegramId Admin Telegram user ID
   * @returns {Promise<Object>} Updated session
   */
  async acceptChat(sessionId, adminTelegramId) {
    try {
      const admin = await adminRepository.findByTelegramId(adminTelegramId);
      if (!admin || !admin.hasPermission('customer_view')) {
        throw new Error('Admin not authorized');
      }

      const session = await table('chat_sessions').where('id', sessionId).first();
      if (!session) {
        throw new Error('Session not found');
      }

      if (session.status !== 'waiting') {
        throw new Error('Session is not in waiting status');
      }

      await table('chat_sessions').where('id', sessionId).update({
        admin_id: admin.id,
        status: 'active',
        updated_timestamp: new Date(),
      });

      // Notify customer
      const customer = await customerService.getCustomerById(session.customer_id);
      const bot = getBot();

      await bot.telegram.sendMessage(
        customer.telegram_user_id,
        '✅ Admin telah menerima chat Anda. Anda sekarang dapat berbicara langsung dengan admin.'
      );

      // Notify admin
      await bot.telegram.sendMessage(
        adminTelegramId,
        `✅ Chat session #${sessionId} telah diterima. Customer: ${customer.name || customer.username || `User ${customer.telegram_user_id}`}`
      );

      logger.info('Chat session accepted', {
        sessionId,
        adminId: admin.id,
        customerId: session.customer_id,
      });

      return {
        sessionId,
        status: 'active',
        adminId: admin.id,
      };
    } catch (error) {
      logger.error('Error accepting chat', error, {
        sessionId,
        adminTelegramId,
      });
      throw error;
    }
  }

  /**
   * Send message from customer to admin
   * @param {number} sessionId Session ID
   * @param {string} message Message text
   * @returns {Promise<Object>} Sent message info
   */
  async sendCustomerMessage(sessionId, message) {
    try {
      const session = await table('chat_sessions').where('id', sessionId).first();
      if (!session) {
        throw new Error('Session not found');
      }

      if (session.status === 'closed') {
        throw new Error('Session is closed');
      }

      // Save message to database
      await table('chat_messages').insert({
        session_id: sessionId,
        sender_type: 'customer',
        message: message.substring(0, 4000),
        created_timestamp: new Date(),
      });

      // If session is active, forward to admin
      if (session.status === 'active' && session.admin_id) {
        const admin = await adminRepository.findById(session.admin_id);
        const customer = await customerService.getCustomerById(session.customer_id);
        const bot = getBot();

        await bot.telegram.sendMessage(
          admin.telegram_user_id,
          `*💬 Pesan dari Customer*\n\n` +
            `*Customer:* ${customer.name || customer.username || `User ${customer.telegram_user_id}`}\n` +
            `*Session:* #${sessionId}\n\n` +
            `${message}`,
          {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: '💬 Balas',
                    callback_data: `chat_reply_${sessionId}`,
                  },
                  {
                    text: '❌ Tutup Chat',
                    callback_data: `chat_close_${sessionId}`,
                  },
                ],
              ],
            },
          }
        );
      }

      return {
        sessionId,
        message: message.substring(0, 100),
      };
    } catch (error) {
      logger.error('Error sending customer message', error, {
        sessionId,
      });
      throw error;
    }
  }

  /**
   * Send message from admin to customer
   * @param {number} sessionId Session ID
   * @param {number} adminTelegramId Admin Telegram user ID
   * @param {string} message Message text
   * @returns {Promise<Object>} Sent message info
   */
  async sendAdminMessage(sessionId, adminTelegramId, message) {
    try {
      const admin = await adminRepository.findByTelegramId(adminTelegramId);
      if (!admin || !admin.hasPermission('customer_view')) {
        throw new Error('Admin not authorized');
      }

      const session = await table('chat_sessions').where('id', sessionId).first();
      if (!session) {
        throw new Error('Session not found');
      }

      if (session.status !== 'active' || session.admin_id !== admin.id) {
        throw new Error('Session is not active or not assigned to this admin');
      }

      // Save message to database
      await table('chat_messages').insert({
        session_id: sessionId,
        sender_type: 'admin',
        message: message.substring(0, 4000),
        created_timestamp: new Date(),
      });

      // Send to customer
      const customer = await customerService.getCustomerById(session.customer_id);
      const bot = getBot();

      await bot.telegram.sendMessage(
        customer.telegram_user_id,
        `*💬 Pesan dari Admin*\n\n${message}`,
        {
          parse_mode: 'Markdown',
        }
      );

      logger.info('Admin message sent', {
        sessionId,
        adminId: admin.id,
        customerId: session.customer_id,
      });

      return {
        sessionId,
        message: message.substring(0, 100),
      };
    } catch (error) {
      logger.error('Error sending admin message', error, {
        sessionId,
        adminTelegramId,
      });
      throw error;
    }
  }

  /**
   * Close chat session
   * @param {number} sessionId Session ID
   * @param {number} adminTelegramId Admin Telegram user ID (optional, for admin-initiated close)
   * @returns {Promise<Object>} Closed session info
   */
  async closeChat(sessionId, adminTelegramId = null) {
    try {
      const session = await table('chat_sessions').where('id', sessionId).first();
      if (!session) {
        throw new Error('Session not found');
      }

      if (adminTelegramId) {
        const admin = await adminRepository.findByTelegramId(adminTelegramId);
        if (!admin || !admin.hasPermission('customer_view')) {
          throw new Error('Admin not authorized');
        }
      }

      await table('chat_sessions').where('id', sessionId).update({
        status: 'closed',
        updated_timestamp: new Date(),
      });

      // Notify customer
      const customer = await customerService.getCustomerById(session.customer_id);
      const bot = getBot();

      await bot.telegram.sendMessage(
        customer.telegram_user_id,
        '✅ Chat session telah ditutup. Terima kasih telah menghubungi kami!'
      );

      logger.info('Chat session closed', {
        sessionId,
        adminTelegramId,
      });

      return {
        sessionId,
        status: 'closed',
      };
    } catch (error) {
      logger.error('Error closing chat', error, {
        sessionId,
        adminTelegramId,
      });
      throw error;
    }
  }
}

module.exports = new ChatHandler();
