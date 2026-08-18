-- User-created playlists. Not in the original 8-table spec list (that list
-- covers system-generated playlists via generated_playlists), but needed to
-- give PLAYLIST_CREATED/PLAYLIST_ADDED an actual feature to attach to.
CREATE TABLE IF NOT EXISTS user_playlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_playlist_songs (
    playlist_id UUID NOT NULL REFERENCES user_playlists (id) ON DELETE CASCADE,
    video_id TEXT NOT NULL,
    added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (playlist_id, video_id)
);

CREATE INDEX IF NOT EXISTS idx_user_playlists_user_id ON user_playlists (user_id);
