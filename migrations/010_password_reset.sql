ALTER TABLE users
    ADD COLUMN IF NOT EXISTS reset_token TEXT,
    ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users (reset_token);
