/**
 * Express.js webhook server with HTTPS support (FR-045, Article XII)
 * Handles Telegram webhooks and payment gateway callbacks
 */

const express = require('express');
const https = require('https');
const fs = require('fs');
const config = require('./src/lib/shared/config');
const logger = require('./src/lib/shared/logger').child('server');
const { webhookMiddleware } = require('./src/lib/telegram/webhook-handler');
const rateLimit = require('express-rate-limit');
const { errorHandler } = require('./src/lib/shared/errors');

const app = express();
const PORT = config.getInt('SERVER_PORT', 3000);
const HOST = config.get('SERVER_HOST', '0.0.0.0');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting for webhook endpoints (FR-035)
const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Telegram webhook endpoint
app.post('/webhook/telegram', webhookLimiter, webhookMiddleware);

// Payment callback endpoint (T062, FR-057, Article XII)
const paymentService = require('./src/lib/payment/payment-service');
const { NotFoundError } = require('./src/lib/shared/errors');
const crypto = require('crypto');

app.post('/api/payment/callback/qris', webhookLimiter, async (req, res) => {
  try {
    // HMAC signature verification (FR-031, FR-057)
    const secret = config.get('DUITKU_API_KEY', 'test_secret');
    const payload = req.body;
    const signature = req.headers['x-duitku-signature'] || req.headers['x-duitku-signature'];

    // Generate expected signature
    const payloadString = JSON.stringify(payload);
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex');

    // Verify signature
    if (signature !== expectedSignature) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Validate required fields
    if (!payload.transactionId || !payload.orderId || !payload.status || !payload.amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify payment if status is 'paid'
    if (payload.status === 'paid') {
      try {
        await paymentService.verifyQRISPayment(
          parseInt(payload.orderId, 10),
          payload.transactionId
        );
      } catch (error) {
        if (error instanceof NotFoundError) {
          return res.status(404).json({ error: 'Order not found' });
        }
        throw error;
      }
    }

    res.status(200).json({ status: 'success', message: 'Payment verified' });
  } catch (error) {
    logger.error('Error processing QRIS callback', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Payment Status Polling Endpoint (T063)
app.get('/api/payment/callback/status', webhookLimiter, async (req, res) => {
  try {
    const transactionId = req.query.transaction_id;
    if (!transactionId) {
      return res.status(400).json({ error: 'transaction_id is required' });
    }

    try {
      const payment = await paymentService.getPaymentByTransactionId(transactionId);
      if (!payment) {
        return res.status(404).json({ error: 'Transaction not found' });
      }

      res.status(200).json({
        transactionId: payment.payment_gateway_transaction_id,
        orderId: payment.order_id.toString(),
        status: payment.status,
        amount: payment.amount,
      });
    } catch (error) {
      if (error instanceof NotFoundError || !error) {
        return res.status(404).json({ error: 'Transaction not found' });
      }
      throw error;
    }
  } catch (error) {
    logger.error('Error getting payment status', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Error handling middleware (FR-036, Article X)
app.use(errorHandler);

// Start server
function startServer() {
  const useHttps = config.getBoolean('USE_HTTPS', false);

  if (useHttps) {
    // HTTPS server (FR-045, Article XII)
    const httpsOptions = {
      key: fs.readFileSync(config.require('HTTPS_KEY_PATH')),
      cert: fs.readFileSync(config.require('HTTPS_CERT_PATH')),
    };

    https.createServer(httpsOptions, app).listen(PORT, HOST, () => {
      logger.info(`HTTPS server running on https://${HOST}:${PORT}`);
    });
  } else {
    // HTTP server (development only)
    app.listen(PORT, HOST, () => {
      logger.info(`HTTP server running on http://${HOST}:${PORT}`);
      logger.warn('Running in HTTP mode. Use HTTPS in production (FR-045, Article XII)');
    });
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

if (require.main === module) {
  startServer();
}

module.exports = app;

