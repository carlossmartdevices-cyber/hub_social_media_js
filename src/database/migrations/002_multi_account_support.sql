-- Migration: Support multiple accounts per platform
-- This migration allows users to have multiple X/Twitter (and other platform) accounts

-- Drop the unique constraint on (user_id, platform)
ALTER TABLE platform_credentials DROP CONSTRAINT IF EXISTS platform_credentials_user_id_platform_key;

-- Add new columns for multi-account support
ALTER TABLE platform_credentials
  ADD COLUMN IF NOT EXISTS account_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS account_identifier VARCHAR(255), -- Twitter username, Instagram handle, etc.
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;

-- Create a new unique constraint on (user_id, platform, account_identifier)
-- This allows multiple accounts per platform, but prevents duplicate accounts
CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_credentials_unique_account
  ON platform_credentials(user_id, platform, account_identifier);

-- Create index for faster lookups of default accounts
CREATE INDEX IF NOT EXISTS idx_platform_credentials_default
  ON platform_credentials(user_id, platform, is_default)
  WHERE is_default = true;

-- Update existing records to have a default account_name and mark as default
UPDATE platform_credentials
SET
  account_name = CONCAT(platform, ' Account'),
  account_identifier = CONCAT(user_id, '_', platform, '_default'),
  is_default = true
WHERE account_name IS NULL;

-- Make account_name and account_identifier NOT NULL after populating existing data
ALTER TABLE platform_credentials
  ALTER COLUMN account_name SET NOT NULL,
  ALTER COLUMN account_identifier SET NOT NULL;

-- Add comment to clarify the new structure
COMMENT ON COLUMN platform_credentials.account_name IS 'User-friendly name for the account (e.g., "Personal Twitter", "Business X")';
COMMENT ON COLUMN platform_credentials.account_identifier IS 'Unique identifier for the account (e.g., Twitter username, Instagram handle)';
COMMENT ON COLUMN platform_credentials.is_default IS 'Whether this is the default account for posting when no specific account is selected';

-- Modify the posts table to support account selection
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS platform_account_ids JSONB DEFAULT '{}';

-- Add comment
COMMENT ON COLUMN posts.platform_account_ids IS 'Maps platform to specific account ID to use for that platform (e.g., {"twitter": "uuid-here"})';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_posts_platform_account_ids
  ON posts USING GIN(platform_account_ids);
