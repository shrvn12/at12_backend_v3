require('dotenv').config();
const cron = require('node-cron');
const { query } = require('../common/db');
const { publishFeedGenerationJob, publishMaintenanceJob } = require('../common/queue');
const { logger } = require('../common/logger');
const config = require('../common/config');

// Scheduler never refreshes song statistics - that only happens on demand
// via the Event Worker, in response to a real interaction.

async function publishStaleHomeFeeds() {
  const { rows } = await query(
  `SELECT u.id AS user_id
   FROM users u
   LEFT JOIN generated_home_feeds f ON f.user_id = u.id
   WHERE f.user_id IS NULL
      OR f.generated_at < now() - ($1 || ' hours')::interval
      OR jsonb_array_length(f.feed) = 0`,
  [config.scheduler.homeFeedStaleHours]
);

  for (const row of rows) {
    await publishFeedGenerationJob({ type: 'GENERATE_HOME_FEED', userId: row.user_id });
  }
  logger.info({ count: rows.length }, 'published GENERATE_HOME_FEED jobs');
}

async function publishStalePlaylists() {
  const { rows } = await query(
    `SELECT u.id AS user_id
     FROM users u
     LEFT JOIN generated_playlists p ON p.user_id = u.id AND p.name = 'Made For You'
     WHERE p.user_id IS NULL OR p.generated_at < now() - ($1 || ' hours')::interval`,
    [config.scheduler.playlistStaleHours]
  );

  for (const row of rows) {
    await publishFeedGenerationJob({ type: 'GENERATE_PERSONALIZED_PLAYLISTS', userId: row.user_id });
  }
  logger.info({ count: rows.length }, 'published GENERATE_PERSONALIZED_PLAYLISTS jobs');
}

async function runHourly() {
  try {
    await publishStaleHomeFeeds();
    await publishStalePlaylists();
  } catch (err) {
    logger.error({ err }, 'hourly scheduler run failed');
  }
}

async function runDaily() {
  try {
    await publishMaintenanceJob({ type: 'CLEAN_UNUSED_SONGS' });
    await publishMaintenanceJob({ type: 'AGGREGATE_ANALYTICS' });
    logger.info('published daily maintenance jobs');
  } catch (err) {
    logger.error({ err }, 'daily scheduler run failed');
  }
}

cron.schedule(config.scheduler.hourlyCron, runHourly);
cron.schedule(config.scheduler.dailyCron, runDaily);

logger.info(
  { hourlyCron: config.scheduler.hourlyCron, dailyCron: config.scheduler.dailyCron },
  'scheduler started'
);
