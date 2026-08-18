CREATE TABLE IF NOT EXISTS search_statistics (
    query TEXT PRIMARY KEY,
    count BIGINT NOT NULL DEFAULT 0,
    last_searched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
