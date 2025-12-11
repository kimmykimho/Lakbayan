#!/usr/bin/env node

/**
 * Network diagnostics for MongoDB Atlas
 * Run: node scripts/diagnose-network.js
 */

const dns = require('dns');
const net = require('net');

console.log('\n🔍 Running MongoDB Atlas Network Diagnostics...\n');

// Test 1: DNS Resolution
console.log('Test 1: DNS Resolution');
console.log('─'.repeat(50));

dns.resolve('cluster0.cg2tnn6.mongodb.net', 'SRV', (err, addresses) => {
  if (err) {
    console.log('❌ FAILED: Cannot resolve DNS');
    console.log('   Error:', err.code);
    console.log('\n💡 This means:');
    console.log('   - Your network is blocking DNS queries');
    console.log('   - Or you need to use Standard connection instead of SRV\n');
    
    suggestSolutions();
  } else {
    console.log('✅ SUCCESS: DNS resolution works');
    console.log('   Found', addresses.length, 'MongoDB servers\n');
    
    // Test 2: TCP Connection
    testTCPConnection();
  }
});

function testTCPConnection() {
  console.log('Test 2: TCP Connection to MongoDB');
  console.log('─'.repeat(50));
  
  const socket = net.createConnection({
    host: 'cluster0-shard-00-00.cg2tnn6.mongodb.net',
    port: 27017,
    timeout: 5000
  });

  socket.on('connect', () => {
    console.log('✅ SUCCESS: Can connect to MongoDB port 27017');
    socket.end();
    console.log('\n🎉 Network is working! The issue must be:');
    console.log('   1. Incorrect password');
    console.log('   2. IP not whitelisted in Atlas');
    console.log('   3. Database user not set up correctly\n');
    suggestAtlasFixes();
  });

  socket.on('timeout', () => {
    console.log('❌ FAILED: Connection timeout');
    socket.destroy();
    console.log('\n💡 Port 27017 is blocked by firewall\n');
    suggestSolutions();
  });

  socket.on('error', (err) => {
    console.log('❌ FAILED:', err.message);
    console.log('\n💡 Cannot reach MongoDB servers\n');
    suggestSolutions();
  });
}

function suggestSolutions() {
  console.log('🔧 SOLUTIONS:\n');
  console.log('Option 1: Fix Network Issues');
  console.log('─'.repeat(50));
  console.log('1. Disable VPN/Proxy temporarily');
  console.log('2. Try mobile hotspot instead of WiFi');
  console.log('3. Check Windows Firewall settings');
  console.log('4. Try from a different network\n');
  
  console.log('Option 2: Use Standard Connection String (Not SRV)');
  console.log('─'.repeat(50));
  console.log('In MongoDB Atlas:');
  console.log('1. Click "Connect" → "Drivers"');
  console.log('2. Choose "Standard connection string"');
  console.log('3. Copy the mongodb:// URL (not mongodb+srv://)\n');
  
  console.log('Option 3: Install Local MongoDB (RECOMMENDED)');
  console.log('─'.repeat(50));
  console.log('Download: https://www.mongodb.com/try/download/community');
  console.log('Then update .env:');
  console.log('   MONGODB_URI=mongodb://localhost:27017/buenavisit\n');
  
  console.log('Option 4: Try Different DNS');
  console.log('─'.repeat(50));
  console.log('Change DNS to Google DNS:');
  console.log('1. Open Network Settings');
  console.log('2. Change DNS to: 8.8.8.8 and 8.8.4.4\n');
}

function suggestAtlasFixes() {
  console.log('🔧 CHECK MONGODB ATLAS:\n');
  console.log('1. Network Access → Add IP Address → "0.0.0.0/0" (Allow All)');
  console.log('2. Database Access → Verify user "fostanesmarkrenier_db_user" exists');
  console.log('3. Database Access → Click Edit → Update password to "fostanes"');
  console.log('4. Wait 2 minutes for changes to apply');
  console.log('5. Try: npm run check-mongo\n');
}

// Timeout for the whole diagnostic
setTimeout(() => {
  console.log('\n⏱️  Diagnostic timed out\n');
  suggestSolutions();
  process.exit(1);
}, 10000);

