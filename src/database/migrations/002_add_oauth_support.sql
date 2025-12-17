-- Migration: Add OAuth and social login support to users table
-- This enables login via X (Twitter), Telegram, and other providers

-- 1. Make password_hash nullable (OAuth users don't have passwords)
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- 2. Add X (Twitter) OAuth fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS x_user_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS x_username VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS x_name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS x_profile_image TEXT;

-- 3. Add Telegram OAuth fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_username VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_first_name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_last_name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_photo_url TEXT;

-- 4. Add general OAuth fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) DEFAULT 'email' CHECK (auth_provider IN ('email', 'x', 'telegram', 'google'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS provider_user_id VARCHAR(255);

-- 5. Add profile fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;

-- 6. Create unique indexes for OAuth provider IDs
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_x_user_id ON users(x_user_id) WHERE x_user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id) WHERE telegram_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_provider_user_id ON users(provider_user_id, auth_provider) WHERE provider_user_id IS NOT NULL;

-- 7. Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_auth_provider ON users(auth_provider);
CREATE INDEX IF NOT EXISTS idx_users_x_username ON users(x_username);
CREATE INDEX IF NOT EXISTS idx_users_telegram_username ON users(telegram_username);

-- Allow email to be NULL for OAuth users (they might not provide email)
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;

-- Add constraint to ensure either email or OAuth ID exists
ALTER TABLE users ADD CONSTRAINT check_user_identity
  CHECK (email IS NOT NULL OR x_user_id IS NOT NULL OR telegram_id IS NOT NULL OR provider_user_id IS NOT NULL);

COMMENT ON COLUMN users.x_user_id IS 'X (Twitter) user ID from OAuth';
COMMENT ON COLUMN users.telegram_id IS 'Telegram user ID from OAuth';
COMMENT ON COLUMN users.auth_provider IS 'Authentication provider: email, x, telegram, google';
COMMENT ON COLUMN users.provider_user_id IS 'Generic provider user ID for future OAuth providers';
