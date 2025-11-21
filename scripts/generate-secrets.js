#!/usr/bin/env node
/**
 * Script to generate secure ENCRYPTION_KEY and JWT_SECRET for .env file
 * 
 * Usage:
 *   node scripts/generate-secrets.js
 * 
 * This will generate:
 *   - ENCRYPTION_KEY: 64-character hexadecimal key (32 bytes = 256 bits) for AES-256-GCM
 *   - JWT_SECRET: 128-character hexadecimal key (64 bytes = 512 bits) for JWT signing
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

console.log('🔐 Generating secure keys...\n');

// Generate ENCRYPTION_KEY (32 bytes = 256 bits for AES-256)
const encryptionKeyBytes = 32;
const encryptionKey = crypto.randomBytes(encryptionKeyBytes).toString('hex');

// Generate JWT_SECRET (64 bytes = 512 bits for strong JWT signing)
const jwtSecretBytes = 64;
const jwtSecret = crypto.randomBytes(jwtSecretBytes).toString('hex');

console.log('Generated ENCRYPTION_KEY:', encryptionKey);
console.log('Key length:', encryptionKey.length, 'characters (64 hex = 32 bytes = 256 bits)');
console.log('');
console.log('Generated JWT_SECRET:', jwtSecret);
console.log('Key length:', jwtSecret.length, 'characters (128 hex = 64 bytes = 512 bits)');
console.log('');

// Read .env file
const envPath = path.join(__dirname, '..', '.env');
let envContent = '';

if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
  
  // Update or add ENCRYPTION_KEY
  if (envContent.includes('ENCRYPTION_KEY=')) {
    envContent = envContent.replace(
      /^ENCRYPTION_KEY=.*/m,
      `ENCRYPTION_KEY=${encryptionKey}`
    );
    console.log('✅ Updated ENCRYPTION_KEY in .env');
  } else {
    if (!envContent.endsWith('\n')) {
      envContent += '\n';
    }
    envContent += `ENCRYPTION_KEY=${encryptionKey}\n`;
    console.log('✅ Added ENCRYPTION_KEY to .env');
  }
  
  // Update or add JWT_SECRET
  if (envContent.includes('JWT_SECRET=')) {
    envContent = envContent.replace(
      /^JWT_SECRET=.*/m,
      `JWT_SECRET=${jwtSecret}`
    );
    console.log('✅ Updated JWT_SECRET in .env');
  } else {
    if (!envContent.endsWith('\n')) {
      envContent += '\n';
    }
    envContent += `JWT_SECRET=${jwtSecret}\n`;
    console.log('✅ Added JWT_SECRET to .env');
  }
  
  // Write back to file
  fs.writeFileSync(envPath, envContent, 'utf8');
  console.log('');
  console.log('📝 .env file updated successfully!');
} else {
  console.log('⚠️  .env file not found at:', envPath);
  console.log('');
  console.log('Please add these lines to your .env file:');
  console.log(`ENCRYPTION_KEY=${encryptionKey}`);
  console.log(`JWT_SECRET=${jwtSecret}`);
}

console.log('');
console.log('🔒 Security Notes:');
console.log('  - ENCRYPTION_KEY: Used for AES-256-GCM encryption of credentials');
console.log('  - JWT_SECRET: Used for signing and verifying JWT tokens');
console.log('  - Keep these keys secret and never commit them to git');
console.log('  - Use different keys for development and production');
console.log('  - If you lose ENCRYPTION_KEY, encrypted data cannot be decrypted');
console.log('  - If you lose JWT_SECRET, existing JWT tokens will be invalid');
console.log('');

