#!/usr/bin/env node

/**
 * Check MongoDB connection
 * Run: node scripts/check-mongo.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/buenavisit';

console.log('\n🔍 Checking MongoDB connection...\n');
console.log(`📍 Connecting to: ${mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')}\n`);

mongoose.connect(mongoUri, {
  serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds
})
.then(() => {
  console.log('✅ SUCCESS! MongoDB is connected and ready.\n');
  console.log('📊 Connection details:');
  console.log(`   Database: ${mongoose.connection.name}`);
  console.log(`   Host: ${mongoose.connection.host}`);
  console.log(`   Port: ${mongoose.connection.port}\n`);
  
  console.log('🎉 You can now run:');
  console.log('   npm run seed    - Seed the database');
  console.log('   npm run dev     - Start the application\n');
  
  mongoose.connection.close();
  process.exit(0);
})
.catch((err) => {
  console.error('❌ FAILED! Cannot connect to MongoDB\n');
  console.error('Error:', err.message);
  console.error('\n💡 Solutions:\n');
  
  if (mongoUri.includes('localhost') || mongoUri.includes('127.0.0.1')) {
    console.error('For LOCAL MongoDB:');
    console.error('   1. Install MongoDB: https://www.mongodb.com/try/download/community');
    console.error('   2. Start MongoDB:');
    console.error('      Windows: Open "Services" → Start "MongoDB Server"');
    console.error('               Or run: "C:\\Program Files\\MongoDB\\Server\\7.0\\bin\\mongod.exe"');
    console.error('      Mac: brew services start mongodb-community');
    console.error('      Linux: sudo systemctl start mongod');
    console.error('   3. Try again: npm run seed\n');
  } else {
    console.error('For MONGODB ATLAS:');
    console.error('   1. Check your connection string in .env');
    console.error('   2. Verify username/password');
    console.error('   3. Whitelist your IP address in Atlas');
    console.error('   4. Make sure cluster is running\n');
  }
  
  console.error('Need MongoDB Atlas? (Free Cloud Database):');
  console.error('   1. Sign up: https://www.mongodb.com/cloud/atlas');
  console.error('   2. Create free cluster (M0)');
  console.error('   3. Get connection string');
  console.error('   4. Update .env: MONGODB_URI=mongodb+srv://...\n');
  
  process.exit(1);
});

