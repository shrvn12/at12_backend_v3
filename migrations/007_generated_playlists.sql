CREATE TABLE IF NOT EXISTS generated_playlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    playlist JSONB NOT NULL,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_generated_playlists_user_id ON generated_playlists (user_id);
CREATE INDEX IF NOT EXISTS idx_generated_playlists_generated_at ON generated_playlists (generated_at);
