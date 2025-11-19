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

// Payment callback endpoint (will be implemented in Phase 5)
app.post('/api/payment/callback/qris', webhookLimiter, (req, res) => {
  // Placeholder - will be implemented in User Story 3
  res.status(501).json({ error: 'Not implemented yet' });
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

