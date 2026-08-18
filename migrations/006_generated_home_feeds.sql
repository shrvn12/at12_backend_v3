CREATE TABLE IF NOT EXISTS generated_home_feeds (
    user_id UUID PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    feed JSONB NOT NULL,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_generated_home_feeds_generated_at ON generated_home_feeds (generated_at);
