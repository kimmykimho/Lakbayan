-- Migration: Add missing columns to business_owners and drivers tables
-- Run this in your Neon SQL console: https://console.neon.tech

-- Add business_info column to business_owners if it doesn't exist
ALTER TABLE business_owners ADD COLUMN IF NOT EXISTS business_info jsonb DEFAULT '{}';

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'business_owners' 
ORDER BY ordinal_position;

-- OPTIONAL: Check drivers table has all required columns
-- The drivers table should have: vehicle, license, service_areas, pricing
-- These are defined as NOT NULL, so they should exist

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'drivers' 
ORDER BY ordinal_position;
