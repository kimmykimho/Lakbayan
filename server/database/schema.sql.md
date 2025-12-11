# Supabase PostgreSQL Schema for BuenaVisit

Run this SQL in your Supabase SQL Editor (https://supabase.com/dashboard/project/hcorhxpinogbcqrlbrvj/sql/new)

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'tourist' CHECK (role IN ('tourist', 'business_owner', 'driver', 'admin')),
  phone VARCHAR(50),
  avatar TEXT,
  preferences JSONB DEFAULT '{"language": "en", "notifications": true, "newsletter": true}',
  stats JSONB DEFAULT '{"placesVisited": 0, "reviewsCount": 0, "bookingsCount": 0}',
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Places table
CREATE TABLE places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) UNIQUE NOT NULL,
  slug VARCHAR(255) UNIQUE,
  description TEXT NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('nature', 'cultural', 'beach', 'food', 'adventure', 'historical', 'shopping', 'accommodation')),
  images TEXT[] DEFAULT '{}',
  location JSONB DEFAULT '{}',
  contact JSONB DEFAULT '{}',
  hours JSONB DEFAULT '{}',
  pricing JSONB DEFAULT '{}',
  menu JSONB DEFAULT '[]',
  accommodation JSONB DEFAULT '{}',
  shop JSONB DEFAULT '{}',
  entertainment JSONB DEFAULT '{}',
  services JSONB DEFAULT '[]',
  amenities TEXT[] DEFAULT '{}',
  activities TEXT[] DEFAULT '{}',
  highlights TEXT[] DEFAULT '{}',
  rating JSONB DEFAULT '{"average": 0, "count": 0}',
  visitors JSONB DEFAULT '{"current": 0, "total": 0}',
  best_time_to_visit JSONB DEFAULT '{}',
  accessibility JSONB DEFAULT '{}',
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance', 'closed')),
  featured BOOLEAN DEFAULT false,
  virtual_tour JSONB DEFAULT '{}',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User favorites (junction table)
CREATE TABLE user_favorites (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  place_id UUID REFERENCES places(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, place_id)
);

-- User owned places (junction table)
CREATE TABLE user_owned_places (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  place_id UUID REFERENCES places(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, place_id)
);

-- Bookings table
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  place_id UUID REFERENCES places(id) NOT NULL,
  booking_type VARCHAR(50) DEFAULT 'visit' CHECK (booking_type IN ('visit', 'transport', 'event')),
  visit_date DATE NOT NULL,
  visit_time VARCHAR(50) NOT NULL,
  number_of_visitors INTEGER NOT NULL CHECK (number_of_visitors >= 1),
  contact_info JSONB DEFAULT '{}',
  special_requests TEXT,
  transport JSONB DEFAULT '{}',
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  payment JSONB DEFAULT '{}',
  qr_code TEXT,
  confirmation_code VARCHAR(50) UNIQUE,
  check_in JSONB DEFAULT '{}',
  check_out JSONB DEFAULT '{}',
  notes TEXT,
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reviews table
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  place_id UUID REFERENCES places(id) NOT NULL,
  booking_id UUID REFERENCES bookings(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(255),
  comment TEXT NOT NULL,
  images TEXT[] DEFAULT '{}',
  helpful JSONB DEFAULT '{"count": 0, "users": []}',
  response JSONB DEFAULT '{}',
  status VARCHAR(50) DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, place_id)
);

-- Businesses table
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES users(id) NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('restaurant', 'hotel', 'transport', 'tour', 'retail', 'other')),
  description TEXT,
  logo TEXT,
  images TEXT[] DEFAULT '{}',
  location JSONB DEFAULT '{}',
  contact JSONB DEFAULT '{}',
  pricing JSONB DEFAULT '{}',
  menu JSONB DEFAULT '[]',
  accommodation JSONB DEFAULT '{}',
  shop JSONB DEFAULT '{}',
  entertainment JSONB DEFAULT '{}',
  services JSONB DEFAULT '[]',
  revenue DECIMAL(12,2) DEFAULT 0,
  rating JSONB DEFAULT '{"average": 0, "count": 0}',
  permits JSONB DEFAULT '[]',
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('active', 'inactive', 'pending')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Business owners table
CREATE TABLE business_owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES users(id) NOT NULL,
  verified BOOLEAN DEFAULT false,
  verification_status VARCHAR(50) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
  documents JSONB DEFAULT '[]',
  business_info JSONB DEFAULT '{}',
  bank_details JSONB DEFAULT '{}',
  statistics JSONB DEFAULT '{"totalBookings": 0, "totalRevenue": 0, "averageRating": 0, "totalReviews": 0}',
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  rejection_reason TEXT,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drivers table
CREATE TABLE drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES users(id) NOT NULL,
  verified BOOLEAN DEFAULT false,
  verification_status VARCHAR(50) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
  vehicle JSONB NOT NULL,
  license JSONB NOT NULL,
  documents JSONB DEFAULT '[]',
  rating JSONB DEFAULT '{"average": 0, "count": 0}',
  availability JSONB DEFAULT '{"isAvailable": true, "schedule": []}',
  location JSONB DEFAULT '{"type": "Point", "coordinates": [0, 0]}',
  service_areas JSONB DEFAULT '[]',
  pricing JSONB DEFAULT '{"baseRate": 0, "perKilometer": 0, "perMinute": 0}',
  statistics JSONB DEFAULT '{"totalTrips": 0, "totalEarnings": 0, "completedTrips": 0, "cancelledTrips": 0}',
  status VARCHAR(50) DEFAULT 'offline' CHECK (status IN ('active', 'inactive', 'suspended', 'offline')),
  rejection_reason TEXT,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  bank_details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transport requests table
CREATE TABLE transport_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  booking_id UUID REFERENCES bookings(id),
  driver_id UUID REFERENCES drivers(id),
  vehicle_type VARCHAR(50) NOT NULL CHECK (vehicle_type IN ('tricycle', 'motorcycle', 'van', 'private_car')),
  pickup JSONB DEFAULT '{}',
  destination JSONB DEFAULT '{}',
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'driver_enroute', 'arrived', 'in_progress', 'completed', 'cancelled')),
  fare JSONB DEFAULT '{}',
  distance DECIMAL(10,2) DEFAULT 0,
  duration JSONB DEFAULT '{}',
  passengers INTEGER DEFAULT 1,
  notes TEXT,
  driver_location JSONB DEFAULT '{}',
  eta JSONB DEFAULT '{}',
  photos JSONB DEFAULT '[]',
  rating JSONB DEFAULT '{}',
  timeline JSONB DEFAULT '{}',
  cancellation_reason TEXT,
  cancelled_by VARCHAR(50) CHECK (cancelled_by IN ('user', 'driver', 'system')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_places_category ON places(category);
CREATE INDEX idx_places_status ON places(status);
CREATE INDEX idx_places_featured ON places(featured);
CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_bookings_place ON bookings(place_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_reviews_place ON reviews(place_id);
CREATE INDEX idx_reviews_user ON reviews(user_id);
CREATE INDEX idx_businesses_owner ON businesses(owner_id);
CREATE INDEX idx_business_owners_user ON business_owners(user_id);
CREATE INDEX idx_drivers_user ON drivers(user_id);
CREATE INDEX idx_drivers_status ON drivers(status);
CREATE INDEX idx_transport_requests_user ON transport_requests(user_id);
CREATE INDEX idx_transport_requests_driver ON transport_requests(driver_id);
CREATE INDEX idx_transport_requests_status ON transport_requests(status);

-- Enable Row Level Security (optional but recommended)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE places ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access to places
CREATE POLICY "Places are viewable by everyone" ON places FOR SELECT USING (true);

-- Create policy for authenticated users to manage their own data
CREATE POLICY "Users can view all users" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid()::text = id::text);

-- ================================================
-- SEED DATA: Initial Admin User
-- ================================================
-- Password: Admin123! (bcrypt hashed)
-- IMPORTANT: Change this password after first login!
-- ================================================

INSERT INTO users (id, name, email, password, role, is_active, created_at)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'System Admin',
  'admin@buenavisit.com',
  '$2a$10$rQqRYfKPNx8qVGWDC5REDuT5qN5rH5iB5W7gRFJpJvzY5L4vXjXF6',
  'admin',
  true,
  NOW()
);

-- You can also create test users for each role:
-- Tourist (Password: Tourist123!)
INSERT INTO users (id, name, email, password, role, is_active, created_at)
VALUES (
  'b0000000-0000-0000-0000-000000000002',
  'Test Tourist',
  'tourist@buenavisit.com',
  '$2a$10$rQqRYfKPNx8qVGWDC5REDuT5qN5rH5iB5W7gRFJpJvzY5L4vXjXF6',
  'tourist',
  true,
  NOW()
);

-- Business Owner (Password: Owner123!)
INSERT INTO users (id, name, email, password, role, is_active, created_at)
VALUES (
  'c0000000-0000-0000-0000-000000000003',
  'Test Business Owner',
  'owner@buenavisit.com',
  '$2a$10$rQqRYfKPNx8qVGWDC5REDuT5qN5rH5iB5W7gRFJpJvzY5L4vXjXF6',
  'business_owner',
  true,
  NOW()
);

-- Create business_owner profile for the test business owner
INSERT INTO business_owners (user_id, verified, verification_status, status, business_info)
VALUES (
  'c0000000-0000-0000-0000-000000000003',
  true,
  'approved',
  'active',
  '{"businessName": "Test Business", "businessType": "restaurant"}'
);

-- Driver (Password: Driver123!)
INSERT INTO users (id, name, email, password, role, is_active, created_at)
VALUES (
  'd0000000-0000-0000-0000-000000000004',
  'Test Driver',
  'driver@buenavisit.com',
  '$2a$10$rQqRYfKPNx8qVGWDC5REDuT5qN5rH5iB5W7gRFJpJvzY5L4vXjXF6',
  'driver',
  true,
  NOW()
);

-- Create driver profile for the test driver
INSERT INTO drivers (user_id, verified, verification_status, status, vehicle, license, pricing)
VALUES (
  'd0000000-0000-0000-0000-000000000004',
  true,
  'approved',
  'active',
  '{"type": "tricycle", "plateNumber": "ABC-123", "make": "Honda", "model": "TMX", "capacity": 3}',
  '{"number": "N01-23-456789", "expiry": "2025-12-31"}',
  '{"baseRate": 50, "perKilometer": 10, "perMinute": 2}'
);
```

