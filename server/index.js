// Load environment variables FIRST before any other imports
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

// Database connection - use Neon for data operations
const { queryOne } = require('./config/neon');

const app = express();

// Handle uncaught errors to prevent crashes
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// CORS configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.CLIENT_URL,
  'https://tj4g10w9-5173.asse.devtunnels.ms'
].filter(Boolean);

// Allow any origin in development for LAN testing
const isDevMode = process.env.NODE_ENV !== 'production';

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: function (origin, callback) {
    // Allow all origins in development for LAN testing
    if (!origin || isDevMode) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('⚠️ CORS blocked origin:', origin);
      callback(null, true);
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', express.static('uploads'));

app.set('trust proxy', 1);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  validate: { xForwardedForHeader: false }
});
app.use('/api/', limiter);

// Test Neon connection and pre-populate cache on startup
(async () => {
  try {
    const result = await queryOne('SELECT current_database() as db');
    console.log('✅ Neon database connected:', result?.db || 'connected');

    // Auto-migration: Create tables if they don't exist, then add missing columns
    const { query } = require('./config/neon');
    try {
      // First, create tables if they don't exist
      await query(`
        CREATE TABLE IF NOT EXISTS business_owners (
          id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id uuid NOT NULL UNIQUE,
          verified boolean DEFAULT false,
          verification_status varchar DEFAULT 'pending',
          documents jsonb DEFAULT '[]',
          business_info jsonb DEFAULT '{}',
          bank_details jsonb DEFAULT '{}',
          statistics jsonb DEFAULT '{}',
          status varchar DEFAULT 'active',
          rejection_reason text,
          approved_by uuid,
          approved_at timestamptz,
          created_at timestamptz DEFAULT NOW(),
          updated_at timestamptz DEFAULT NOW()
        )
      `).catch(() => { });

      await query(`
        CREATE TABLE IF NOT EXISTS drivers (
          id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id uuid NOT NULL UNIQUE,
          verified boolean DEFAULT false,
          verification_status varchar DEFAULT 'pending',
          vehicle jsonb DEFAULT '{}',
          license jsonb DEFAULT '{}',
          documents jsonb DEFAULT '[]',
          rating jsonb DEFAULT '{}',
          availability jsonb DEFAULT '{}',
          location jsonb DEFAULT '{}',
          service_areas jsonb DEFAULT '[]',
          pricing jsonb DEFAULT '{}',
          statistics jsonb DEFAULT '{}',
          status varchar DEFAULT 'offline',
          rejection_reason text,
          approved_by uuid,
          approved_at timestamptz,
          bank_details jsonb DEFAULT '{}',
          created_at timestamptz DEFAULT NOW(),
          updated_at timestamptz DEFAULT NOW()
        )
      `).catch(() => { });

      // Create bookings table if not exists  
      await query(`
        CREATE TABLE IF NOT EXISTS bookings (
          id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id uuid NOT NULL,
          place_id uuid NOT NULL,
          booking_type varchar DEFAULT 'visit',
          visit_date date,
          visit_time varchar,
          number_of_visitors integer DEFAULT 1,
          contact_info jsonb DEFAULT '{}',
          special_requests text,
          transport jsonb DEFAULT '{}',
          status varchar DEFAULT 'pending',
          payment jsonb DEFAULT '{}',
          qr_code text,
          confirmation_code varchar UNIQUE,
          check_in jsonb DEFAULT '{}',
          check_out jsonb DEFAULT '{}',
          notes text,
          cancelled_at timestamptz,
          cancel_reason text,
          created_at timestamptz DEFAULT NOW(),
          updated_at timestamptz DEFAULT NOW()
        )
      `).catch(() => { });

      // Create transport_requests table if not exists
      await query(`
        CREATE TABLE IF NOT EXISTS transport_requests (
          id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id uuid NOT NULL,
          booking_id uuid,
          driver_id uuid,
          vehicle_type varchar,
          pickup jsonb DEFAULT '{}',
          destination jsonb DEFAULT '{}',
          status varchar DEFAULT 'pending',
          fare jsonb DEFAULT '{}',
          passengers integer DEFAULT 1,
          notes text,
          distance numeric DEFAULT 0,
          duration integer DEFAULT 0,
          pickup_time timestamptz,
          dropoff_time timestamptz,
          cancellation_reason text,
          cancelled_by uuid,
          created_at timestamptz DEFAULT NOW(),
          updated_at timestamptz DEFAULT NOW()
        )
      `).catch(() => { });

      console.log('✅ Database migration: Tables verified/created');

      // Add all potentially missing columns to business_owners
      const boMigrations = [
        `ALTER TABLE business_owners ADD COLUMN IF NOT EXISTS business_info jsonb DEFAULT '{}'`,
        `ALTER TABLE business_owners ADD COLUMN IF NOT EXISTS verification_status varchar DEFAULT 'pending'`,
        `ALTER TABLE business_owners ADD COLUMN IF NOT EXISTS verified boolean DEFAULT false`,
        `ALTER TABLE business_owners ADD COLUMN IF NOT EXISTS documents jsonb DEFAULT '[]'`,
        `ALTER TABLE business_owners ADD COLUMN IF NOT EXISTS bank_details jsonb DEFAULT '{}'`,
        `ALTER TABLE business_owners ADD COLUMN IF NOT EXISTS statistics jsonb DEFAULT '{}'`,
        `ALTER TABLE business_owners ADD COLUMN IF NOT EXISTS status varchar DEFAULT 'active'`,
        `ALTER TABLE business_owners ADD COLUMN IF NOT EXISTS rejection_reason text`,
        `ALTER TABLE business_owners ADD COLUMN IF NOT EXISTS approved_by uuid`,
        `ALTER TABLE business_owners ADD COLUMN IF NOT EXISTS approved_at timestamptz`,
        `ALTER TABLE business_owners ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT NOW()`,
        `ALTER TABLE business_owners ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT NOW()`
      ];

      for (const sql of boMigrations) {
        try { await query(sql); } catch (e) { /* column may already exist */ }
      }
      console.log('✅ Database migration: business_owners columns verified');

      // Add all potentially missing columns to drivers table
      const driverMigrations = [
        `ALTER TABLE drivers ADD COLUMN IF NOT EXISTS vehicle jsonb DEFAULT '{}'`,
        `ALTER TABLE drivers ADD COLUMN IF NOT EXISTS license jsonb DEFAULT '{}'`,
        `ALTER TABLE drivers ADD COLUMN IF NOT EXISTS service_areas jsonb DEFAULT '[]'`,
        `ALTER TABLE drivers ADD COLUMN IF NOT EXISTS pricing jsonb DEFAULT '{}'`,
        `ALTER TABLE drivers ADD COLUMN IF NOT EXISTS verification_status varchar DEFAULT 'pending'`,
        `ALTER TABLE drivers ADD COLUMN IF NOT EXISTS status varchar DEFAULT 'offline'`,
        `ALTER TABLE drivers ADD COLUMN IF NOT EXISTS verified boolean DEFAULT false`,
        `ALTER TABLE drivers ADD COLUMN IF NOT EXISTS documents jsonb DEFAULT '[]'`,
        `ALTER TABLE drivers ADD COLUMN IF NOT EXISTS rating jsonb DEFAULT '{}'`,
        `ALTER TABLE drivers ADD COLUMN IF NOT EXISTS availability jsonb DEFAULT '{}'`,
        `ALTER TABLE drivers ADD COLUMN IF NOT EXISTS location jsonb DEFAULT '{}'`,
        `ALTER TABLE drivers ADD COLUMN IF NOT EXISTS statistics jsonb DEFAULT '{}'`,
        `ALTER TABLE drivers ADD COLUMN IF NOT EXISTS bank_details jsonb DEFAULT '{}'`,
        `ALTER TABLE drivers ADD COLUMN IF NOT EXISTS rejection_reason text`,
        `ALTER TABLE drivers ADD COLUMN IF NOT EXISTS approved_by uuid`,
        `ALTER TABLE drivers ADD COLUMN IF NOT EXISTS approved_at timestamptz`,
        `ALTER TABLE drivers ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT NOW()`,
        `ALTER TABLE drivers ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT NOW()`
      ];

      for (const sql of driverMigrations) {
        try { await query(sql); } catch (e) { /* column may already exist */ }
      }
      console.log('✅ Database migration: drivers columns verified');

      // Add all potentially missing columns to bookings table
      const bookingMigrations = [
        `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS confirmation_code varchar`,
        `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_type varchar DEFAULT 'visit'`,
        `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS visit_date date`,
        `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS visit_time varchar`,
        `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS number_of_visitors integer DEFAULT 1`,
        `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS contact_info jsonb DEFAULT '{}'`,
        `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS special_requests text`,
        `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS transport jsonb DEFAULT '{}'`,
        `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS status varchar DEFAULT 'pending'`,
        `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment jsonb DEFAULT '{}'`,
        `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS qr_code text`,
        `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS check_in jsonb DEFAULT '{}'`,
        `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS check_out jsonb DEFAULT '{}'`,
        `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS notes text`,
        `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_at timestamptz`,
        `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancel_reason text`,
        `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT NOW()`,
        `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT NOW()`
      ];

      for (const sql of bookingMigrations) {
        try { await query(sql); } catch (e) { /* column may already exist */ }
      }
      console.log('✅ Database migration: bookings columns verified');

      // Add all potentially missing columns to transport_requests table
      const transportMigrations = [
        `ALTER TABLE transport_requests ADD COLUMN IF NOT EXISTS vehicle_type varchar`,
        `ALTER TABLE transport_requests ADD COLUMN IF NOT EXISTS pickup jsonb DEFAULT '{}'`,
        `ALTER TABLE transport_requests ADD COLUMN IF NOT EXISTS destination jsonb DEFAULT '{}'`,
        `ALTER TABLE transport_requests ADD COLUMN IF NOT EXISTS status varchar DEFAULT 'pending'`,
        `ALTER TABLE transport_requests ADD COLUMN IF NOT EXISTS fare numeric DEFAULT 0`,
        `ALTER TABLE transport_requests ADD COLUMN IF NOT EXISTS passengers integer DEFAULT 1`,
        `ALTER TABLE transport_requests ADD COLUMN IF NOT EXISTS notes text`,
        `ALTER TABLE transport_requests ADD COLUMN IF NOT EXISTS distance numeric DEFAULT 0`,
        `ALTER TABLE transport_requests ADD COLUMN IF NOT EXISTS duration integer DEFAULT 0`,
        `ALTER TABLE transport_requests ADD COLUMN IF NOT EXISTS pickup_time timestamptz`,
        `ALTER TABLE transport_requests ADD COLUMN IF NOT EXISTS dropoff_time timestamptz`,
        `ALTER TABLE transport_requests ADD COLUMN IF NOT EXISTS cancellation_reason text`,
        `ALTER TABLE transport_requests ADD COLUMN IF NOT EXISTS cancelled_by uuid`,
        `ALTER TABLE transport_requests ADD COLUMN IF NOT EXISTS photos jsonb DEFAULT '[]'`,
        `ALTER TABLE transport_requests ADD COLUMN IF NOT EXISTS driver_location jsonb DEFAULT '{}'`,
        `ALTER TABLE transport_requests ADD COLUMN IF NOT EXISTS timeline jsonb DEFAULT '{}'`,
        `ALTER TABLE transport_requests ADD COLUMN IF NOT EXISTS eta jsonb DEFAULT '{}'`,
        `ALTER TABLE transport_requests ADD COLUMN IF NOT EXISTS rating jsonb DEFAULT '{}'`,
        `ALTER TABLE transport_requests ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT NOW()`,
        `ALTER TABLE transport_requests ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT NOW()`
      ];

      for (const sql of transportMigrations) {
        try { await query(sql); } catch (e) { /* column may already exist */ }
      }
      console.log('✅ Database migration: transport_requests columns verified');

      // Add all potentially missing columns to places table
      const placesMigrations = [
        `ALTER TABLE places ADD COLUMN IF NOT EXISTS description text`,
        `ALTER TABLE places ADD COLUMN IF NOT EXISTS contact jsonb DEFAULT '{}'`,
        `ALTER TABLE places ADD COLUMN IF NOT EXISTS hours jsonb DEFAULT '{}'`,
        `ALTER TABLE places ADD COLUMN IF NOT EXISTS pricing jsonb DEFAULT '{}'`,
        `ALTER TABLE places ADD COLUMN IF NOT EXISTS menu jsonb DEFAULT '[]'`,
        `ALTER TABLE places ADD COLUMN IF NOT EXISTS accommodation jsonb DEFAULT '{}'`,
        `ALTER TABLE places ADD COLUMN IF NOT EXISTS shop jsonb DEFAULT '{}'`,
        `ALTER TABLE places ADD COLUMN IF NOT EXISTS entertainment jsonb DEFAULT '{}'`,
        `ALTER TABLE places ADD COLUMN IF NOT EXISTS services jsonb DEFAULT '[]'`,
        `ALTER TABLE places ADD COLUMN IF NOT EXISTS amenities text[] DEFAULT '{}'`,
        `ALTER TABLE places ADD COLUMN IF NOT EXISTS activities text[] DEFAULT '{}'`,
        `ALTER TABLE places ADD COLUMN IF NOT EXISTS highlights text[] DEFAULT '{}'`,
        `ALTER TABLE places ADD COLUMN IF NOT EXISTS best_time_to_visit jsonb DEFAULT '{}'`,
        `ALTER TABLE places ADD COLUMN IF NOT EXISTS accessibility jsonb DEFAULT '{}'`,
        `ALTER TABLE places ADD COLUMN IF NOT EXISTS virtual_tour jsonb DEFAULT '{}'`,
        `ALTER TABLE places ADD COLUMN IF NOT EXISTS owner_id uuid`,
        `ALTER TABLE places ADD COLUMN IF NOT EXISTS created_by uuid`
      ];

      for (const sql of placesMigrations) {
        try { await query(sql); } catch (e) { /* column may already exist */ }
      }
      console.log('✅ Database migration: places columns verified');

      // Add all potentially missing columns to reviews table
      const reviewsMigrations = [
        `ALTER TABLE reviews ADD COLUMN IF NOT EXISTS booking_id uuid`
      ];

      for (const sql of reviewsMigrations) {
        try { await query(sql); } catch (e) { /* column may already exist */ }
      }
      console.log('✅ Database migration: reviews columns verified');

    } catch (migrationError) {
      console.log('⚠️ Migration error:', migrationError.message);
    }

    // Pre-populate cache for instant first load
    const { queryCached } = require('./config/neon');

    // Pre-cache places (with first image only!)
    await queryCached('places:all:false:1',
      `SELECT id, name, slug, category, location, images->>0 as image, rating, visitors, featured, status 
       FROM places WHERE status = 'active' ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [12, 0], 300000);
    console.log('📦 Pre-cached: places');

    // Pre-cache about items (with first image only!)
    await queryCached('about:all',
      `SELECT id, title, slug, short_description, content, images[1] as image, category, order_index, status, created_at 
       FROM about_items WHERE status = 'active' ORDER BY order_index ASC, created_at DESC LIMIT $1`,
      [30], 300000);
    console.log('📦 Pre-cached: about items');

  } catch (err) {
    console.error('❌ Startup error:', err.message);
  }
})();

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/places', require('./routes/places'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/businesses', require('./routes/businesses'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/events', require('./routes/events'));
app.use('/api/transport', require('./routes/transport'));
app.use('/api/transport-requests', require('./routes/transport-requests'));
app.use('/api/favorites', require('./routes/favorites'));
app.use('/api/owners', require('./routes/owners'));
app.use('/api/drivers', require('./routes/drivers'));
app.use('/api/password', require('./routes/password'));
app.use('/api/chatbot', require('./routes/chatbot'));
app.use('/api/about', require('./routes/about'));
app.use('/api', require('./routes/api'));

// Health check using Neon
app.get('/api/health', async (req, res) => {
  try {
    const result = await queryOne('SELECT 1 as ok');
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      database: result ? 'connected' : 'error'
    });
  } catch (err) {
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      database: 'error'
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Express error:', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

const PORT = process.env.PORT || 5000;

// Listen on all interfaces (0.0.0.0) to allow LAN access
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 API: http://localhost:${PORT}/api`);
  console.log(`🗄️ Database: Neon PostgreSQL`);
});

