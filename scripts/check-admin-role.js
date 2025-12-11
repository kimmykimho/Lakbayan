const mongoose = require('mongoose');
const admin = require('firebase-admin');
require('dotenv').config();

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    const serviceAccount = require('../serviceAccountKey.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('✅ Firebase Admin initialized\n');
  } catch (error) {
    console.error('❌ Firebase Admin initialization failed:', error.message);
    process.exit(1);
  }
}

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/buenavisit')
.then(() => console.log('✅ MongoDB connected\n'))
.catch((err) => {
  console.error('❌ MongoDB connection error:', err.message);
  process.exit(1);
});

const User = require('../server/models/User');

async function checkAndSetAdminRole() {
  try {
    const email = process.argv[2];
    
    if (!email) {
      console.log('📧 Usage: node scripts/check-admin-role.js <email>');
      console.log('📧 Example: node scripts/check-admin-role.js admin@buenavisit.com\n');
      process.exit(1);
    }

    console.log(`🔍 Checking user: ${email}\n`);

    // Check MongoDB
    console.log('--- MongoDB Check ---');
    const user = await User.findOne({ email });
    
    if (!user) {
      console.log(`❌ User not found in MongoDB: ${email}\n`);
      console.log('💡 Create the user first by logging in to the app\n');
      process.exit(1);
    }
    
    console.log(`✅ User found in MongoDB`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Active: ${user.isActive}\n`);

    // Update role to admin if not already
    if (user.role !== 'admin') {
      console.log(`🔄 Updating role from '${user.role}' to 'admin'...`);
      user.role = 'admin';
      await user.save();
      console.log('✅ MongoDB role updated to admin\n');
    } else {
      console.log('✅ User already has admin role in MongoDB\n');
    }

    // Check Firebase
    console.log('--- Firebase Check ---');
    try {
      const firebaseUser = await admin.auth().getUserByEmail(email);
      console.log(`✅ User found in Firebase`);
      console.log(`   UID: ${firebaseUser.uid}`);
      console.log(`   Email Verified: ${firebaseUser.emailVerified}`);
      
      const currentClaims = firebaseUser.customClaims || {};
      console.log(`   Current Custom Claims:`, currentClaims);
      
      // Set admin custom claim if not already set
      if (currentClaims.role !== 'admin') {
        console.log('\n🔄 Setting Firebase custom claim to admin...');
        await admin.auth().setCustomUserClaims(firebaseUser.uid, {
          ...currentClaims,
          role: 'admin'
        });
        console.log('✅ Firebase custom claims updated\n');
        console.log('⚠️  Important: User must log out and log back in for changes to take effect!\n');
      } else {
        console.log('✅ User already has admin role in Firebase custom claims\n');
      }
    } catch (error) {
      console.log(`❌ User not found in Firebase: ${error.message}`);
      console.log('💡 This is okay if using local MongoDB authentication\n');
    }

    console.log('--- Summary ---');
    console.log('✅ Admin role check and update complete!');
    console.log('\n📝 Next steps:');
    console.log('   1. If Firebase claims were updated, the user must log out and log back in');
    console.log('   2. Try deleting a place again');
    console.log('   3. Check the server console for detailed logs\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkAndSetAdminRole();

