/**
 * Add database indexes for query optimization (FR-039, Article XI)
 * Improves query performance for common access patterns
 */

exports.up = function (knex) {
  return knex.schema
    .alterTable('products', (table) => {
      table.index('category', 'idx_products_category');
      table.index('availability_status', 'idx_products_availability');
      table.index('created_at', 'idx_products_created');
    })
    .alterTable('customers', (table) => {
      table.index('telegram_user_id', 'idx_customers_telegram_id');
      table.index('username', 'idx_customers_username');
      table.index('last_activity_timestamp', 'idx_customers_last_activity');
    })
    .alterTable('orders', (table) => {
      table.index('customer_id', 'idx_orders_customer');
      table.index('product_id', 'idx_orders_product');
      table.index('order_status', 'idx_orders_status');
      table.index('payment_status', 'idx_orders_payment_status');
      table.index('created_timestamp', 'idx_orders_created');
    })
    .alterTable('payments', (table) => {
      table.index('order_id', 'idx_payments_order');
      table.index('status', 'idx_payments_status');
      table.index('payment_gateway_transaction_id', 'idx_payments_gateway_id');
      table.index('created_timestamp', 'idx_payments_created');
    })
    .alterTable('stock', (table) => {
      table.index('product_id', 'idx_stock_product');
      table.index('last_updated_timestamp', 'idx_stock_updated');
    })
    .alterTable('admins', (table) => {
      table.index('telegram_user_id', 'idx_admins_telegram_id');
      table.index('username', 'idx_admins_username');
    })
    .alterTable('notifications', (table) => {
      table.index(['recipient_id', 'recipient_type'], 'idx_notifications_recipient');
      table.index('type', 'idx_notifications_type');
      table.index('order_id', 'idx_notifications_order');
      table.index('sent_timestamp', 'idx_notifications_sent');
      table.index('read_status', 'idx_notifications_read_status');
    })
    .alterTable('audit_logs', (table) => {
      table.index('admin_id', 'idx_audit_admin');
      table.index('action_type', 'idx_audit_action');
      table.index(['entity_type', 'entity_id'], 'idx_audit_entity');
      table.index('timestamp', 'idx_audit_timestamp');
    });
};

exports.down = function (knex) {
  return knex.schema
    .alterTable('audit_logs', (table) => {
      table.dropIndex('idx_audit_timestamp');
      table.dropIndex('idx_audit_entity');
      table.dropIndex('idx_audit_action');
      table.dropIndex('idx_audit_admin');
    })
    .alterTable('notifications', (table) => {
      table.dropIndex('idx_notifications_read_status');
      table.dropIndex('idx_notifications_sent');
      table.dropIndex('idx_notifications_order');
      table.dropIndex('idx_notifications_type');
      table.dropIndex('idx_notifications_recipient');
    })
    .alterTable('admins', (table) => {
      table.dropIndex('idx_admins_username');
      table.dropIndex('idx_admins_telegram_id');
    })
    .alterTable('stock', (table) => {
      table.dropIndex('idx_stock_updated');
      table.dropIndex('idx_stock_product');
    })
    .alterTable('payments', (table) => {
      table.dropIndex('idx_payments_created');
      table.dropIndex('idx_payments_gateway_id');
      table.dropIndex('idx_payments_status');
      table.dropIndex('idx_payments_order');
    })
    .alterTable('orders', (table) => {
      table.dropIndex('idx_orders_created');
      table.dropIndex('idx_orders_payment_status');
      table.dropIndex('idx_orders_status');
      table.dropIndex('idx_orders_product');
      table.dropIndex('idx_orders_customer');
    })
    .alterTable('customers', (table) => {
      table.dropIndex('idx_customers_last_activity');
      table.dropIndex('idx_customers_username');
      table.dropIndex('idx_customers_telegram_id');
    })
    .alterTable('products', (table) => {
      table.dropIndex('idx_products_created');
      table.dropIndex('idx_products_availability');
      table.dropIndex('idx_products_category');
    });
};

