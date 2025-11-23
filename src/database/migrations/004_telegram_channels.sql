-- Migration: Add Telegram channels support
-- File: 004_telegram_channels.sql

-- Create table for storing Telegram channels/groups
CREATE TABLE IF NOT EXISTS telegram_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  chat_id VARCHAR(255) NOT NULL, -- Telegram chat ID (can be @username or numeric ID)
  title VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('channel', 'group', 'supergroup')),
  username VARCHAR(255), -- Optional @username
  is_active BOOLEAN DEFAULT true,
  last_broadcast_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for user lookups
CREATE INDEX IF NOT EXISTS idx_telegram_channels_user_id ON telegram_channels(user_id);
CREATE INDEX IF NOT EXISTS idx_telegram_channels_chat_id ON telegram_channels(chat_id);

-- Create table for tracking broadcast history
CREATE TABLE IF NOT EXISTS telegram_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('video', 'text', 'photo')),
  content TEXT NOT NULL,
  channels_count INTEGER NOT NULL DEFAULT 0,
  successful_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  telegram_file_id VARCHAR(255), -- For videos/photos
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create index for broadcast history
CREATE INDEX IF NOT EXISTS idx_telegram_broadcasts_user_id ON telegram_broadcasts(user_id);
CREATE INDEX IF NOT EXISTS idx_telegram_broadcasts_post_id ON telegram_broadcasts(post_id);
CREATE INDEX IF NOT EXISTS idx_telegram_broadcasts_status ON telegram_broadcasts(status);

-- Create table for individual broadcast results
CREATE TABLE IF NOT EXISTS telegram_broadcast_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id UUID REFERENCES telegram_broadcasts(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES telegram_channels(id) ON DELETE CASCADE,
  success BOOLEAN NOT NULL DEFAULT false,
  message_id BIGINT, -- Telegram message ID if successful
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for results lookup
CREATE INDEX IF NOT EXISTS idx_telegram_broadcast_results_broadcast_id ON telegram_broadcast_results(broadcast_id);
CREATE INDEX IF NOT EXISTS idx_telegram_broadcast_results_channel_id ON telegram_broadcast_results(channel_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_telegram_channels_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER telegram_channels_updated_at
  BEFORE UPDATE ON telegram_channels
  FOR EACH ROW
  EXECUTE FUNCTION update_telegram_channels_updated_at();

-- Add comments for documentation
COMMENT ON TABLE telegram_channels IS 'Stores Telegram channels and groups for broadcasting';
COMMENT ON TABLE telegram_broadcasts IS 'Tracks broadcast history and status';
COMMENT ON TABLE telegram_broadcast_results IS 'Individual results for each channel in a broadcast';

COMMENT ON COLUMN telegram_channels.chat_id IS 'Telegram chat ID (@username or numeric ID)';
COMMENT ON COLUMN telegram_channels.type IS 'Type of chat: channel, group, or supergroup';
COMMENT ON COLUMN telegram_broadcasts.telegram_file_id IS 'Telegram file_id for reusing uploaded media';
