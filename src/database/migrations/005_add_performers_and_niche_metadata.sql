-- Migration: Add performers and adult content niche metadata
-- File: 005_add_performers_and_niche_metadata.sql

-- Extend video_metadata in posts table to include performer information and niche-specific fields
COMMENT ON COLUMN posts.video_metadata IS 'JSON structure (UPDATED): {
  "title": "Video title",
  "description": "Video description (max 3 lines)",
  "alt_text": "Accessibility description",
  "hashtags": ["#tag1", "#tag2"],
  "cta": "Call to action text",
  "language": "es",
  "category": "tutorial",

  "performers": ["Carlos", "Miguel", "Juan"],
  "niche": {
    "primary": "gay",
    "tags": ["latino", "smoking", "pnp", "twink", "party"],
    "ageRestricted": true
  },

  "seo": {
    "title": "SEO optimized title (60-70 chars)",
    "metaDescription": "SEO meta description (150-160 chars)",
    "targetKeyword": "gay latino smoking pnp",
    "keywords": ["gay porn", "latino twinks", "smoking fetish", "pnp party"],
    "longTailQueries": ["hot latino guys smoking pnp", "gay party and play videos"],
    "voiceSearchQueries": ["where to find latino gay smoking content"]
  },

  "social": {
    "titleEN": "English social title",
    "descriptionEN": "English social description",
    "titleES": "Título en español",
    "descriptionES": "Descripción en español",
    "hashtagsEN": ["#GayLatino", "#SmokingFetish"],
    "hashtagsES": ["#LatinoGay", "#FeticheFumar"],
    "cta": "Check full video at..."
  },

  "hosting": {
    "previewUrl": "https://previews.pnptv.app/videos/...",
    "thumbnailUrl": "https://previews.pnptv.app/thumbs/...",
    "fullVideoUrl": "https://pnptv.app/watch/...",
    "cdnProvider": "cloudflare|aws|digitalocean"
  }
}';

-- Add video duration constraints for adult content (15-45 seconds)
-- This will be enforced in application logic, but document it here
COMMENT ON COLUMN posts.video_duration IS 'Video duration in seconds. For adult content previews: MUST be between 15 and 45 seconds';

-- Create index for performer search (using GIN index on JSONB)
CREATE INDEX IF NOT EXISTS idx_posts_performers
ON posts USING GIN ((video_metadata -> 'performers'));

-- Create index for niche tags search
CREATE INDEX IF NOT EXISTS idx_posts_niche_tags
ON posts USING GIN ((video_metadata -> 'niche' -> 'tags'));

-- Create index for SEO keywords search
CREATE INDEX IF NOT EXISTS idx_posts_seo_keywords
ON posts USING GIN ((video_metadata -> 'seo' -> 'keywords'));

-- Add constraint to ensure adult content is age-restricted
-- This can be used to automatically flag content
CREATE OR REPLACE FUNCTION check_adult_content_restriction()
RETURNS TRIGGER AS $$
BEGIN
  -- If niche.ageRestricted is true, ensure the post is marked appropriately
  IF (NEW.video_metadata -> 'niche' ->> 'ageRestricted')::boolean = true THEN
    -- You can add logic here to set additional flags or validations
    -- For now, we just log it
    RAISE NOTICE 'Adult content detected for post %', NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for adult content validation
DROP TRIGGER IF EXISTS validate_adult_content ON posts;
CREATE TRIGGER validate_adult_content
  BEFORE INSERT OR UPDATE ON posts
  FOR EACH ROW
  WHEN (NEW.video_metadata IS NOT NULL)
  EXECUTE FUNCTION check_adult_content_restriction();

-- Create a view for easy querying of adult content posts with performers
CREATE OR REPLACE VIEW adult_content_posts AS
SELECT
  p.id,
  p.user_id,
  p.platforms,
  p.scheduled_at,
  p.published_at,
  p.status,
  p.video_metadata ->> 'title' as title,
  p.video_metadata ->> 'description' as description,
  p.video_metadata -> 'performers' as performers,
  p.video_metadata -> 'niche' -> 'tags' as niche_tags,
  p.video_metadata -> 'seo' ->> 'targetKeyword' as target_keyword,
  p.video_metadata -> 'hosting' ->> 'previewUrl' as preview_url,
  p.video_duration,
  p.processing_status,
  p.created_at,
  p.updated_at
FROM posts p
WHERE p.media_type = 'video'
  AND (p.video_metadata -> 'niche' ->> 'ageRestricted')::boolean = true;

-- Grant access to the view
GRANT SELECT ON adult_content_posts TO PUBLIC;

-- Add helpful indexes for the adult content workflow
CREATE INDEX IF NOT EXISTS idx_posts_media_type_status
ON posts(media_type, processing_status)
WHERE media_type = 'video';

CREATE INDEX IF NOT EXISTS idx_posts_scheduled_future
ON posts(scheduled_at)
WHERE status = 'scheduled' AND scheduled_at > NOW();
