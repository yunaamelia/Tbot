/**
 * QRIS payment handler with Duitku SDK integration
 * Generates QRIS code/image and handles payment flow with hybrid verification
 *
 * Tasks: T059, T094, T095, T096, T100
 * Requirement: FR-005, FR-007, FR-053
 * Feature: 002-friday-enhancement
 */

const config = require('../shared/config');
const logger = require('../shared/logger').child('qris-handler');
const i18n = require('../shared/i18n');
const paymentService = require('./payment-service');
const manualVerificationHandler = require('./manual-verification');
const https = require('https');
const crypto = require('crypto');

// Duitku API configuration
const DUITKU_API_URL = config.get(
  'DUITKU_API_URL',
  'https://api.duitku.com/api/merchant/v2/inquiry'
);
const DUITKU_STATUS_URL = config.get(
  'DUITKU_STATUS_URL',
  'https://api.duitku.com/api/merchant/v2/inquiry'
);

class QRISHandler {
  /**
   * Generate QRIS payment (T067)
   * @param {number} orderId Order ID
   * @param {number} amount Payment amount
   * @param {string} customerName Customer name
   * @returns {Promise<Object>} QRIS payment data with QR code URL/image
   */
  async generateQRIS(orderId, amount, customerName) {
    try {
      const merchantCode = config.require('DUITKU_MERCHANT_CODE');
      const apiKey = config.require('DUITKU_API_KEY');
      const callbackUrl = config.get(
        'DUITKU_CALLBACK_URL',
        'https://your-domain.com/api/payment/callback/qris'
      );

      // Create payment request payload
      const merchantOrderId = `ORDER_${orderId}_${Date.now()}`;
      const paymentData = {
        merchantCode,
        paymentAmount: amount,
        merchantOrderId,
        productDetails: `Pembayaran Pesanan #${orderId}`,
        customerVaName: customerName || 'Customer',
        email: config.get('DUITKU_CUSTOMER_EMAIL', 'customer@example.com'),
        phoneNumber: config.get('DUITKU_CUSTOMER_PHONE', ''),
        paymentMethod: 'Q2', // QRIS payment method code
        callbackUrl,
        returnUrl: config.get('DUITKU_RETURN_URL', ''),
        expiryPeriod: 60, // 60 minutes
      };

      // Generate signature
      const signature = this.generateSignature(paymentData, apiKey);

      // Call Duitku API
      const response = await this.callDuitkuAPI(DUITKU_API_URL, {
        ...paymentData,
        signature,
      });

      if (!response || !response.paymentUrl) {
        throw new Error('Failed to generate QRIS payment');
      }

      // Extract QR code URL from response
      const qrCodeUrl = response.paymentUrl || response.qrCodeUrl || response.qrCode;
      const reference = response.reference || response.merchantOrderId || merchantOrderId;

      logger.info('QRIS payment generated', {
        orderId,
        amount,
        reference,
        qrCodeUrl,
      });

      return {
        qrCodeUrl,
        reference,
        paymentUrl: response.paymentUrl,
        instructions: i18n.t('checkout_qris_instructions', {
          qrCodeUrl,
          amount: amount.toLocaleString('id-ID'),
        }),
      };
    } catch (error) {
      logger.error('Error generating QRIS payment', error, { orderId, amount });
      throw error;
    }
  }

  /**
   * Generate Duitku API signature
   * @param {Object} data Payment data
   * @param {string} apiKey API key
   * @returns {string} HMAC signature
   */
  generateSignature(data, apiKey) {
    const dataString = JSON.stringify(data);
    return crypto.createHmac('sha256', apiKey).update(dataString).digest('hex');
  }

  /**
   * Call Duitku API
   * @param {string} url API URL
   * @param {Object} data Request data
   * @returns {Promise<Object>} API response
   */
  async callDuitkuAPI(url, data) {
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify(data);
      const urlObj = new URL(url);

      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: urlObj.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      };

      const req = https.request(options, (res) => {
        let responseData = '';

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          try {
            const parsed = JSON.parse(responseData);
            if (res.statusCode === 200 && parsed.statusCode === '00') {
              resolve(parsed);
            } else {
              reject(new Error(parsed.statusMessage || 'Duitku API error'));
            }
          } catch (error) {
            reject(new Error('Failed to parse Duitku API response'));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.write(postData);
      req.end();
    });
  }

  /**
   * Check payment status (polling fallback - FR-053)
   * @param {string} reference Payment reference/transaction ID
   * @returns {Promise<Object>} Payment status
   */
  async checkPaymentStatus(reference) {
    try {
      const merchantCode = config.require('DUITKU_MERCHANT_CODE');
      const apiKey = config.require('DUITKU_API_KEY');

      const statusData = {
        merchantCode,
        merchantOrderId: reference,
      };

      const signature = this.generateSignature(statusData, apiKey);

      const response = await this.callDuitkuAPI(DUITKU_STATUS_URL, {
        ...statusData,
        signature,
      });

      return {
        status: response.status || 'pending',
        reference: response.merchantOrderId || reference,
        amount: response.paymentAmount,
        paymentDate: response.paymentDate,
      };
    } catch (error) {
      logger.error('Error checking QRIS payment status', error, { reference });
      throw error;
    }
  }

  /**
   * Attempt automatic verification with polling and timeout (T094, T095, T096)
   * @param {number} orderId Order ID
   * @param {string} reference Payment reference
   * @param {number} timeoutMs Timeout in milliseconds (default: 5 minutes)
   * @returns {Promise<Object>} Verification result {success: boolean, method: 'automatic'|'manual', error?: string}
   */
  async attemptAutomaticVerification(orderId, reference, timeoutMs = 5 * 60 * 1000) {
    const startTime = Date.now();
    const pollInterval = 10000; // Poll every 10 seconds
    let lastStatus = 'pending';

    logger.info('Starting automatic QRIS verification attempt', {
      orderId,
      reference,
      timeoutMs,
    });

    try {
      // Poll payment status until verified or timeout
      while (Date.now() - startTime < timeoutMs) {
        try {
          const status = await this.checkPaymentStatus(reference);

          // Check if payment is verified
          if (status.status === 'paid' || status.status === 'success') {
            try {
              // Verify payment automatically
              const verifiedPayment = await paymentService.verifyQRISPayment(
                orderId,
                status.reference || reference
              );

              logger.info('Automatic QRIS verification succeeded', {
                orderId,
                reference,
                verificationMethod: 'automatic',
                duration: Date.now() - startTime,
              });

              return {
                success: true,
                method: 'automatic',
                payment: verifiedPayment,
              };
            } catch (error) {
              // Verification API call failed, but payment might be paid
              logger.warn('Automatic verification API call failed', error, {
                orderId,
                reference,
              });
              // Continue polling or fallback
            }
          }

          // Update last status for logging
          if (status.status !== lastStatus) {
            logger.debug('Payment status changed', {
              orderId,
              reference,
              oldStatus: lastStatus,
              newStatus: status.status,
            });
            lastStatus = status.status;
          }

          // Wait before next poll
          await new Promise((resolve) => setTimeout(resolve, pollInterval));
        } catch (error) {
          // API call failed, but continue polling until timeout
          logger.warn('Error checking payment status during polling', error, {
            orderId,
            reference,
            elapsed: Date.now() - startTime,
          });
          await new Promise((resolve) => setTimeout(resolve, pollInterval));
        }
      }

      // Timeout reached - fallback to manual verification
      logger.warn('Automatic QRIS verification timeout', {
        orderId,
        reference,
        timeoutMs,
        elapsed: Date.now() - startTime,
      });

      return {
        success: false,
        method: 'manual',
        error: 'Automatic verification timeout. Falling back to manual verification.',
        reason: 'timeout',
      };
    } catch (error) {
      // Critical error - fallback to manual verification
      logger.error('Automatic QRIS verification failed', error, {
        orderId,
        reference,
        elapsed: Date.now() - startTime,
      });

      return {
        success: false,
        method: 'manual',
        error: error.message || 'Automatic verification failed. Please use manual verification.',
        reason: 'error',
      };
    }
  }

  /**
   * Process QRIS payment with hybrid verification (automatic first, manual fallback) (T094, T096)
   * @param {number} orderId Order ID
   * @param {string} reference Payment reference
   * @param {number} timeoutMs Timeout for automatic verification (default: 5 minutes)
   * @returns {Promise<Object>} Verification result with fallback instructions if needed
   */
  async processQRISPaymentWithHybridVerification(orderId, reference, timeoutMs = 5 * 60 * 1000) {
    try {
      // Step 1: Attempt automatic verification first (T094)
      const autoResult = await this.attemptAutomaticVerification(orderId, reference, timeoutMs);

      if (autoResult.success && autoResult.method === 'automatic') {
        // Automatic verification succeeded
        logger.info('QRIS payment processed with automatic verification', {
          orderId,
          reference,
        });

        return {
          success: true,
          method: 'automatic',
          payment: autoResult.payment,
          message: 'Pembayaran telah diverifikasi secara otomatis. Pesanan Anda sedang diproses.',
        };
      }

      // Step 2: Automatic verification failed or timed out - fallback to manual (T096)
      logger.info('Automatic verification failed, falling back to manual verification', {
        orderId,
        reference,
        reason: autoResult.reason,
      });

      // Get order amount for manual instructions
      const { getDb } = require('../database/db-connection');
      const db = getDb();
      const order = await db('orders').where('id', orderId).first();
      const amount = order ? order.total_amount : 0;

      // Generate manual verification instructions (T097)
      const manualInstructions = manualVerificationHandler.formatManualTransferInstructions(
        orderId,
        amount
      );

      // Add fallback message
      const fallbackMessage =
        `⚠️ *Verifikasi Otomatis Gagal*\n\n` +
        `Pembayaran QRIS Anda tidak dapat diverifikasi secara otomatis.\n\n` +
        `Silakan lanjutkan dengan verifikasi manual:\n\n` +
        manualInstructions.text;

      return {
        success: false,
        method: 'manual',
        fallback: true,
        manualInstructions: {
          ...manualInstructions,
          text: fallbackMessage,
        },
        error: autoResult.error,
        reason: autoResult.reason,
      };
    } catch (error) {
      logger.error('Error processing QRIS payment with hybrid verification', error, {
        orderId,
        reference,
      });

      // On critical error, still provide manual fallback
      const { getDb } = require('../database/db-connection');
      const db = getDb();
      const order = await db('orders').where('id', orderId).first();
      const amount = order ? order.total_amount : 0;

      const manualInstructions = manualVerificationHandler.formatManualTransferInstructions(
        orderId,
        amount
      );

      return {
        success: false,
        method: 'manual',
        fallback: true,
        manualInstructions,
        error: error.message || 'Terjadi kesalahan. Silakan gunakan verifikasi manual.',
        reason: 'error',
      };
    }
  }

  /**
   * Format QRIS payment message for Telegram (updated for hybrid verification)
   * @param {Object} qrisData QRIS payment data
   * @param {number} orderId Order ID
   * @returns {Object} Formatted message with QR code and instructions
   */
  formatQRISMessage(qrisData, orderId) {
    const amount = qrisData.amount || 0;
    const text =
      `💳 *Pembayaran QRIS*\n\n` +
      `Pesanan: #${orderId}\n` +
      `Jumlah: *Rp ${amount.toLocaleString('id-ID')}*\n\n` +
      `${qrisData.instructions || 'Silakan scan QRIS untuk melakukan pembayaran.'}\n\n` +
      `Pembayaran akan diverifikasi secara otomatis setelah Anda melakukan pembayaran.\n` +
      `Jika verifikasi otomatis gagal, sistem akan menggunakan verifikasi manual.`;

    // If QR code is an image URL, we can send it as photo
    // Otherwise, send as text with URL
    return {
      text,
      parse_mode: 'Markdown',
      qrCodeUrl: qrisData.qrCodeUrl,
      reference: qrisData.reference,
    };
  }
}

module.exports = new QRISHandler();
