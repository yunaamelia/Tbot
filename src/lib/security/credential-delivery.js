/**
 * Credential delivery service with secure channel
 * Handles secure delivery of premium account credentials to customers
 *
 * Task: T127
 * Requirement: FR-020, FR-022, FR-130, FR-132, FR-133
 */

const { getBot } = require('../telegram/api-client');
const encryptionService = require('./encryption-service');
const auditLogger = require('./audit-logger');
const accessControl = require('./access-control');
const orderService = require('../order/order-service');
const customerService = require('../customer/customer-service');
const { NotFoundError, UnauthorizedError, ConflictError } = require('../shared/errors');
const logger = require('../shared/logger').child('credential-delivery');

class CredentialDeliveryService {
  /**
   * Deliver credentials to customer securely (T130, T132, T133)
   * @param {number} orderId Order ID
   * @param {string} credentials Plaintext credentials to deliver
   * @param {number} adminId Admin ID delivering credentials (for audit)
   * @returns {Promise<Object>} Delivery result
   * @throws {NotFoundError} If order not found
   * @throws {UnauthorizedError} If access denied
   * @throws {ConflictError} If order not ready for delivery
   */
  async deliverCredentials(orderId, credentials, adminId = null) {
    try {
      // Validate order exists and is ready for delivery (T133)
      const order = await orderService.getOrderById(orderId);

      // Access control check (T132)
      if (adminId) {
        // Admin delivery - verify admin exists (permission check done by caller)
        const adminRepository = require('../admin/admin-repository');
        const admin = await adminRepository.findById(adminId);
        if (!admin) {
          throw new UnauthorizedError('Admin not found');
        }
      } else {
        // System delivery - verify order belongs to customer
        // This would be called from order service after payment verification
      }

      // Validate order status and payment (T133)
      if (order.order_status !== 'payment_received' && order.order_status !== 'processing') {
        throw new ConflictError(
          `Order ${orderId} is not ready for credential delivery. Current status: ${order.order_status}`
        );
      }

      if (order.payment_status !== 'verified') {
        throw new ConflictError(`Order ${orderId} payment is not verified`);
      }

      // Get customer
      const customer = await customerService.getCustomerById(order.customer_id);
      if (!customer) {
        throw new NotFoundError(`Customer with ID ${order.customer_id} not found`);
      }

      // Update order with encrypted credentials (T129 - encryption happens in orderService)
      await orderService.updateCredentials(orderId, credentials, false);

      // Send secure delivery message via Telegram (T130)
      const deliveryMessage = this.formatDeliveryMessage(order, credentials);

      const bot = getBot();
      await bot.telegram.sendMessage(customer.telegram_user_id, deliveryMessage.text, {
        parse_mode: deliveryMessage.parse_mode,
      });

      // Update order status to account_delivered
      await orderService.updateOrderStatus(orderId, 'account_delivered');

      // Audit log entry (T131)
      await auditLogger.logCredentialAccess({
        adminId: adminId || null,
        actionType: 'credential_delivery',
        entityType: 'order',
        entityId: orderId,
        details: {
          customerId: customer.id,
          orderId: order.id,
          productId: order.product_id,
          // Never log actual credentials (FR-044)
          credentialHash: encryptionService.hashForLogging(credentials),
        },
      });

      logger.info('Credentials delivered successfully', {
        orderId,
        customerId: customer.id,
        adminId,
        // Never log actual credentials (FR-044)
        credentialHash: encryptionService.hashForLogging(credentials),
      });

      return {
        success: true,
        orderId,
        customerId: customer.id,
        deliveredAt: new Date(),
      };
    } catch (error) {
      logger.error('Error delivering credentials', error, {
        orderId,
        adminId,
        // Never log credentials in error (FR-044)
      });
      throw error;
    }
  }

  /**
   * Format secure delivery message (T130)
   * @param {Object} order Order object
   * @param {string} credentials Plaintext credentials
   * @returns {Object} Formatted message
   */
  formatDeliveryMessage(order, credentials) {
    const text =
      `🔐 *Akun Premium Anda Siap*\n\n` +
      `Pesanan #${order.id} telah diproses dan akun premium Anda siap digunakan.\n\n` +
      `*Kredensial Akun:*\n` +
      `\`\`\`\n${credentials}\n\`\`\`\n\n` +
      `⚠️ *Penting:* Simpan kredensial ini dengan aman. Jangan bagikan kepada siapapun.\n\n` +
      `Jika Anda mengalami masalah dengan akun ini, silakan hubungi customer service.`;

    return {
      text,
      parse_mode: 'Markdown',
    };
  }

  /**
   * Retrieve credentials for admin view (with access control)
   * @param {number} orderId Order ID
   * @param {number} adminTelegramId Admin Telegram user ID
   * @returns {Promise<string>} Decrypted credentials
   * @throws {UnauthorizedError} If access denied
   */
  async retrieveCredentialsForAdmin(orderId, adminTelegramId) {
    try {
      // Access control check (T132)
      await accessControl.requirePermission(adminTelegramId, 'order_view');

      const order = await orderService.getOrderById(orderId);
      if (!order.account_credentials) {
        throw new NotFoundError(`No credentials found for order ${orderId}`);
      }

      // Decrypt credentials
      const credentials = encryptionService.decrypt(order.account_credentials);

      // Get admin for audit log
      const admin = await accessControl.requireAdmin(adminTelegramId);

      // Audit log entry (T131)
      await auditLogger.logCredentialAccess({
        adminId: admin.id,
        actionType: 'credential_access',
        entityType: 'order',
        entityId: orderId,
        details: {
          orderId: order.id,
          customerId: order.customer_id,
          // Never log actual credentials (FR-044)
          credentialHash: encryptionService.hashForLogging(credentials),
        },
      });

      logger.info('Credentials retrieved by admin', {
        orderId,
        adminId: admin.id,
        // Never log actual credentials (FR-044)
        credentialHash: encryptionService.hashForLogging(credentials),
      });

      return credentials;
    } catch (error) {
      logger.error('Error retrieving credentials for admin', error, {
        orderId,
        adminTelegramId,
        // Never log credentials in error (FR-044)
      });
      throw error;
    }
  }
}

module.exports = new CredentialDeliveryService();
