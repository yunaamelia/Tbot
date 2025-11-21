#!/usr/bin/env node
/**
 * Setup script for Premium Store Bot
 * Automatically generates secrets if they don't exist in .env file
 * 
 * Usage:
 *   node scripts/setup.js
 *   npm run setup
 */

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
const envExamplePath = path.join(__dirname, '..', 'env.example');

console.log('🚀 Premium Store Bot Setup\n');

// Check if .env exists
if (!fs.existsSync(envPath)) {
  console.log('📝 Creating .env file from env.example...');
  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ .env file created\n');
  } else {
    console.log('⚠️  env.example not found. Creating empty .env file...');
    fs.writeFileSync(envPath, '', 'utf8');
    console.log('✅ .env file created\n');
  }
} else {
  console.log('✅ .env file already exists\n');
}

// Read .env content
let envContent = fs.readFileSync(envPath, 'utf8');

// Check if ENCRYPTION_KEY exists
const hasEncryptionKey = envContent.includes('ENCRYPTION_KEY=') && 
  !envContent.match(/^ENCRYPTION_KEY=(your_|$)/m);

// Check if JWT_SECRET exists
const hasJwtSecret = envContent.includes('JWT_SECRET=') && 
  !envContent.match(/^JWT_SECRET=(your_|$)/m);

// Generate secrets if needed
if (!hasEncryptionKey || !hasJwtSecret) {
  console.log('🔐 Generating secure keys...\n');
  
  if (!hasEncryptionKey || !hasJwtSecret) {
    // Run generate-secrets script
    require('./generate-secrets.js');
  }
} else {
  console.log('✅ ENCRYPTION_KEY and JWT_SECRET already configured\n');
}

console.log('📋 Next steps:');
console.log('  1. Edit .env file and fill in your configuration:');
console.log('     - TELEGRAM_BOT_TOKEN');
console.log('     - Database credentials (DB_HOST, DB_USER, DB_PASSWORD, etc.)');
console.log('     - Redis configuration');
console.log('     - Duitku API credentials');
console.log('     - Bank account details (for manual transfer)');
console.log('     - ADMIN_TELEGRAM_IDS');
console.log('');
console.log('  2. Setup database:');
console.log('     npm run setup:db');
console.log('');
console.log('  3. Start the bot:');
console.log('     npm start');
console.log('');

