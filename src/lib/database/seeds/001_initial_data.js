/**
 * Seed initial admin user and store configuration
 * Run after migrations: npm run migrate:seed
 */

const config = require('../../../shared/config');
const logger = require('../../../shared/logger').child('seeds');

/**
 * Seed function
 * @param {Knex} knex Knex instance
 */
exports.seed = async function (knex) {
  // Check if data already exists
  const existingAdmin = await knex('admins').first();
  if (existingAdmin) {
    logger.info('Initial data already exists, skipping seed');
    return;
  }

  // Get admin Telegram IDs from environment
  const adminIds = config
    .get('ADMIN_TELEGRAM_IDS', '')
    .split(',')
    .map((id) => id.trim())
    .filter((id) => id.length > 0);

  if (adminIds.length === 0) {
    logger.warn('No admin Telegram IDs configured. Please set ADMIN_TELEGRAM_IDS in .env');
    return;
  }

  // Insert initial admin users
  const admins = adminIds.map((telegramUserId) => ({
    telegram_user_id: parseInt(telegramUserId, 10),
    name: 'Admin',
    permissions: JSON.stringify([
      'stock_manage',
      'payment_verify',
      'store_control',
      'order_view',
      'customer_view',
    ]),
    notification_preferences: JSON.stringify({
      orders: true,
      payments: true,
      alerts: true,
    }),
    created_timestamp: new Date(),
    last_activity_timestamp: new Date(),
  }));

  await knex('admins').insert(admins);
  logger.info(`Inserted ${admins.length} admin user(s)`);

  // Insert initial store configuration
  await knex('store_config').insert([
    {
      key: 'store_status',
      value: 'open',
      updated_at: new Date(),
    },
    {
      key: 'backup_schedule',
      value: JSON.stringify({
        enabled: true,
        frequency: 'daily',
        time: '02:00',
        retention_days: 30,
      }),
      updated_at: new Date(),
    },
  ]);

  logger.info('Inserted initial store configuration');
};

