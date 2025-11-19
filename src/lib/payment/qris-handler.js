/**
 * QRIS payment handler with Duitku SDK integration
 * Generates QRIS code/image and handles payment flow
 *
 * Task: T059
 * Requirement: FR-005, FR-007, FR-053
 */

const config = require('../shared/config');
const logger = require('../shared/logger').child('qris-handler');
const i18n = require('../shared/i18n');
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
   * Format QRIS payment message for Telegram
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
      `Pembayaran akan diverifikasi secara otomatis setelah Anda melakukan pembayaran.`;

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
