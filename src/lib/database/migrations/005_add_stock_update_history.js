/**
 * Migration: Add stock update history tracking
 * Adds last_updated_by and update_history columns to stock table
 *
 * Task: T008
 * Requirement: FR-014, FR-015 (real-time stock management)
 * Feature: 002-friday-enhancement
 */

exports.up = async function (knex) {
  // Check if columns already exist (safe migration)
  const hasColumn = await knex.schema.hasColumn('stock', 'last_updated_by');

  if (!hasColumn) {
    await knex.schema.table('stock', (table) => {
      table
        .bigInteger('last_updated_by')
        .nullable()
        .references('id')
        .inTable('admins')
        .onDelete('SET NULL')
        .comment('Admin ID who made the last stock update');
    });
  }

  const hasHistoryColumn = await knex.schema.hasColumn('stock', 'update_history');
  if (!hasHistoryColumn) {
    await knex.schema.table('stock', (table) => {
      table
        .json('update_history')
        .nullable()
        .comment(
          'Array of stock update records with admin ID, previous/new quantities, and timestamps'
        );
    });
  }

  // Add index for faster queries on last_updated_by (if column exists)
  if (!hasColumn) {
    await knex.schema.raw(`
      CREATE INDEX IF NOT EXISTS idx_stock_last_updated_by ON stock(last_updated_by);
    `);
  }
};

exports.down = async function (knex) {
  await knex.schema.table('stock', (table) => {
    table.dropColumn('last_updated_by');
    table.dropColumn('update_history');
  });

  // Drop index
  await knex.schema.raw(`
    DROP INDEX IF EXISTS idx_stock_last_updated_by;
  `);
};
