#!/usr/bin/env node
/**
 * Script to generate a secure ENCRYPTION_KEY for .env file
 * 
 * Usage:
 *   node scripts/generate-encryption-key.js
 * 
 * This will generate a 64-character hexadecimal encryption key
 * suitable for AES-256-GCM encryption.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Generate secure random key (32 bytes = 256 bits for AES-256)
const keyBytes = 32;
const encryptionKey = crypto.randomBytes(keyBytes).toString('hex');

console.log('🔐 Generating secure ENCRYPTION_KEY...\n');
console.log('Generated key:', encryptionKey);
console.log('Key length:', encryptionKey.length, 'characters (64 hex = 32 bytes = 256 bits)');
console.log('');

// Read .env file
const envPath = path.join(__dirname, '..', '.env');
let envContent = '';

if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
  
  // Check if ENCRYPTION_KEY already exists
  if (envContent.includes('ENCRYPTION_KEY=')) {
    // Update existing ENCRYPTION_KEY
    envContent = envContent.replace(
      /^ENCRYPTION_KEY=.*/m,
      `ENCRYPTION_KEY=${encryptionKey}`
    );
    console.log('✅ Updated ENCRYPTION_KEY in .env');
  } else {
    // Append ENCRYPTION_KEY
    if (!envContent.endsWith('\n')) {
      envContent += '\n';
    }
    envContent += `ENCRYPTION_KEY=${encryptionKey}\n`;
    console.log('✅ Added ENCRYPTION_KEY to .env');
  }
  
  // Write back to file
  fs.writeFileSync(envPath, envContent, 'utf8');
  console.log('');
  console.log('📝 .env file updated successfully!');
} else {
  console.log('⚠️  .env file not found at:', envPath);
  console.log('');
  console.log('Please add this line to your .env file:');
  console.log(`ENCRYPTION_KEY=${encryptionKey}`);
}

console.log('');
console.log('🔒 Security Notes:');
console.log('  - This key is used for AES-256-GCM encryption');
console.log('  - Keep this key secret and never commit it to git');
console.log('  - Use different keys for development and production');
console.log('  - If you lose this key, encrypted data cannot be decrypted');
console.log('');

