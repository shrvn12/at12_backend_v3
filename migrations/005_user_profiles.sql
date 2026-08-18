CREATE TABLE IF NOT EXISTS user_profiles (
    user_id UUID PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    artists JSONB DEFAULT '[]',
    albums JSONB DEFAULT '[]',
    languages JSONB DEFAULT '[]',
    categories JSONB DEFAULT '[]',
    negative_preferences JSONB DEFAULT '[]',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
