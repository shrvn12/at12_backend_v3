-- Not in the original spec's table list, but needed to serve getLikedSongs
-- efficiently without scanning interaction_events. Likes are still also
-- recorded as SONG_LIKED/SONG_UNLIKED rows in interaction_events for history.
CREATE TABLE IF NOT EXISTS liked_songs (
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    video_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, video_id)
);
