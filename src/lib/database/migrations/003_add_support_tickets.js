/**
 * Migration: Add support_tickets table
 * Creates table for customer support tickets
 */

exports.up = function (knex) {
  return knex.schema.createTable('support_tickets', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('customer_id').notNullable();
    table.string('subject', 255).notNullable();
    table.text('description').notNullable();
    table.bigInteger('order_id'); // Optional: if ticket is related to an order
    table
      .enu('status', ['open', 'in_progress', 'closed', 'resolved'])
      .notNullable()
      .defaultTo('open');
    table.enu('priority', ['low', 'normal', 'high', 'urgent']).notNullable().defaultTo('normal');
    table.timestamp('created_timestamp').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_timestamp').notNullable().defaultTo(knex.fn.now());
    table.timestamp('closed_timestamp');
    table.text('admin_notes'); // Admin notes when closing ticket

    table.foreign('customer_id').references('id').inTable('customers').onDelete('CASCADE');
    table.foreign('order_id').references('id').inTable('orders').onDelete('SET NULL');

    // Indexes
    table.index('customer_id', 'idx_tickets_customer');
    table.index('status', 'idx_tickets_status');
    table.index('order_id', 'idx_tickets_order');
    table.index('created_timestamp', 'idx_tickets_created');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('support_tickets');
};
