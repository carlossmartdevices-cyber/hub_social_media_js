-- Migration: Create chunked_uploads table for tracking large video uploads
-- Date: 2025-12-18

-- Create chunked_uploads table
CREATE TABLE IF NOT EXISTS chunked_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id VARCHAR(255) UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_name VARCHAR(500) NOT NULL,
  file_size BIGINT NOT NULL,
  chunk_size INTEGER NOT NULL,
  total_chunks INTEGER NOT NULL,
  uploaded_chunks INTEGER[] DEFAULT '{}',
  checksum VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'uploading', 'completed', 'failed', 'expired')),
  metadata JSONB,
  processing_job_id VARCHAR(255),
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  CONSTRAINT valid_chunk_count CHECK (total_chunks > 0),
  CONSTRAINT valid_file_size CHECK (file_size > 0),
  CONSTRAINT valid_chunk_size CHECK (chunk_size > 0)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_chunked_uploads_upload_id ON chunked_uploads(upload_id);
CREATE INDEX IF NOT EXISTS idx_chunked_uploads_user_id ON chunked_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_chunked_uploads_status ON chunked_uploads(status);
CREATE INDEX IF NOT EXISTS idx_chunked_uploads_expires_at ON chunked_uploads(expires_at);
CREATE INDEX IF NOT EXISTS idx_chunked_uploads_created_at ON chunked_uploads(created_at);

-- Create view for active uploads
CREATE OR REPLACE VIEW active_uploads AS
SELECT
  cu.id,
  cu.upload_id,
  cu.user_id,
  cu.file_name,
  cu.file_size,
  cu.chunk_size,
  cu.total_chunks,
  array_length(cu.uploaded_chunks, 1) as uploaded_chunk_count,
  ROUND(((array_length(cu.uploaded_chunks, 1)::numeric / cu.total_chunks::numeric) * 100)::numeric, 2) as progress_percent,
  cu.status,
  cu.created_at,
  cu.expires_at
FROM chunked_uploads
WHERE status IN ('pending', 'uploading')
  AND expires_at > NOW();

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_chunked_uploads_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update timestamp
DROP TRIGGER IF EXISTS chunked_uploads_update_timestamp ON chunked_uploads;
CREATE TRIGGER chunked_uploads_update_timestamp
BEFORE UPDATE ON chunked_uploads
FOR EACH ROW
EXECUTE FUNCTION update_chunked_uploads_timestamp();

-- Create function to clean up expired uploads
CREATE OR REPLACE FUNCTION cleanup_expired_uploads()
RETURNS TABLE(cleaned_count bigint) AS $$
DECLARE
  v_deleted bigint;
BEGIN
  DELETE FROM chunked_uploads
  WHERE expires_at < NOW();

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  RETURN QUERY SELECT v_deleted;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON chunked_uploads TO postgres;
GRANT SELECT ON active_uploads TO postgres;
GRANT EXECUTE ON FUNCTION cleanup_expired_uploads() TO postgres;
GRANT EXECUTE ON FUNCTION update_chunked_uploads_timestamp() TO postgres;
