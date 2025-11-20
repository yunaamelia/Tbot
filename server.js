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
// Store raw body for HMAC verification (T134)
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf.toString('utf8');
    },
  })
);
app.use(express.urlencoded({ extended: true }));

// Rate limiting for webhook endpoints (FR-035)
const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});

// Health check endpoint (T158)
app.get('/health', async (req, res) => {
  try {
    const { testConnection: testDb } = require('./src/lib/database/db-connection');
    const { testConnection: testRedis } = require('./src/lib/shared/redis-client');

    const dbHealthy = await testDb();
    const redisHealthy = await testRedis();

    const status = dbHealthy && redisHealthy ? 'healthy' : 'degraded';
    const statusCode = status === 'healthy' ? 200 : 503;

    res.status(statusCode).json({
      status,
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealthy ? 'ok' : 'error',
        redis: redisHealthy ? 'ok' : 'error',
      },
    });
  } catch (error) {
    logger.error('Health check failed', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
    });
  }
});

// Performance monitoring endpoint (T159, FR-042)
app.get('/api/monitoring/performance', async (req, res) => {
  try {
    const performanceMonitor = require('./src/lib/shared/performance-monitor');
    const summary = performanceMonitor.getSummary();
    const recommendations = performanceMonitor.getScalabilityRecommendations();

    res.json({
      summary,
      recommendations,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error getting performance metrics', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Telegram webhook endpoint
app.post('/webhook/telegram', webhookLimiter, webhookMiddleware);

// Payment callback endpoint (T062, FR-057, Article XII)
const paymentService = require('./src/lib/payment/payment-service');
const webhookVerifier = require('./src/lib/payment/webhook-verifier');
const { validateWebhookPayload } = require('./src/lib/shared/input-validator');
const { NotFoundError, ValidationError } = require('./src/lib/shared/errors');

app.post('/api/payment/callback/qris', webhookLimiter, async (req, res) => {
  try {
    // HMAC signature verification (T134, FR-031, FR-057)
    if (!webhookVerifier.verifyDuitkuWebhook(req)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Input validation and sanitization (T136, FR-043)
    let payload;
    try {
      payload = validateWebhookPayload(req.body, [
        'transactionId',
        'orderId',
        'status',
        'amount',
      ]);
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(400).json({ error: error.message });
      }
      throw error;
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

    server = https.createServer(httpsOptions, app).listen(PORT, HOST, () => {
      logger.info(`HTTPS server running on https://${HOST}:${PORT}`);
    });
  } else {
    // HTTP server (development only)
    server = app.listen(PORT, HOST, () => {
      logger.info(`HTTP server running on http://${HOST}:${PORT}`);
      logger.warn('Running in HTTP mode. Use HTTPS in production (FR-045, Article XII)');
    });
  }
}

// Graceful shutdown handler (T157)
let server = null;
let backupScheduler = null;
let isShuttingDown = false;

async function gracefulShutdown(signal) {
  if (isShuttingDown) {
    logger.warn('Shutdown already in progress, forcing exit');
    process.exit(1);
  }

  isShuttingDown = true;
  logger.info(`${signal} received, shutting down gracefully...`);

  try {
    // Stop accepting new connections
    if (server) {
      server.close(() => {
        logger.info('HTTP/HTTPS server closed');
});
    }

    // Close database connections
    const { closeDb } = require('./src/lib/database/db-connection');
    await closeDb();
    logger.info('Database connections closed');

    // Close Redis connections
    const { closeRedis } = require('./src/lib/shared/redis-client');
    await closeRedis();
    logger.info('Redis connections closed');

    // Stop backup scheduler
    if (backupScheduler) {
      backupScheduler.stop();
      logger.info('Backup scheduler stopped');
    }

    logger.info('Graceful shutdown completed');
  process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown', error);
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

if (require.main === module) {
  startServer();

  // Start backup scheduler (T145)
  const BackupScheduler = require('./src/lib/backup/backup-scheduler');
  const enableBackupScheduler = config.getBoolean('ENABLE_BACKUP_SCHEDULER', true);
  if (enableBackupScheduler) {
    backupScheduler = new BackupScheduler();
    backupScheduler.start();
    logger.info('Backup scheduler enabled');
  }

  // Start checkout timeout cleanup scheduler (T074)
  const checkoutTimeout = require('./src/lib/order/checkout-timeout');
  checkoutTimeout.startCleanupScheduler();
}

module.exports = app;

