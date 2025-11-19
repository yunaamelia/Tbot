require('dotenv').config();

module.exports = {
  development: {
    client: process.env.DB_TYPE || 'postgresql',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'premium_store_bot',
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    },
    pool: {
      min: parseInt(process.env.DB_POOL_MIN || '2'),
      max: parseInt(process.env.DB_POOL_MAX || '10'),
    },
    migrations: {
      directory: './src/lib/database/migrations',
      tableName: 'knex_migrations',
    },
    seeds: {
      directory: './src/lib/database/seeds',
    },
  },

  production: {
    client: process.env.DB_TYPE || 'postgresql',
    connection: {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    },
    pool: {
      min: parseInt(process.env.DB_POOL_MIN || '2'),
      max: parseInt(process.env.DB_POOL_MAX || '10'),
    },
    migrations: {
      directory: './src/lib/database/migrations',
      tableName: 'knex_migrations',
    },
  },
};

