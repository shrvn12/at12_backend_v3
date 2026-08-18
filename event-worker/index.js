require('dotenv').config();
const { consume, QUEUES } = require('../common/queue');
const { query } = require('../common/db');
const { withWorkerLogging, logger } = require('../common/logger');
const songService = require('../common/song-service');
const trackService = require('../common/trackService');

// Songs are only persisted after one of these - never from a bare
// getInfo/search call.
const SONG_PERSIST_EVENT_TYPES = new Set([
  'SONG_COMPLETED',
  'SONG_SKIPPED',
  'SONG_LIKED',
  'PLAYLIST_ADDED',
  'GENERATED_IN_HOME_FEED',
  'GENERATED_IN_PLAYLIST',
]);

async function recordInteractionEvent(event) {
  const { rowCount } = await query(
    `INSERT INTO interaction_events (user_id, video_id, event_type, metadata, event_id)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (event_id) WHERE event_id IS NOT NULL DO NOTHING`,
    [event.userId, event.videoId || null, event.eventType, JSON.stringify(event.metadata || {}), event.eventId || null]
  );
  // No event_id (older/legacy message) -> always treat as new, can't dedupe it.
  return event.eventId ? rowCount > 0 : true;
}

async function maybePersistSong(event) {
  if (!event.videoId || !SONG_PERSIST_EVENT_TYPES.has(event.eventType)) return;

  const { stats, stale } = await songService.getStatsIfPresent(event.videoId);

  // Refresh stale (or missing) stats on demand rather than on a schedule.
  if (!stats || stale) {
    try {
      const videoInfo = await trackService.getVideoInfo(event.videoId);
      await songService.upsertSong(videoInfo);
      return;
    } catch (err) {
      logger.warn({ err, videoId: event.videoId }, 'failed to refresh song info, touching last_accessed_at only');
    }
  }

  await songService.touchLastAccessed(event.videoId);
}

async function maybeUpdateUserProfile(event) {
  if (event.eventType !== 'SONG_LIKED') return;

  await query(
    `INSERT INTO user_profiles (user_id, updated_at)
     VALUES ($1, now())
     ON CONFLICT (user_id) DO UPDATE SET updated_at = now()`,
    [event.userId]
  );
}

async function maybeUpdateSearchStatistics(event) {
  if (event.eventType !== 'SEARCH_PERFORMED') return;
  const searchQuery = event.metadata?.query;
  if (!searchQuery) return;

  await query(
    `INSERT INTO search_statistics (query, count, last_searched_at)
     VALUES ($1, 1, now())
     ON CONFLICT (query) DO UPDATE SET
       count = search_statistics.count + 1,
       last_searched_at = now()`,
    [searchQuery]
  );
}

async function handleEvent(event) {
  const isNew = await recordInteractionEvent(event);
  if (!isNew) {
    logger.info({ eventId: event.eventId }, 'duplicate interaction event skipped');
    return;
  }
  await Promise.all([
    maybePersistSong(event),
    maybeUpdateUserProfile(event),
    maybeUpdateSearchStatistics(event),
  ]);
}

async function start() {
  await consume(QUEUES.interactionEvents, withWorkerLogging('event-worker', 'interaction_event', handleEvent));
  logger.info('event-worker listening on interaction_events');
}

start().catch((err) => {
  logger.error({ err }, 'event-worker failed to start');
  process.exit(1);
});
