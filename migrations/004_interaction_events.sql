-- Append-only. No update/delete paths should ever target this table.
CREATE TABLE IF NOT EXISTS interaction_events (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    video_id TEXT,
    event_type TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_interaction_events_user_id ON interaction_events (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_interaction_events_video_id ON interaction_events (video_id);
CREATE INDEX IF NOT EXISTS idx_interaction_events_type ON interaction_events (event_type);
