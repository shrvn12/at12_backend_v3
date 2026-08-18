require('dotenv').config();
const { consume, QUEUES } = require('../common/queue');
const { query } = require('../common/db');
const { withWorkerLogging, logger } = require('../common/logger');
const config = require('../common/config');

async function cleanUnusedSongs() {
  const { rows } = await query(
    `DELETE FROM songs
     WHERE last_accessed_at < now() - ($1 || ' days')::interval
       AND video_id NOT IN (SELECT video_id FROM liked_songs)
     RETURNING video_id`,
    [config.songs.retentionDays]
  );
  logger.info({ deleted: rows.length }, 'CLEAN_UNUSED_SONGS complete');
}

async function aggregateAnalytics() {
  const { rows } = await query(
    `SELECT event_type, count(*) AS count
     FROM interaction_events
     WHERE created_at > now() - interval '1 day'
     GROUP BY event_type
     ORDER BY count DESC`
  );
  // No dedicated analytics-output table is defined in the spec's schema;
  // this is logged for now so it's easy to pipe into a dashboard/table later
  // without changing how the job is triggered or consumed.
  logger.info({ dailyEventCounts: rows }, 'AGGREGATE_ANALYTICS complete');
}

async function handleJob(job) {
  if (job.type === 'CLEAN_UNUSED_SONGS') return cleanUnusedSongs();
  if (job.type === 'AGGREGATE_ANALYTICS') return aggregateAnalytics();
  logger.warn({ job }, 'unknown maintenance job type');
}

async function start() {
  await consume(QUEUES.maintenance, withWorkerLogging('maintenance-worker', 'maintenance', handleJob));
  logger.info('maintenance-worker listening on maintenance');
}

start().catch((err) => {
  logger.error({ err }, 'maintenance-worker failed to start');
  process.exit(1);
});
