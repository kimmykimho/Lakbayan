-- About Items Table for Kitcharao Cultural/Heritage Content
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS about_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT NOT NULL,
  images TEXT[] DEFAULT '{}',
  video_urls TEXT[] DEFAULT '{}',
  external_links JSONB DEFAULT '[]',
  category VARCHAR(50) DEFAULT 'heritage',
  featured BOOLEAN DEFAULT false,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_about_items_status ON about_items(status);
CREATE INDEX IF NOT EXISTS idx_about_items_category ON about_items(category);
CREATE INDEX IF NOT EXISTS idx_about_items_featured ON about_items(featured);
CREATE INDEX IF NOT EXISTS idx_about_items_slug ON about_items(slug);

-- Enable RLS
ALTER TABLE about_items ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read active about items
CREATE POLICY "Public can read active about items" ON about_items
  FOR SELECT USING (status = 'active');

-- Policy: Admin can do everything (using service role in backend)
CREATE POLICY "Admin full access" ON about_items
  FOR ALL USING (true);

-- Insert sample data
INSERT INTO about_items (title, slug, description, category, featured, images, video_urls) VALUES
(
  'Kitcharao Heritage Museum',
  'kitcharao-heritage-museum',
  'Explore the rich history and cultural heritage of Kitcharao through our collection of artifacts, photographs, and stories from the early settlers. The museum showcases the indigenous Manobo culture and the town''s development over the decades.',
  'heritage',
  true,
  ARRAY['https://images.unsplash.com/photo-1566127444979-b3d2b654e3d7?w=800'],
  ARRAY['https://www.youtube.com/watch?v=example1']
),
(
  'Manobo Indigenous Culture',
  'manobo-indigenous-culture',
  'The Manobo people are the original inhabitants of Kitcharao. Learn about their traditions, customs, and the vibrant culture that continues to thrive in the community today. Their colorful festivals and traditional dances are a sight to behold.',
  'culture',
  true,
  ARRAY['https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800'],
  ARRAY[]::TEXT[]
),
(
  'Historical Landmarks',
  'historical-landmarks',
  'Discover the historical landmarks that shaped Kitcharao''s identity. From the old municipal hall to the centennial monuments, each structure tells a story of resilience and progress.',
  'landmark',
  false,
  ARRAY['https://images.unsplash.com/photo-1564507592333-c60657eea523?w=800'],
  ARRAY[]::TEXT[]
)
ON CONFLICT (slug) DO NOTHING;
