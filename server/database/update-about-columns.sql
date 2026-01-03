-- Migration: Add missing columns to about_items table
-- Run this in your Neon SQL console: https://console.neon.tech

-- Add content column if it doesn't exist (for full description)
ALTER TABLE about_items ADD COLUMN IF NOT EXISTS content TEXT;

-- Add featured column
ALTER TABLE about_items ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false;

-- Add video_urls column (store as JSONB array)
ALTER TABLE about_items ADD COLUMN IF NOT EXISTS video_urls JSONB DEFAULT '[]';

-- Add external_links column (store as JSONB array)
ALTER TABLE about_items ADD COLUMN IF NOT EXISTS external_links JSONB DEFAULT '[]';

-- Add event_date column (store as JSONB object {start, end})
ALTER TABLE about_items ADD COLUMN IF NOT EXISTS event_date JSONB DEFAULT '{}';

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'about_items' 
ORDER BY ordinal_position;
