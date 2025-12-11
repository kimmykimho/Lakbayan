#!/usr/bin/env node

/**
 * Interactive .env file setup
 * Run: node scripts/setup-env.js
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function setup() {
  console.log('\n🚀 BuenaVisit Environment Setup\n');
  console.log('This will help you create a .env file with all required settings.\n');

  // Check if .env already exists
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const overwrite = await question('⚠️  .env file already exists. Overwrite? (y/N): ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('\n❌ Setup cancelled.');
      rl.close();
      return;
    }
  }

  // Collect configuration
  console.log('\n📝 Server Configuration:\n');
  
  const port = await question('Port (default: 5000): ') || '5000';
  const nodeEnv = await question('Environment (development/production, default: development): ') || 'development';
  
  console.log('\n📊 Database Configuration:\n');
  console.log('Options:');
  console.log('  1. Local MongoDB: mongodb://localhost:27017/buenavisit');
  console.log('  2. MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/buenavisit');
  console.log('  3. Custom connection string\n');
  
  const dbChoice = await question('Choose option (1/2/3): ');
  let mongoUri;
  
  if (dbChoice === '2') {
    console.log('\nTo get MongoDB Atlas connection string:');
    console.log('1. Sign up at https://www.mongodb.com/cloud/atlas');
    console.log('2. Create a free cluster');
    console.log('3. Click "Connect" → "Connect your application"');
    console.log('4. Copy the connection string\n');
    mongoUri = await question('Enter MongoDB Atlas connection string: ');
  } else if (dbChoice === '3') {
    mongoUri = await question('Enter custom MongoDB URI: ');
  } else {
    mongoUri = 'mongodb://localhost:27017/buenavisit';
  }

  console.log('\n🔐 Security Configuration:\n');
  
  const generateSecret = await question('Generate JWT secret automatically? (Y/n): ');
  let jwtSecret;
  
  if (generateSecret.toLowerCase() === 'n') {
    jwtSecret = await question('Enter JWT secret: ');
  } else {
    jwtSecret = crypto.randomBytes(64).toString('hex');
    console.log('✅ Generated secure JWT secret');
  }

  const jwtExpire = await question('JWT expiration (default: 7d): ') || '7d';

  console.log('\n🌐 Client Configuration:\n');
  const clientUrl = await question('Client URL (default: http://localhost:5173): ') || 'http://localhost:5173';

  // Create .env content
  const envContent = `# Server Configuration
PORT=${port}
NODE_ENV=${nodeEnv}

# Database
MONGODB_URI=${mongoUri}

# JWT Configuration
JWT_SECRET=${jwtSecret}
JWT_EXPIRE=${jwtExpire}

# Client URL
CLIENT_URL=${clientUrl}

# File Upload Configuration
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads

# Optional: Email Configuration (for notifications)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=your-app-password

# Optional: API Keys
# WEATHER_API_KEY=
# MAPS_API_KEY=
`;

  // Write .env file
  fs.writeFileSync(envPath, envContent);

  console.log('\n✅ .env file created successfully!\n');
  console.log('📄 File location:', envPath);
  console.log('\n🔐 Your JWT Secret:');
  console.log('─'.repeat(130));
  console.log(jwtSecret);
  console.log('─'.repeat(130));
  console.log('\n⚠️  IMPORTANT: Keep this secret safe and never commit it to version control!\n');
  
  console.log('🎯 Next steps:');
  console.log('1. Review your .env file');
  if (dbChoice === '1') {
    console.log('2. Make sure MongoDB is running: mongod');
  }
  console.log('3. Seed the database: npm run seed');
  console.log('4. Start the application: npm run dev\n');

  rl.close();
}

setup().catch(error => {
  console.error('❌ Error:', error.message);
  rl.close();
  process.exit(1);
});

