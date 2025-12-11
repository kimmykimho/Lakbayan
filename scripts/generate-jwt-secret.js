#!/usr/bin/env node

/**
 * Generate a secure JWT secret
 * Run: node scripts/generate-jwt-secret.js
 */

const crypto = require('crypto');

// Generate a secure random secret (64 bytes = 512 bits)
const secret = crypto.randomBytes(64).toString('hex');

console.log('\n🔐 JWT Secret Generated!\n');
console.log('Copy this to your .env file:\n');
console.log('─'.repeat(130));
console.log(`JWT_SECRET=${secret}`);
console.log('─'.repeat(130));
console.log('\n✅ This is a cryptographically secure random secret.\n');
console.log('💡 You can also generate one quickly using:\n');
console.log('   node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"\n');

