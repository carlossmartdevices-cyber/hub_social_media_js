-- Automated actions table
CREATE TABLE IF NOT EXISTS automated_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('auto_reply_inbox', 'auto_reply_mentions', 'scheduled_promotion', 'auto_like', 'auto_follow')),
  platforms TEXT[] NOT NULL, -- Array of platform names
  config JSONB NOT NULL, -- Configuration specific to action type
  is_enabled BOOLEAN DEFAULT true,
  last_executed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_automated_actions_user_id ON automated_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_automated_actions_type ON automated_actions(type);
CREATE INDEX IF NOT EXISTS idx_automated_actions_is_enabled ON automated_actions(is_enabled);
CREATE INDEX IF NOT EXISTS idx_automated_actions_platforms ON automated_actions USING GIN(platforms);

-- Automated action logs table
CREATE TABLE IF NOT EXISTS automated_action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id UUID NOT NULL REFERENCES automated_actions(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL CHECK (status IN ('success', 'failure', 'skipped')),
  details JSONB,
  error TEXT,
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_automated_action_logs_action_id ON automated_action_logs(action_id);
CREATE INDEX IF NOT EXISTS idx_automated_action_logs_platform ON automated_action_logs(platform);
CREATE INDEX IF NOT EXISTS idx_automated_action_logs_status ON automated_action_logs(status);
CREATE INDEX IF NOT EXISTS idx_automated_action_logs_executed_at ON automated_action_logs(executed_at);

-- Apply update timestamp trigger
DROP TRIGGER IF EXISTS update_automated_actions_updated_at ON automated_actions;
CREATE TRIGGER update_automated_actions_updated_at BEFORE UPDATE ON automated_actions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
