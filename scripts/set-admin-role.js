/**
 * Firebase Admin Role Setup Script
 * 
 * This script sets the custom claim "role: admin" for a Firebase user.
 * Run this script to grant admin privileges to a user account.
 * 
 * Usage:
 *   node scripts/set-admin-role.js <USER_EMAIL>
 * 
 * Example:
 *   node scripts/set-admin-role.js admin@buenavisit.com
 */

const admin = require('firebase-admin');
const readline = require('readline');

// Check if serviceAccountKey.json exists
let serviceAccount;
try {
  serviceAccount = require('../serviceAccountKey.json');
} catch (error) {
  console.error('\n❌ Error: serviceAccountKey.json not found!');
  console.error('\n📝 Please follow these steps:');
  console.error('   1. Go to Firebase Console → Project Settings');
  console.error('   2. Click "Service accounts" tab');
  console.error('   3. Click "Generate new private key"');
  console.error('   4. Save the file as "serviceAccountKey.json" in the project root');
  console.error('   5. Run this script again\n');
  process.exit(1);
}

// Initialize Firebase Admin
try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('✅ Firebase Admin initialized successfully');
} catch (error) {
  console.error('❌ Error initializing Firebase Admin:', error.message);
  process.exit(1);
}

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Get user by email and set admin role
 */
async function setAdminRole(email) {
  try {
    // Get user by email
    console.log(`\n🔍 Looking up user: ${email}...`);
    const user = await admin.auth().getUserByEmail(email);
    
    console.log(`✅ User found!`);
    console.log(`   UID: ${user.uid}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Display Name: ${user.displayName || 'Not set'}`);
    
    // Check current claims
    const currentClaims = user.customClaims || {};
    console.log(`   Current claims:`, currentClaims);
    
    if (currentClaims.role === 'admin') {
      console.log('\n⚠️  User already has admin role!');
      rl.question('\n❓ Do you want to refresh the admin claim anyway? (yes/no): ', async (answer) => {
        if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
          await applyAdminClaim(user.uid);
        } else {
          console.log('\n✅ No changes made.');
          rl.close();
          process.exit(0);
        }
      });
    } else {
      rl.question(`\n❓ Grant admin role to ${email}? (yes/no): `, async (answer) => {
        if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
          await applyAdminClaim(user.uid);
        } else {
          console.log('\n❌ Operation cancelled.');
          rl.close();
          process.exit(0);
        }
      });
    }
    
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      console.error(`\n❌ User not found: ${email}`);
      console.error('\n💡 Make sure the user has signed up first!');
      console.error('   1. Go to your app and create an account with this email');
      console.error('   2. Run this script again\n');
    } else {
      console.error('\n❌ Error:', error.message);
    }
    rl.close();
    process.exit(1);
  }
}

/**
 * Apply admin claim to user
 */
async function applyAdminClaim(uid) {
  try {
    // Set custom claims
    await admin.auth().setCustomUserClaims(uid, { role: 'admin' });
    console.log('\n✅ Admin role granted successfully!');
    
    // Verify the claim was set
    const updatedUser = await admin.auth().getUser(uid);
    console.log('   Updated claims:', updatedUser.customClaims);
    
    console.log('\n📋 Next Steps:');
    console.log('   1. The user needs to sign out and sign in again');
    console.log('   2. Or, refresh their token in the app');
    console.log('   3. They will now have access to admin features\n');
    
    console.log('💡 To verify in the app:');
    console.log('   - User should see admin menu/dashboard');
    console.log('   - Check browser console for token claims\n');
    
    rl.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error setting admin claim:', error.message);
    rl.close();
    process.exit(1);
  }
}

/**
 * List all users (helpful for finding emails)
 */
async function listUsers() {
  try {
    console.log('\n📋 Fetching users...\n');
    const listUsersResult = await admin.auth().listUsers(10);
    
    if (listUsersResult.users.length === 0) {
      console.log('No users found in Firebase Authentication.');
      console.log('Create a user account first by signing up in your app.\n');
      rl.close();
      process.exit(0);
    }
    
    console.log(`Found ${listUsersResult.users.length} user(s):\n`);
    listUsersResult.users.forEach((user, index) => {
      const role = user.customClaims?.role || 'tourist';
      console.log(`${index + 1}. ${user.email}`);
      console.log(`   UID: ${user.uid}`);
      console.log(`   Role: ${role}`);
      console.log(`   Name: ${user.displayName || 'Not set'}`);
      console.log('');
    });
    
    rl.question('Enter the email of the user you want to make admin: ', (email) => {
      if (email && email.includes('@')) {
        setAdminRole(email.trim());
      } else {
        console.log('\n❌ Invalid email. Please try again.\n');
        rl.close();
        process.exit(1);
      }
    });
    
  } catch (error) {
    console.error('❌ Error listing users:', error.message);
    rl.close();
    process.exit(1);
  }
}

// Main execution
console.log('\n🔥 Firebase Admin Role Setup');
console.log('================================\n');

const email = process.argv[2];

if (email) {
  // Email provided as argument
  if (email.includes('@')) {
    setAdminRole(email.trim());
  } else {
    console.error('❌ Invalid email format. Please provide a valid email.\n');
    console.error('Usage: node scripts/set-admin-role.js <USER_EMAIL>');
    console.error('Example: node scripts/set-admin-role.js admin@buenavisit.com\n');
    process.exit(1);
  }
} else {
  // No email provided, list users to choose from
  console.log('No email provided. Listing all users...\n');
  listUsers();
}


