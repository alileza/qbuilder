-- Up
ALTER TABLE submissions
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX idx_submissions_deleted_at ON submissions(deleted_at);

-- Down
DROP INDEX IF EXISTS idx_submissions_deleted_at;
ALTER TABLE submissions
DROP COLUMN IF EXISTS updated_at,
DROP COLUMN IF EXISTS deleted_at;
