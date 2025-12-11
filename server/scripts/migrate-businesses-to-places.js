/**
 * Migration Script: Merge Businesses into Places
 * This script moves all businesses from the Business collection to the Place collection
 * and updates all references
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Business = require('../models/Business');
const Place = require('../models/Place');
const User = require('../models/User');

const categoryMap = {
  restaurant: 'food',
  hotel: 'accommodation',
  retail: 'shopping',
  tour: 'adventure',
  transport: 'cultural',
  other: 'cultural'
};

async function migrateBusinessesToPlaces() {
  try {
    console.log('🚀 Starting migration: Businesses → Places');
    console.log('📡 Connecting to MongoDB...');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all businesses
    const businesses = await Business.find().populate('owner');
    console.log(`📊 Found ${businesses.length} businesses to migrate\n`);

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const business of businesses) {
      try {
        console.log(`\n📦 Migrating: ${business.name}`);

        // Check if already exists
        const exists = await Place.findOne({ name: business.name });
        if (exists) {
          console.log(`⏭️  Skipped: Already exists as place`);
          skipped++;
          continue;
        }

        // Create place from business
        const placeData = {
          name: business.name,
          description: business.description || `A ${business.type} in Buenavista`,
          category: categoryMap[business.type] || 'cultural',
          images: business.images || [],
          location: {
            address: business.location?.address || '',
            coordinates: {
              lat: business.location?.coordinates?.lat || 8.9600,
              lng: business.location?.coordinates?.lng || 125.4300
            },
            municipality: 'Buenavista',
            province: 'Agusan del Sur'
          },
          contact: business.contact || {},
          pricing: {
            entranceFee: business.pricing?.entranceFee || 0,
            adult: business.pricing?.adult || 0,
            child: business.pricing?.child || 0,
            senior: business.pricing?.senior || 0,
            pricePerNight: business.pricing?.pricePerNight || 0,
            currency: 'PHP',
            isFree: business.pricing?.isFree !== false ? false : true
          },
          menu: business.menu || [],
          accommodation: business.accommodation || {},
          shop: business.shop || {},
          entertainment: business.entertainment || {},
          services: business.services || [],
          rating: business.rating || { average: 0, count: 0 },
          status: business.status || 'active',
          featured: business.featured || false,
          createdBy: business.owner
        };

        const newPlace = await Place.create(placeData);
        console.log(`✅ Created place: ${newPlace.name}`);

        // Update user's ownedPlaces
        if (business.owner) {
          const user = await User.findById(business.owner);
          if (user) {
            if (!user.ownedPlaces) user.ownedPlaces = [];
            if (!user.ownedPlaces.includes(newPlace._id)) {
              user.ownedPlaces.push(newPlace._id);
              await user.save();
              console.log(`  ↳ Updated user: ${user.email}`);
            }
          }
        }

        migrated++;
      } catch (error) {
        console.error(`❌ Error migrating ${business.name}:`, error.message);
        errors++;
      }
    }

    console.log(`\n
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 MIGRATION SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Migrated:  ${migrated} businesses
⏭️  Skipped:   ${skipped} (already exist)
❌ Errors:    ${errors}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

    if (migrated > 0) {
      console.log('✅ Migration completed successfully!');
      console.log('\n⚠️  IMPORTANT: You can now safely delete the Business collection');
      console.log('   Run: db.businesses.drop() in MongoDB');
    } else {
      console.log('ℹ️  No new migrations needed');
    }

    await mongoose.connection.close();
    console.log('\n👋 Disconnected from MongoDB');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run migration
migrateBusinessesToPlaces();

