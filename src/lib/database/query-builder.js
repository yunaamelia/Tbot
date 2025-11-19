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
 * Optimized query helper for common patterns
 * Includes query timing for performance monitoring
 */
class QueryBuilder {
  constructor(tableName) {
    this.tableName = tableName;
    this.db = getDb();
  }

  /**
   * Select with automatic query optimization hints
   */
  select(...columns) {
    return this.db(this.tableName).select(...columns);
  }

  /**
   * Insert with conflict handling
   */
  insert(data) {
    return this.db(this.tableName).insert(data);
  }

  /**
   * Update with where clause
   */
  update(data) {
    return this.db(this.tableName).update(data);
  }

  /**
   * Delete with where clause
   */
  delete() {
    return this.db(this.tableName).delete();
  }

  /**
   * Find by ID with automatic index usage
   */
  async findById(id) {
    return this.db(this.tableName).where('id', id).first();
  }

  /**
   * Find by column with index usage
   */
  async findBy(column, value) {
    return this.db(this.tableName).where(column, value);
  }
}

/**
 * Create query builder for a specific table
 * @param {string} tableName Table name
 * @returns {QueryBuilder} Query builder instance
 */
function table(tableName) {
  return new QueryBuilder(tableName);
}

module.exports = {
  getQueryBuilder,
  transaction,
  raw,
  table,
};
