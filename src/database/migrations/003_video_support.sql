-- Migration: Add video support with geo-blocking
-- File: 003_video_support.sql

-- Add video-specific columns to posts table
ALTER TABLE posts
ADD COLUMN IF NOT EXISTS video_metadata JSONB,
ADD COLUMN IF NOT EXISTS geo_restrictions JSONB,
ADD COLUMN IF NOT EXISTS media_type VARCHAR(50) DEFAULT 'text',
ADD COLUMN IF NOT EXISTS media_url TEXT,
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
ADD COLUMN IF NOT EXISTS video_duration INTEGER, -- in seconds
ADD COLUMN IF NOT EXISTS video_size BIGINT, -- in bytes
ADD COLUMN IF NOT EXISTS processing_status VARCHAR(50) DEFAULT 'pending'; -- pending, processing, ready, failed

-- Create index for video posts
CREATE INDEX IF NOT EXISTS idx_posts_media_type ON posts(media_type);
CREATE INDEX IF NOT EXISTS idx_posts_processing_status ON posts(processing_status);

-- Add comments for documentation
COMMENT ON COLUMN posts.video_metadata IS 'JSON structure: {
  "title": "Video title",
  "description": "Video description",
  "alt_text": "Accessibility description",
  "hashtags": ["#tag1", "#tag2"],
  "cta": "Call to action text",
  "language": "es",
  "category": "tutorial"
}';

COMMENT ON COLUMN posts.geo_restrictions IS 'JSON structure: {
  "type": "whitelist" | "blacklist",
  "countries": ["US", "MX", "ES"],
  "regions": ["California", "Texas"],
  "message": "This content is not available in your region"
}';

-- Create table for video processing jobs
CREATE TABLE IF NOT EXISTS video_processing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  original_url TEXT NOT NULL,
  processed_url TEXT,
  thumbnail_url TEXT,
  status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed
  format VARCHAR(20), -- mp4, webm, etc.
  resolution VARCHAR(20), -- 1080p, 720p, 480p
  bitrate INTEGER, -- in kbps
  size_before BIGINT,
  size_after BIGINT,
  compression_ratio DECIMAL(5,2),
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_video_jobs_post_id ON video_processing_jobs(post_id);
CREATE INDEX IF NOT EXISTS idx_video_jobs_status ON video_processing_jobs(status);

-- Create table for video analytics
CREATE TABLE IF NOT EXISTS video_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  views INTEGER DEFAULT 0,
  watch_time INTEGER DEFAULT 0, -- total watch time in seconds
  completion_rate DECIMAL(5,2), -- percentage of video watched
  engagement_rate DECIMAL(5,2),
  country_code VARCHAR(2), -- ISO 3166-1 alpha-2
  device_type VARCHAR(50), -- mobile, desktop, tablet
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_video_analytics_post_id ON video_analytics(post_id);
CREATE INDEX IF NOT EXISTS idx_video_analytics_platform ON video_analytics(platform);
CREATE INDEX IF NOT EXISTS idx_video_analytics_country ON video_analytics(country_code);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_video_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.completed_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER video_jobs_updated_at
  BEFORE UPDATE ON video_processing_jobs
  FOR EACH ROW
  WHEN (OLD.status != NEW.status AND NEW.status IN ('completed', 'failed'))
  EXECUTE FUNCTION update_video_jobs_updated_at();
