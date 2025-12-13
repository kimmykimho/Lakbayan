-- LAKBAYAN SA KITCHARAO - Complete Database Schema
-- Run this in new Supabase project (SQL Editor)
-- Order matters for foreign key constraints!

-- 1. USERS TABLE (No dependencies)
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  email character varying NOT NULL UNIQUE,
  password character varying NOT NULL,
  role character varying DEFAULT 'tourist'::character varying CHECK (role::text = ANY (ARRAY['tourist'::character varying, 'business_owner'::character varying, 'driver'::character varying, 'admin'::character varying]::text[])),
  phone character varying,
  avatar text,
  preferences jsonb DEFAULT '{"language": "en", "newsletter": true, "notifications": true}'::jsonb,
  stats jsonb DEFAULT '{"reviewsCount": 0, "bookingsCount": 0, "placesVisited": 0}'::jsonb,
  is_active boolean DEFAULT true,
  last_login timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id)
);

-- 2. PLACES TABLE (References users)
CREATE TABLE public.places (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL UNIQUE,
  slug character varying UNIQUE,
  description text NOT NULL,
  category character varying NOT NULL CHECK (category::text = ANY (ARRAY['nature'::character varying, 'cultural'::character varying, 'beach'::character varying, 'food'::character varying, 'adventure'::character varying, 'historical'::character varying, 'shopping'::character varying, 'accommodation'::character varying]::text[])),
  images text[] DEFAULT '{}'::text[],
  location jsonb DEFAULT '{}'::jsonb,
  contact jsonb DEFAULT '{}'::jsonb,
  hours jsonb DEFAULT '{}'::jsonb,
  pricing jsonb DEFAULT '{}'::jsonb,
  menu jsonb DEFAULT '[]'::jsonb,
  accommodation jsonb DEFAULT '{}'::jsonb,
  shop jsonb DEFAULT '{}'::jsonb,
  entertainment jsonb DEFAULT '{}'::jsonb,
  services jsonb DEFAULT '[]'::jsonb,
  amenities text[] DEFAULT '{}'::text[],
  activities text[] DEFAULT '{}'::text[],
  highlights text[] DEFAULT '{}'::text[],
  rating jsonb DEFAULT '{"count": 0, "average": 0}'::jsonb,
  visitors jsonb DEFAULT '{"total": 0, "current": 0}'::jsonb,
  best_time_to_visit jsonb DEFAULT '{}'::jsonb,
  accessibility jsonb DEFAULT '{}'::jsonb,
  status character varying DEFAULT 'active'::character varying CHECK (status::text = ANY (ARRAY['active'::character varying, 'inactive'::character varying, 'maintenance'::character varying, 'closed'::character varying]::text[])),
  featured boolean DEFAULT false,
  virtual_tour jsonb DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT places_pkey PRIMARY KEY (id),
  CONSTRAINT places_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);

-- 3. ABOUT_ITEMS TABLE (No dependencies)
CREATE TABLE public.about_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title character varying NOT NULL,
  slug character varying NOT NULL UNIQUE,
  description text NOT NULL,
  images text[] DEFAULT '{}'::text[],
  video_urls text[] DEFAULT '{}'::text[],
  external_links jsonb DEFAULT '[]'::jsonb,
  category character varying DEFAULT 'heritage'::character varying,
  featured boolean DEFAULT false,
  status character varying DEFAULT 'active'::character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  event_date jsonb,
  CONSTRAINT about_items_pkey PRIMARY KEY (id)
);

-- 4. BUSINESS_OWNERS TABLE (References users)
CREATE TABLE public.business_owners (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  verified boolean DEFAULT false,
  verification_status character varying DEFAULT 'pending'::character varying CHECK (verification_status::text = ANY (ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying]::text[])),
  documents jsonb DEFAULT '[]'::jsonb,
  business_info jsonb DEFAULT '{}'::jsonb,
  bank_details jsonb DEFAULT '{}'::jsonb,
  statistics jsonb DEFAULT '{"totalRevenue": 0, "totalReviews": 0, "averageRating": 0, "totalBookings": 0}'::jsonb,
  status character varying DEFAULT 'active'::character varying CHECK (status::text = ANY (ARRAY['active'::character varying, 'inactive'::character varying, 'suspended'::character varying]::text[])),
  rejection_reason text,
  approved_by uuid,
  approved_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT business_owners_pkey PRIMARY KEY (id),
  CONSTRAINT business_owners_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT business_owners_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id)
);

-- 5. BUSINESSES TABLE (References users)
CREATE TABLE public.businesses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name character varying NOT NULL,
  type character varying NOT NULL CHECK (type::text = ANY (ARRAY['restaurant'::character varying, 'hotel'::character varying, 'transport'::character varying, 'tour'::character varying, 'retail'::character varying, 'other'::character varying]::text[])),
  description text,
  logo text,
  images text[] DEFAULT '{}'::text[],
  location jsonb DEFAULT '{}'::jsonb,
  contact jsonb DEFAULT '{}'::jsonb,
  pricing jsonb DEFAULT '{}'::jsonb,
  menu jsonb DEFAULT '[]'::jsonb,
  accommodation jsonb DEFAULT '{}'::jsonb,
  shop jsonb DEFAULT '{}'::jsonb,
  entertainment jsonb DEFAULT '{}'::jsonb,
  services jsonb DEFAULT '[]'::jsonb,
  revenue numeric DEFAULT 0,
  rating jsonb DEFAULT '{"count": 0, "average": 0}'::jsonb,
  permits jsonb DEFAULT '[]'::jsonb,
  status character varying DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['active'::character varying, 'inactive'::character varying, 'pending'::character varying]::text[])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT businesses_pkey PRIMARY KEY (id),
  CONSTRAINT businesses_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id)
);

-- 6. DRIVERS TABLE (References users)
CREATE TABLE public.drivers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  verified boolean DEFAULT false,
  verification_status character varying DEFAULT 'pending'::character varying CHECK (verification_status::text = ANY (ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying]::text[])),
  vehicle jsonb NOT NULL,
  license jsonb NOT NULL,
  documents jsonb DEFAULT '[]'::jsonb,
  rating jsonb DEFAULT '{"count": 0, "average": 0}'::jsonb,
  availability jsonb DEFAULT '{"schedule": [], "isAvailable": true}'::jsonb,
  location jsonb DEFAULT '{"type": "Point", "coordinates": [0, 0]}'::jsonb,
  service_areas jsonb DEFAULT '[]'::jsonb,
  pricing jsonb DEFAULT '{"baseRate": 0, "perMinute": 0, "perKilometer": 0}'::jsonb,
  statistics jsonb DEFAULT '{"totalTrips": 0, "totalEarnings": 0, "cancelledTrips": 0, "completedTrips": 0}'::jsonb,
  status character varying DEFAULT 'offline'::character varying CHECK (status::text = ANY (ARRAY['active'::character varying, 'inactive'::character varying, 'suspended'::character varying, 'offline'::character varying]::text[])),
  rejection_reason text,
  approved_by uuid,
  approved_at timestamp with time zone,
  bank_details jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT drivers_pkey PRIMARY KEY (id),
  CONSTRAINT drivers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT drivers_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id)
);

-- 7. BOOKINGS TABLE (References users, places)
CREATE TABLE public.bookings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  place_id uuid NOT NULL,
  booking_type character varying DEFAULT 'visit'::character varying CHECK (booking_type::text = ANY (ARRAY['visit'::character varying, 'transport'::character varying, 'event'::character varying]::text[])),
  visit_date date NOT NULL,
  visit_time character varying NOT NULL,
  number_of_visitors integer NOT NULL CHECK (number_of_visitors >= 1),
  contact_info jsonb DEFAULT '{}'::jsonb,
  special_requests text,
  transport jsonb DEFAULT '{}'::jsonb,
  status character varying DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying, 'confirmed'::character varying, 'cancelled'::character varying, 'completed'::character varying]::text[])),
  payment jsonb DEFAULT '{}'::jsonb,
  qr_code text,
  confirmation_code character varying UNIQUE,
  check_in jsonb DEFAULT '{}'::jsonb,
  check_out jsonb DEFAULT '{}'::jsonb,
  notes text,
  cancelled_at timestamp with time zone,
  cancel_reason text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT bookings_pkey PRIMARY KEY (id),
  CONSTRAINT bookings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT bookings_place_id_fkey FOREIGN KEY (place_id) REFERENCES public.places(id)
);

-- 8. REVIEWS TABLE (References users, places, bookings)
CREATE TABLE public.reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  place_id uuid NOT NULL,
  booking_id uuid,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title character varying,
  comment text NOT NULL,
  images text[] DEFAULT '{}'::text[],
  helpful jsonb DEFAULT '{"count": 0, "users": []}'::jsonb,
  response jsonb DEFAULT '{}'::jsonb,
  status character varying DEFAULT 'approved'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying]::text[])),
  is_verified boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT reviews_pkey PRIMARY KEY (id),
  CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT reviews_place_id_fkey FOREIGN KEY (place_id) REFERENCES public.places(id),
  CONSTRAINT reviews_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id)
);

-- 9. TRANSPORT_REQUESTS TABLE (References users, bookings, drivers)
CREATE TABLE public.transport_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  booking_id uuid,
  driver_id uuid,
  vehicle_type character varying NOT NULL CHECK (vehicle_type::text = ANY (ARRAY['tricycle'::character varying, 'motorcycle'::character varying, 'van'::character varying, 'private_car'::character varying]::text[])),
  pickup jsonb DEFAULT '{}'::jsonb,
  destination jsonb DEFAULT '{}'::jsonb,
  status character varying DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying, 'accepted'::character varying, 'driver_enroute'::character varying, 'arrived'::character varying, 'in_progress'::character varying, 'completed'::character varying, 'cancelled'::character varying]::text[])),
  fare jsonb DEFAULT '{}'::jsonb,
  distance numeric DEFAULT 0,
  duration jsonb DEFAULT '{}'::jsonb,
  passengers integer DEFAULT 1,
  notes text,
  driver_location jsonb DEFAULT '{}'::jsonb,
  eta jsonb DEFAULT '{}'::jsonb,
  photos jsonb DEFAULT '[]'::jsonb,
  rating jsonb DEFAULT '{}'::jsonb,
  timeline jsonb DEFAULT '{}'::jsonb,
  cancellation_reason text,
  cancelled_by character varying CHECK (cancelled_by::text = ANY (ARRAY['user'::character varying, 'driver'::character varying, 'system'::character varying]::text[])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT transport_requests_pkey PRIMARY KEY (id),
  CONSTRAINT transport_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT transport_requests_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id),
  CONSTRAINT transport_requests_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.drivers(id)
);

-- 10. USER_FAVORITES TABLE (References users, places)
CREATE TABLE public.user_favorites (
  user_id uuid NOT NULL,
  place_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_favorites_pkey PRIMARY KEY (user_id, place_id),
  CONSTRAINT user_favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT user_favorites_place_id_fkey FOREIGN KEY (place_id) REFERENCES public.places(id)
);

-- 11. USER_OWNED_PLACES TABLE (References users, places)
CREATE TABLE public.user_owned_places (
  user_id uuid NOT NULL,
  place_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_owned_places_pkey PRIMARY KEY (user_id, place_id),
  CONSTRAINT user_owned_places_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT user_owned_places_place_id_fkey FOREIGN KEY (place_id) REFERENCES public.places(id)
);

-- PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_places_status ON places(status);
CREATE INDEX IF NOT EXISTS idx_places_created_at ON places(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_places_category ON places(category);
CREATE INDEX IF NOT EXISTS idx_about_items_status ON about_items(status);
CREATE INDEX IF NOT EXISTS idx_about_items_created_at ON about_items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_place_id ON bookings(place_id);
CREATE INDEX IF NOT EXISTS idx_reviews_place_id ON reviews(place_id);
CREATE INDEX IF NOT EXISTS idx_transport_requests_user_id ON transport_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_transport_requests_driver_id ON transport_requests(driver_id);
