-- Content Library Migration
-- Stores AI-generated content for later posting/scheduling

CREATE TABLE IF NOT EXISTS content_library (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Content
    title VARCHAR(255),
    content_en TEXT,
    content_es TEXT,
    hashtags_en TEXT[], -- Array of hashtags for English
    hashtags_es TEXT[], -- Array of hashtags for Spanish
    cta_en VARCHAR(500),
    cta_es VARCHAR(500),

    -- Media association (optional)
    media_url VARCHAR(500),
    media_type VARCHAR(50), -- 'image', 'video', 'none'
    thumbnail_url VARCHAR(500),

    -- AI Generation metadata
    ai_prompt TEXT, -- Original prompt used
    ai_tone VARCHAR(50) DEFAULT 'pnp_prime',

    -- Status
    status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'scheduled', 'posted', 'archived'

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_content_library_user_id ON content_library(user_id);
CREATE INDEX IF NOT EXISTS idx_content_library_status ON content_library(status);
CREATE INDEX IF NOT EXISTS idx_content_library_created_at ON content_library(created_at DESC);

-- Table to track which platforms content has been posted to
CREATE TABLE IF NOT EXISTS content_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id UUID NOT NULL REFERENCES content_library(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Platform info
    platform VARCHAR(50) NOT NULL, -- 'twitter', 'instagram', 'telegram', etc.
    platform_post_id VARCHAR(255), -- ID returned by the platform after posting

    -- Which version was posted
    language VARCHAR(10) DEFAULT 'en', -- 'en' or 'es'

    -- Scheduling
    scheduled_at TIMESTAMP WITH TIME ZONE,
    posted_at TIMESTAMP WITH TIME ZONE,

    -- Status
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'scheduled', 'posted', 'failed'
    error_message TEXT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for content posts
CREATE INDEX IF NOT EXISTS idx_content_posts_content_id ON content_posts(content_id);
CREATE INDEX IF NOT EXISTS idx_content_posts_user_id ON content_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_content_posts_status ON content_posts(status);
CREATE INDEX IF NOT EXISTS idx_content_posts_scheduled_at ON content_posts(scheduled_at);
