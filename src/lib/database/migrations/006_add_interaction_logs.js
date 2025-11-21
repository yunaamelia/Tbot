/**
 * Migration: Add interaction logs table for enhanced keyboard monitoring
 * Creates interaction_logs table to track user interactions with inline keyboards
 *
 * Task: T008
 * Requirement: FR-022, FR-023 (monitoring and logging)
 * Feature: 003-enhanced-keyboard
 */

exports.up = async function (knex) {
  // Check if table already exists (safe migration)
  const tableExists = await knex.schema.hasTable('interaction_logs');

  if (!tableExists) {
    await knex.schema.createTable('interaction_logs', (table) => {
      table.bigIncrements('id').primary();
      table.bigInteger('telegram_user_id').notNullable().index();
      table.string('button_id', 64).notNullable().index();
      table.string('button_label', 255).notNullable();
      table.integer('response_time_ms').notNullable();
      table.timestamp('timestamp').notNullable().defaultTo(knex.fn.now()).index();
      table.string('menu_context', 100);
      table.enum('user_role', ['admin', 'regular']);
      table.json('metadata');
      table.boolean('success').notNullable().defaultTo(true);
      table.text('error_message');

      // Composite index for user history queries
      table.index(['telegram_user_id', 'timestamp']);
    });

    // Add comments for PostgreSQL
    if (knex.client.config.client === 'postgresql') {
      await knex.raw(`
        COMMENT ON TABLE interaction_logs IS 'Tracks user interactions with inline keyboard buttons for analytics and monitoring';
        COMMENT ON COLUMN interaction_logs.telegram_user_id IS 'Telegram user ID who performed the interaction';
        COMMENT ON COLUMN interaction_logs.button_id IS 'Button identifier (callback_data)';
        COMMENT ON COLUMN interaction_logs.button_label IS 'Display label of the button clicked';
        COMMENT ON COLUMN interaction_logs.response_time_ms IS 'Time taken to process the interaction in milliseconds';
        COMMENT ON COLUMN interaction_logs.timestamp IS 'When the interaction occurred';
        COMMENT ON COLUMN interaction_logs.menu_context IS 'Menu context where interaction occurred (e.g., main, products)';
        COMMENT ON COLUMN interaction_logs.user_role IS 'User role at time of interaction (admin or regular)';
        COMMENT ON COLUMN interaction_logs.metadata IS 'Additional context data (error details, pagination info, etc.)';
        COMMENT ON COLUMN interaction_logs.success IS 'Whether interaction succeeded';
        COMMENT ON COLUMN interaction_logs.error_message IS 'Error message if interaction failed';
      `);
    }
  }
};

exports.down = async function (knex) {
  const tableExists = await knex.schema.hasTable('interaction_logs');

  if (tableExists) {
    await knex.schema.dropTable('interaction_logs');
  }
};
