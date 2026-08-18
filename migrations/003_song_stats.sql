CREATE TABLE IF NOT EXISTS song_stats (
    video_id TEXT PRIMARY KEY REFERENCES songs (video_id) ON DELETE CASCADE,
    view_count BIGINT DEFAULT 0,
    like_count BIGINT DEFAULT 0,
    favorite_count BIGINT DEFAULT 0,
    comment_count BIGINT DEFAULT 0,
    last_updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_song_stats_last_updated_at ON song_stats (last_updated_at);
