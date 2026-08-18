-- Lets the Event Worker de-duplicate a redelivered RabbitMQ message
-- (nacked-then-requeued after a crash before ack) instead of double-inserting
-- an append-only row.
ALTER TABLE interaction_events
    ADD COLUMN IF NOT EXISTS event_id UUID;

CREATE UNIQUE INDEX IF NOT EXISTS idx_interaction_events_event_id
    ON interaction_events (event_id)
    WHERE event_id IS NOT NULL;
