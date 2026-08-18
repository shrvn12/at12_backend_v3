CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS songs (
    video_id TEXT PRIMARY KEY,
    result_type TEXT,
    title TEXT,
    description TEXT,
    duration INTEGER,
    published_at TIMESTAMPTZ,
    channel_id TEXT,
    channel_title TEXT,
    album JSONB,
    artists JSONB,
    thumbnails JSONB,
    category_id TEXT,
    is_audio_only BOOLEAN DEFAULT false,
    lyrics JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_songs_last_accessed_at ON songs (last_accessed_at);
CREATE INDEX IF NOT EXISTS idx_songs_channel_id ON songs (channel_id);
