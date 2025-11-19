/**
 * Migration: Add chat tables for customer service
 * Creates chat_sessions and chat_messages tables
 *
 * Task: T140
 * Requirement: FR-014
 */

exports.up = function (knex) {
  return knex.schema
    .createTable('chat_sessions', (table) => {
      table.bigIncrements('id').primary();
      table.bigInteger('customer_id').notNullable();
      table.bigInteger('admin_id');
      table.enu('status', ['waiting', 'active', 'closed']).notNullable().defaultTo('waiting');
      table.timestamp('created_timestamp').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_timestamp').notNullable().defaultTo(knex.fn.now());

      table.foreign('customer_id').references('id').inTable('customers').onDelete('CASCADE');
      table.foreign('admin_id').references('id').inTable('admins').onDelete('SET NULL');
    })
    .createTable('chat_messages', (table) => {
      table.bigIncrements('id').primary();
      table.bigInteger('session_id').notNullable();
      table.enu('sender_type', ['customer', 'admin']).notNullable();
      table.text('message').notNullable();
      table.timestamp('created_timestamp').notNullable().defaultTo(knex.fn.now());

      table.foreign('session_id').references('id').inTable('chat_sessions').onDelete('CASCADE');
    })
    .then(() => {
      // Add indexes for performance
      return knex.schema.raw(`
        CREATE INDEX idx_chat_sessions_customer ON chat_sessions(customer_id);
        CREATE INDEX idx_chat_sessions_status ON chat_sessions(status);
        CREATE INDEX idx_chat_messages_session ON chat_messages(session_id);
        CREATE INDEX idx_chat_messages_created ON chat_messages(created_timestamp);
      `);
    });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('chat_messages').dropTableIfExists('chat_sessions');
};
