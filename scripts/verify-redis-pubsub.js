/**
 * Verify Redis connection and pub/sub capability for real-time stock updates
 * Task: T010
 * Feature: 002-friday-enhancement
 */

const redisClient = require('../src/lib/shared/redis-client');
const logger = require('../src/lib/shared/logger').child('verify-redis');

async function verifyRedisPubSub() {
  try {
    logger.info('Verifying Redis connection...');
    const redis = redisClient.getRedis();

    // Test basic connection
    const pong = await redis.ping();
    if (pong !== 'PONG') {
      throw new Error('Redis ping failed');
    }
    logger.info('✅ Redis connection verified');

    // Test pub/sub capability
    logger.info('Testing pub/sub capability...');
    const subscriber = new (require('ioredis'))(redis.options);
    const publisher = new (require('ioredis'))(redis.options);

    const testChannel = 'test:stock:updated';
    const testMessage = JSON.stringify({
      productId: 999,
      previousQuantity: 10,
      newQuantity: 5,
      adminId: 1,
      timestamp: new Date().toISOString(),
    });

    let messageReceived = false;

    // Subscribe to test channel
    subscriber.subscribe(testChannel);
    subscriber.on('message', (channel, message) => {
      if (channel === testChannel) {
        logger.info('✅ Received message via pub/sub:', message);
        messageReceived = true;
      }
    });

    // Wait a bit for subscription to be ready
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Publish test message
    await publisher.publish(testChannel, testMessage);
    logger.info('✅ Published test message to channel:', testChannel);

    // Wait for message to be received
    await new Promise((resolve) => setTimeout(resolve, 500));

    if (!messageReceived) {
      throw new Error('Pub/sub message not received');
    }

    // Cleanup
    await subscriber.unsubscribe(testChannel);
    await subscriber.quit();
    await publisher.quit();

    logger.info('✅ Redis pub/sub capability verified');
    return true;
  } catch (error) {
    logger.error('❌ Redis pub/sub verification failed:', error);
    throw error;
  }
}

// Run verification
if (require.main === module) {
  verifyRedisPubSub()
    .then(() => {
      logger.info('✅ All Redis verifications passed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('❌ Redis verification failed:', error);
      process.exit(1);
    });
}

module.exports = { verifyRedisPubSub };

