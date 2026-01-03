/**
 * Neon Database Schema Setup
 * Creates all required tables in Neon
 */

require('dotenv').config();
const { pool, testConnection } = require('./config/neon');
const fs = require('fs');
const path = require('path');

async function setupSchema() {
    console.log('\n🔧 Neon Database Schema Setup\n');

    // Test connection first
    const connected = await testConnection();
    if (!connected) {
        console.error('❌ Cannot connect to Neon. Check DATABASE_URL in .env');
        process.exit(1);
    }

    const client = await pool.connect();

    try {
        // Enable UUID extension
        console.log('📋 Enabling UUID extension...');
        await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

        // Create tables
        console.log('📋 Creating tables...');

        // Users table
        await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255),
        name VARCHAR(255),
        role VARCHAR(50) DEFAULT 'tourist',
        avatar VARCHAR(500),
        phone VARCHAR(50),
        is_active BOOLEAN DEFAULT true,
        last_login TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
        console.log('   ✅ users');

        // Places table
        await client.query(`
      CREATE TABLE IF NOT EXISTS places (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100),
        images JSONB DEFAULT '[]',
        location JSONB,
        contact_info JSONB,
        opening_hours JSONB,
        entry_fee JSONB,
        facilities JSONB DEFAULT '[]',
        activities JSONB DEFAULT '[]',
        rating JSONB DEFAULT '{"average": 0, "count": 0}',
        visitors JSONB DEFAULT '{"total": 0}',
        virtual_tour JSONB,
        status VARCHAR(50) DEFAULT 'active',
        featured BOOLEAN DEFAULT false,
        owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
        console.log('   ✅ places');

        // About items table
        await client.query(`
      CREATE TABLE IF NOT EXISTS about_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        title VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE,
        short_description TEXT,
        content TEXT,
        images JSONB DEFAULT '[]',
        category VARCHAR(100),
        order_index INTEGER DEFAULT 0,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
        console.log('   ✅ about_items');

        // Reviews table
        await client.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        place_id UUID REFERENCES places(id) ON DELETE CASCADE,
        rating INTEGER CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        images JSONB DEFAULT '[]',
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
        console.log('   ✅ reviews');

        // Bookings table
        await client.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        place_id UUID REFERENCES places(id) ON DELETE CASCADE,
        visit_date DATE NOT NULL,
        visit_time TIME,
        number_of_visitors INTEGER DEFAULT 1,
        special_requests TEXT,
        transport JSONB,
        contact_info JSONB,
        status VARCHAR(50) DEFAULT 'pending',
        total_amount DECIMAL(10,2),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
        console.log('   ✅ bookings');

        // Business owners table
        await client.query(`
      CREATE TABLE IF NOT EXISTS business_owners (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        business_name VARCHAR(255),
        business_type VARCHAR(100),
        license_number VARCHAR(100),
        documents JSONB DEFAULT '[]',
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
        console.log('   ✅ business_owners');

        // Drivers table
        await client.query(`
      CREATE TABLE IF NOT EXISTS drivers (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        license_number VARCHAR(100),
        vehicle_type VARCHAR(100),
        vehicle_plate VARCHAR(50),
        vehicle_capacity INTEGER,
        rate_per_km DECIMAL(10,2),
        documents JSONB DEFAULT '[]',
        is_available BOOLEAN DEFAULT true,
        current_location JSONB,
        rating JSONB DEFAULT '{"average": 0, "count": 0}',
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
        console.log('   ✅ drivers');

        // Transport requests table
        await client.query(`
      CREATE TABLE IF NOT EXISTS transport_requests (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
        booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
        pickup_location JSONB,
        dropoff_location JSONB,
        vehicle_type VARCHAR(100),
        scheduled_time TIMESTAMPTZ,
        status VARCHAR(50) DEFAULT 'pending',
        fare DECIMAL(10,2),
        distance DECIMAL(10,2),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
        console.log('   ✅ transport_requests');

        // User favorites table
        await client.query(`
      CREATE TABLE IF NOT EXISTS user_favorites (
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        place_id UUID REFERENCES places(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (user_id, place_id)
      )
    `);
        console.log('   ✅ user_favorites');

        // Create indexes for performance
        console.log('\n📋 Creating indexes...');
        await client.query('CREATE INDEX IF NOT EXISTS idx_places_category ON places(category)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_places_status ON places(status)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_bookings_place ON bookings(place_id)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_reviews_place ON reviews(place_id)');
        console.log('   ✅ All indexes created');

        console.log('\n✅ Schema setup complete!\n');

    } catch (err) {
        console.error('❌ Schema setup error:', err.message);
        throw err;
    } finally {
        client.release();
        await pool.end();
    }
}

setupSchema()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
