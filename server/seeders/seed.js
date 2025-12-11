const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');
const Place = require('../models/Place');
const Business = require('../models/Business');
const Review = require('../models/Review');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/buenavisit')
.then(() => console.log('✅ MongoDB connected'))
.catch((err) => {
  console.error('❌ MongoDB connection error:', err.message);
  console.error('\n💡 Make sure MongoDB is running:');
  console.error('   - Local: Run "mongod" in another terminal');
  console.error('   - Atlas: Check your connection string in .env');
  process.exit(1);
});

// Sample data
const users = [
  {
    name: 'Admin User',
    email: 'admin@buenavisit.com',
    password: 'admin123',
    role: 'admin',
    phone: '+63 912 345 6789'
  },
  {
    name: 'John Tourist',
    email: 'tourist@example.com',
    password: 'password123',
    role: 'tourist',
    phone: '+63 912 345 6790'
  },
  {
    name: 'Business Owner',
    email: 'business@example.com',
    password: 'password123',
    role: 'business',
    phone: '+63 912 345 6791'
  }
];

const places = [
  {
    name: "Manlangit Nature's Park",
    description: "Manlangit Nature Park is one of the most beautiful view deck in Buenavista, Agusan del Norte, Philippines. Experience breathtaking panoramic views and cool mountain breeze.",
    category: 'nature',
    images: [{
      url: '/images/places/manlangit-nature-park/main.jpg',
      caption: 'Panoramic View',
      isPrimary: true
    }],
    location: {
      address: 'Manlangit, Buenavista, Agusan del Sur',
      coordinates: {
        lat: 8.9697,
        lng: 125.4286
      }
    },
    contact: {
      phone: '+63 912 345 6792',
      email: 'manlangit@buenavisit.com'
    },
    pricing: {
      entranceFee: 50,
      isFree: false
    },
    amenities: ['Parking', 'Restrooms', 'View Deck', 'Restaurant'],
    activities: ['Sightseeing', 'Photography', 'Nature Walk'],
    highlights: ['Breathtaking views', 'Cool climate', 'Instagram-worthy spots'],
    rating: {
      average: 4.5,
      count: 245
    },
    visitors: {
      current: 85,
      total: 1500,
      capacity: 200,
      peakHours: {
        weekday: '2PM - 4PM',
        weekend: '10AM - 2PM'
      }
    },
    bestTimeToVisit: {
      season: 'Year-round',
      hours: '6:00 AM - 9:00 AM',
      description: 'Early morning for best views and cooler temperature'
    },
    status: 'active',
    featured: true
  },
  {
    name: 'Masao Public Beach',
    description: 'Popular local beach perfect for family gatherings and weekend relaxation. Enjoy the sun, sand, and sea with your loved ones.',
    category: 'beach',
    images: [{
      url: '/images/places/masao-public-beach/main.jpg',
      caption: 'Beach View',
      isPrimary: true
    }],
    location: {
      address: 'Masao, Buenavista, Agusan del Sur',
      coordinates: {
        lat: 8.9735,
        lng: 125.4310
      }
    },
    pricing: {
      entranceFee: 0,
      isFree: true
    },
    amenities: ['Parking', 'Restrooms', 'Picnic Area', 'Shower Facilities'],
    activities: ['Swimming', 'Beach Volleyball', 'Picnic', 'Photography'],
    highlights: ['Family-friendly', 'Clean facilities', 'Beautiful sunset views'],
    rating: {
      average: 4.3,
      count: 189
    },
    visitors: {
      current: 78,
      total: 1200,
      capacity: 300
    },
    status: 'active',
    featured: true
  },
  {
    name: 'Buenavista Municipal Plaza',
    description: 'The heart of our community featuring the historic town plaza and St. Joseph Parish Church. A perfect blend of history, culture, and community life.',
    category: 'cultural',
    images: [{
      url: '/images/places/municipal-plaza/main.jpg',
      caption: 'Municipal Plaza',
      isPrimary: true
    }],
    location: {
      address: 'Town Proper, Buenavista, Agusan del Sur',
      coordinates: {
        lat: 8.9708,
        lng: 125.4297
      }
    },
    pricing: {
      entranceFee: 0,
      isFree: true
    },
    amenities: ['Parking', 'Benches', 'Lighting', 'WiFi'],
    activities: ['Sightseeing', 'Photography', 'Cultural Tours', 'Evening Walks'],
    highlights: ['Historic landmark', 'Cultural hub', 'Community events'],
    rating: {
      average: 4.5,
      count: 312
    },
    visitors: {
      current: 45,
      total: 980,
      capacity: 500
    },
    status: 'active',
    featured: true
  },
  {
    name: "Andi's SnackBreak Delight",
    description: 'Charming local snack spot in Buenavista, Agusan, serving a variety of Filipino treats and beverages. A must-visit for food lovers!',
    category: 'food',
    images: [{
      url: '/images/places/andis-snackbreak/main.jpg',
      caption: 'Snack Shop',
      isPrimary: true
    }],
    location: {
      address: 'Rizal Avenue, Buenavista, Agusan del Sur',
      coordinates: {
        lat: 8.9715,
        lng: 125.4300
      }
    },
    pricing: {
      entranceFee: 0,
      isFree: true
    },
    amenities: ['Parking', 'WiFi', 'Air Conditioning'],
    activities: ['Snack Tasting', 'Coffee Break', 'Pasalubong Shopping'],
    highlights: ['Authentic Filipino snacks', 'Cozy atmosphere', 'Affordable prices'],
    rating: {
      average: 4.8,
      count: 156
    },
    visitors: {
      current: 23,
      total: 650
    },
    status: 'active'
  }
];

async function seed() {
  try {
    console.log('🌱 Starting database seeding...\n');

    // Clear existing data
    console.log('Clearing existing data...');
    await User.deleteMany({});
    await Place.deleteMany({});
    await Business.deleteMany({});
    await Review.deleteMany({});
    console.log('✅ Data cleared\n');

    // Create users
    console.log('Creating users...');
    const createdUsers = await User.create(users);
    console.log(`✅ Created ${createdUsers.length} users\n`);

    const admin = createdUsers.find(u => u.role === 'admin');

    // Create places
    console.log('Creating places...');
    const placesWithCreator = places.map(place => ({
      ...place,
      createdBy: admin._id
    }));
    const createdPlaces = await Place.create(placesWithCreator);
    console.log(`✅ Created ${createdPlaces.length} places\n`);

    // Create sample business
    console.log('Creating sample business...');
    const businessOwner = createdUsers.find(u => u.role === 'business');
    await Business.create({
      owner: businessOwner._id,
      name: "Andi's SnackBreak Delight",
      type: 'restaurant',
      description: 'Local snack spot serving authentic Filipino treats',
      location: {
        address: 'Rizal Avenue, Buenavista',
        coordinates: {
          lat: 8.9715,
          lng: 125.4300
        }
      },
      contact: {
        phone: '+63 912 345 6793',
        email: 'andis@buenavisit.com'
      },
      revenue: 125000,
      rating: {
        average: 4.8,
        count: 42
      },
      status: 'active'
    });
    console.log('✅ Created sample business\n');

    console.log('✨ Database seeding completed successfully!\n');
    console.log('📝 You can now login with:');
    console.log('   Admin: admin@buenavisit.com / admin123');
    console.log('   Tourist: tourist@example.com / password123\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seed();

