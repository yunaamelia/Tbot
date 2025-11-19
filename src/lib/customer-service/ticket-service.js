/**
 * Ticket service for support tickets
 * Manages customer support tickets (FR-014)
 *
 * Task: T141
 * Requirement: FR-014
 */

const { table } = require('../database/query-builder');
const { getBot } = require('../telegram/api-client');
const customerService = require('../customer/customer-service');
const adminRepository = require('../admin/admin-repository');
const logger = require('../shared/logger').child('ticket-service');

class TicketService {
  /**
   * Create a new support ticket
   * @param {number} customerTelegramId Customer Telegram user ID
   * @param {string} subject Ticket subject
   * @param {string} description Ticket description
   * @param {number} orderId Optional order ID if ticket is related to an order
   * @returns {Promise<Object>} Created ticket
   */
  async createTicket(customerTelegramId, subject, description, orderId = null) {
    try {
      const customer = await customerService.getOrCreateCustomer(customerTelegramId);
      const customerData = await customerService.getCustomerById(customer);

      const [ticket] = await table('support_tickets')
        .insert({
          customer_id: customerData.id,
          subject: subject.substring(0, 255),
          description: description.substring(0, 2000),
          order_id: orderId,
          status: 'open',
          priority: 'normal',
          created_timestamp: new Date(),
          updated_timestamp: new Date(),
        })
        .returning('id');

      const ticketId = ticket?.id || ticket;

      // Notify admins about new ticket
      const admins = await adminRepository.findAll();
      const bot = getBot();

      const adminNotification =
        `*🎫 Tiket Support Baru*\n\n` +
        `*ID Tiket:* #${ticketId}\n` +
        `*Customer:* ${customerData.name || customerData.username || `User ${customerTelegramId}`}\n` +
        `*Subjek:* ${subject}\n` +
        `*Deskripsi:* ${description.substring(0, 200)}${description.length > 200 ? '...' : ''}\n` +
        `${orderId ? `*Order ID:* ${orderId}\n` : ''}` +
        `\nGunakan callback \`ticket_view_${ticketId}\` untuk melihat detail.`;

      for (const admin of admins) {
        if (admin.hasPermission('customer_view')) {
          await bot.telegram.sendMessage(admin.telegram_user_id, adminNotification, {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: '👁️ Lihat Tiket',
                    callback_data: `ticket_view_${ticketId}`,
                  },
                  {
                    text: '✅ Tutup Tiket',
                    callback_data: `ticket_close_${ticketId}`,
                  },
                ],
              ],
            },
          });
        }
      }

      // Notify customer
      await bot.telegram.sendMessage(
        customerTelegramId,
        `✅ Tiket support Anda telah dibuat dengan ID #${ticketId}. Admin akan meninjau dan merespons segera.`
      );

      logger.info('Support ticket created', {
        ticketId,
        customerId: customerData.id,
        orderId,
      });

      return {
        id: ticketId,
        customerId: customerData.id,
        subject,
        status: 'open',
      };
    } catch (error) {
      logger.error('Error creating support ticket', error, {
        customerTelegramId,
        orderId,
      });
      throw error;
    }
  }

  /**
   * Get ticket by ID
   * @param {number} ticketId Ticket ID
   * @returns {Promise<Object|null>} Ticket object or null
   */
  async getTicketById(ticketId) {
    try {
      const ticket = await table('support_tickets').where('id', ticketId).first();
      if (!ticket) {
        return null;
      }

      return {
        id: ticket.id,
        customerId: ticket.customer_id,
        subject: ticket.subject,
        description: ticket.description,
        orderId: ticket.order_id,
        status: ticket.status,
        priority: ticket.priority,
        createdTimestamp: ticket.created_timestamp,
        updatedTimestamp: ticket.updated_timestamp,
        closedTimestamp: ticket.closed_timestamp,
        adminNotes: ticket.admin_notes,
      };
    } catch (error) {
      logger.error('Error getting ticket', error, { ticketId });
      return null;
    }
  }

  /**
   * Close ticket
   * @param {number} ticketId Ticket ID
   * @param {number} adminTelegramId Admin Telegram user ID
   * @param {string} notes Optional admin notes
   * @returns {Promise<Object>} Updated ticket
   */
  async closeTicket(ticketId, adminTelegramId, notes = '') {
    try {
      const admin = await adminRepository.findByTelegramId(adminTelegramId);
      if (!admin || !admin.hasPermission('customer_view')) {
        throw new Error('Admin not authorized');
      }

      const ticket = await this.getTicketById(ticketId);
      if (!ticket) {
        throw new Error('Ticket not found');
      }

      await table('support_tickets').where('id', ticketId).update({
        status: 'closed',
        closed_timestamp: new Date(),
        admin_notes: notes,
        updated_timestamp: new Date(),
      });

      // Notify customer
      const customer = await customerService.getCustomerById(ticket.customerId);
      const bot = getBot();

      await bot.telegram.sendMessage(
        customer.telegram_user_id,
        `✅ Tiket support #${ticketId} telah ditutup oleh admin.${notes ? `\n\n*Catatan Admin:*\n${notes}` : ''}`,
        { parse_mode: 'Markdown' }
      );

      logger.info('Ticket closed', {
        ticketId,
        adminId: admin.id,
      });

      return {
        id: ticketId,
        status: 'closed',
      };
    } catch (error) {
      logger.error('Error closing ticket', error, {
        ticketId,
        adminTelegramId,
      });
      throw error;
    }
  }
}

module.exports = new TicketService();
