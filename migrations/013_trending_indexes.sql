CREATE INDEX IF NOT EXISTS idx_interaction_events_type_created_at
    ON interaction_events (event_type, created_at);

CREATE INDEX IF NOT EXISTS idx_song_stats_view_count
    ON song_stats (view_count DESC);