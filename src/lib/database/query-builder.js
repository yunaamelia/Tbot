/**
 * Database query builder wrapper using Knex.js
 * Provides query optimization support (FR-039, Article XI)
 * Abstracts database-specific differences between PostgreSQL and MySQL
 */

const { getDb } = require('./db-connection');

/**
 * Get query builder instance
 * @returns {Knex.QueryBuilder} Knex query builder
 */
function getQueryBuilder() {
  return getDb();
}

/**
 * Execute a transaction with automatic rollback on error
 * @param {Function} callback Transaction callback function
 * @returns {Promise<any>} Transaction result
 */
async function transaction(callback) {
  const db = getDb();
  return db.transaction(callback);
}

/**
 * Execute raw SQL query (use sparingly, prefer query builder)
 * @param {string} sql SQL query string
 * @param {Array} bindings Query parameters
 * @returns {Promise<any>} Query result
 */
async function raw(sql, bindings = []) {
  const db = getDb();
  return db.raw(sql, bindings);
}

/**
 * Create query builder for a specific table
 * @param {string} tableName Table name
 * @returns {Knex.QueryBuilder} Knex query builder instance
 */
function table(tableName) {
  return getDb()(tableName);
}

module.exports = {
  getQueryBuilder,
  transaction,
  raw,
  table,
};
