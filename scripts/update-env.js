#!/usr/bin/env node
/**
 * Update .env file with missing variables from env.example
 * Adds missing variables with placeholder values
 * 
 * Usage:
 *   node scripts/update-env.js
 */

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
const envExamplePath = path.join(__dirname, '..', 'env.example');

console.log('📝 Updating .env file...\n');

// Check if files exist
if (!fs.existsSync(envExamplePath)) {
  console.log('❌ env.example not found!');
  process.exit(1);
}

if (!fs.existsSync(envPath)) {
  console.log('⚠️  .env file not found. Creating from env.example...');
  fs.copyFileSync(envExamplePath, envPath);
  console.log('✅ .env file created from env.example\n');
  process.exit(0);
}

// Read both files
let envContent = fs.readFileSync(envPath, 'utf8');
const envExampleContent = fs.readFileSync(envExamplePath, 'utf8');

// Extract variables from env.example
const exampleVars = {};
const exampleLines = envExampleContent.split('\n');

exampleLines.forEach((line) => {
  // Match lines like: VAR_NAME=value or VAR_NAME=value # comment
  const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*?)(\s*#.*)?$/);
  if (match) {
    const varName = match[1];
    const varValue = match[2].trim();
    exampleVars[varName] = varValue;
  }
});

// Extract existing variables from .env
const existingVars = {};
const envLines = envContent.split('\n');

envLines.forEach((line) => {
  const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*?)(\s*#.*)?$/);
  if (match) {
    const varName = match[1];
    const varValue = match[2].trim();
    existingVars[varName] = varValue;
  }
});

// Find missing variables
const missingVars = [];
Object.keys(exampleVars).forEach((varName) => {
  if (!existingVars[varName]) {
    missingVars.push({ name: varName, value: exampleVars[varName] });
  }
});

if (missingVars.length === 0) {
  console.log('✅ All variables from env.example are already in .env\n');
  process.exit(0);
}

console.log(`Found ${missingVars.length} missing variable(s):\n`);

// Add missing variables
missingVars.forEach(({ name, value }) => {
  console.log(`  + ${name}=${value}`);
  
  // Append to .env file
  if (!envContent.endsWith('\n')) {
    envContent += '\n';
  }
  envContent += `${name}=${value}\n`;
});

// Write updated content
fs.writeFileSync(envPath, envContent, 'utf8');

console.log('\n✅ .env file updated successfully!');
console.log('\n⚠️  Please review and update the placeholder values with your actual configuration.\n');

