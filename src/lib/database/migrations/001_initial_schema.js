/**
 * Initial database schema migration
 * Creates all tables for the premium account store bot
 * Supports both PostgreSQL and MySQL via Knex.js
 */

exports.up = function (knex) {
  return knex.schema
    .createTable('products', (table) => {
      table.bigIncrements('id').primary();
      table.string('name', 255).notNullable();
      table.text('description');
      table.decimal('price', 10, 2).notNullable();
      table.integer('stock_quantity').notNullable().defaultTo(0);
      table.string('category', 100);
      table.json('features');
      table.json('media_files');
      table
        .enu('availability_status', ['available', 'out_of_stock', 'discontinued'])
        .notNullable()
        .defaultTo('available');
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    })
    .createTable('customers', (table) => {
      table.bigIncrements('id').primary();
      table.bigInteger('telegram_user_id').notNullable().unique();
      table.string('name', 255);
      table.string('username', 100);
      table.json('purchase_history');
      table.json('behavior_patterns');
      table.json('preferences');
      table.timestamp('registration_timestamp').notNullable().defaultTo(knex.fn.now());
      table.timestamp('last_activity_timestamp').notNullable().defaultTo(knex.fn.now());
    })
    .createTable('admins', (table) => {
      table.bigIncrements('id').primary();
      table.bigInteger('telegram_user_id').notNullable().unique();
      table.string('name', 255);
      table.string('username', 100);
      table.json('permissions').notNullable();
      table.json('notification_preferences');
      table.timestamp('last_activity_timestamp').notNullable().defaultTo(knex.fn.now());
      table.timestamp('created_timestamp').notNullable().defaultTo(knex.fn.now());
    })
    .createTable('orders', (table) => {
      table.bigIncrements('id').primary();
      table.bigInteger('customer_id').notNullable();
      table.bigInteger('product_id').notNullable();
      table.integer('quantity').notNullable();
      table.decimal('total_amount', 10, 2).notNullable();
      table.enu('payment_method', ['qris', 'manual_bank_transfer']).notNullable();
      table
        .enu('payment_status', ['pending', 'verified', 'failed', 'refunded'])
        .notNullable()
        .defaultTo('pending');
      table
        .enu('order_status', [
          'pending_payment',
          'payment_received',
          'processing',
          'account_delivered',
          'completed',
          'cancelled',
        ])
        .notNullable()
        .defaultTo('pending_payment');
      table.timestamp('created_timestamp').notNullable().defaultTo(knex.fn.now());
      table.timestamp('payment_verification_timestamp');
      table.timestamp('completed_timestamp');
      table.text('account_credentials'); // Encrypted at rest

      table.foreign('customer_id').references('id').inTable('customers').onDelete('RESTRICT');
      table.foreign('product_id').references('id').inTable('products').onDelete('RESTRICT');
    })
    .createTable('payments', (table) => {
      table.bigIncrements('id').primary();
      table.bigInteger('order_id').notNullable().unique();
      table.enu('payment_method', ['qris', 'manual_bank_transfer']).notNullable();
      table.decimal('amount', 10, 2).notNullable();
      table
        .enu('status', ['pending', 'verified', 'failed', 'refunded'])
        .notNullable()
        .defaultTo('pending');
      table.enu('verification_method', ['automatic', 'manual']);
      table.text('payment_proof');
      table.string('payment_gateway_transaction_id', 255);
      table.timestamp('verification_timestamp');
      table.bigInteger('admin_id');
      table.timestamp('created_timestamp').notNullable().defaultTo(knex.fn.now());

      table.foreign('order_id').references('id').inTable('orders').onDelete('CASCADE');
      table.foreign('admin_id').references('id').inTable('admins').onDelete('SET NULL');
    })
    .createTable('stock', (table) => {
      table.bigIncrements('id').primary();
      table.bigInteger('product_id').notNullable().unique();
      table.integer('current_quantity').notNullable().defaultTo(0);
      table.integer('reserved_quantity').notNullable().defaultTo(0);
      table.timestamp('last_updated_timestamp').notNullable().defaultTo(knex.fn.now());
      table.bigInteger('last_updated_by');

      table.foreign('product_id').references('id').inTable('products').onDelete('CASCADE');
      table.foreign('last_updated_by').references('id').inTable('admins').onDelete('SET NULL');
    })
    .createTable('notifications', (table) => {
      table.bigIncrements('id').primary();
      table.bigInteger('recipient_id').notNullable();
      table.enu('recipient_type', ['customer', 'admin']).notNullable();
      table.enu('type', ['order_status', 'payment', 'admin_alert', 'system']).notNullable();
      table.text('content').notNullable();
      table.json('rich_media_attachments');
      table.bigInteger('order_id');
      table.timestamp('sent_timestamp').notNullable().defaultTo(knex.fn.now());
      table.timestamp('read_timestamp');
      table.enu('read_status', ['unread', 'read']).notNullable().defaultTo('unread');

      table.foreign('order_id').references('id').inTable('orders').onDelete('SET NULL');
    })
    .createTable('store_config', (table) => {
      table.string('key', 100).primary();
      table.text('value').notNullable();
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    })
    .createTable('audit_logs', (table) => {
      table.bigIncrements('id').primary();
      table.bigInteger('admin_id');
      table.string('action_type', 100).notNullable();
      table.string('entity_type', 100);
      table.bigInteger('entity_id');
      table.json('details');
      table.string('ip_address', 45);
      table.timestamp('timestamp').notNullable().defaultTo(knex.fn.now());

      table.foreign('admin_id').references('id').inTable('admins').onDelete('SET NULL');
    });
};

exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists('audit_logs')
    .dropTableIfExists('store_config')
    .dropTableIfExists('notifications')
    .dropTableIfExists('stock')
    .dropTableIfExists('payments')
    .dropTableIfExists('orders')
    .dropTableIfExists('admins')
    .dropTableIfExists('customers')
    .dropTableIfExists('products');
};
