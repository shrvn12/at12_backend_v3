require('dotenv').config();
const { consume, QUEUES } = require('../common/queue');
const { query } = require('../common/db');
const redis = require('../common/redis');
const { withWorkerLogging, logger } = require('../common/logger');
const songService = require('../common/song-service');
const trackService = require('../common/trackService');
const userRepository = require('../common/userRepository');

const MAX_FEED_ITEMS = 25;
const MAX_SEED_SONGS = 8;
const RELATED_PER_SEED = 5;

/**
 * Recommendation-ready but intentionally simple for now: seed from the
 * user's liked songs, pull "up next" style related tracks for each, dedupe.
 * A real recommendation model can replace this function's body later
 * without touching the worker's persistence/caching plumbing.
 */
async function buildFeedItems(seedVideoIds) {
  const seen = new Set(seedVideoIds);
  const items = [];

  for (const videoId of seedVideoIds.slice(0, MAX_SEED_SONGS)) {
    try {
      const related = await trackService.getUpNexts(videoId);
      const candidates = Array.isArray(related) ? related : related?.tracks || [];
      for (const candidate of candidates.slice(0, RELATED_PER_SEED)) {
        const candidateId = candidate.videoId || candidate.id;
        if (!candidateId || seen.has(candidateId)) continue;
        seen.add(candidateId);
        items.push(candidate);
        if (items.length >= MAX_FEED_ITEMS) return items;
      }
    } catch (err) {
      logger.warn({ err, videoId }, 'failed to fetch related tracks for feed seed, skipping');
    }
  }

  return items;
}

async function generateHomeFeed(userId) {
  const seedVideoIds = await userRepository.getLikedSongVideoIds(userId);
  const feed = seedVideoIds.length ? await buildFeedItems(seedVideoIds) : [];

  await query(
    `INSERT INTO generated_home_feeds (user_id, feed, generated_at)
     VALUES ($1, $2, now())
     ON CONFLICT (user_id) DO UPDATE SET feed = EXCLUDED.feed, generated_at = now()`,
    [userId, JSON.stringify(feed)]
  );

  await redis.set(redis.keys.homeFeed(userId), feed, redis.ttl.homeFeed);

  // Feed generation is one of the qualifying song-persistence triggers.
  for (const item of feed) {
    const videoId = item.videoId || item.id;
    if (!videoId) continue;
    try {
      const info = await trackService.getVideoInfo(videoId);
      await songService.upsertSong(info);
    } catch (err) {
      logger.warn({ err, videoId }, 'failed to persist song generated in home feed');
    }
  }
}

async function generatePersonalizedPlaylist(userId) {
  const seedVideoIds = await userRepository.getLikedSongVideoIds(userId);
  if (!seedVideoIds.length) return;

  const playlistName = 'Made For You';
  const items = await buildFeedItems(seedVideoIds);

  await query(
    `DELETE FROM generated_playlists WHERE user_id = $1 AND name = $2`,
    [userId, playlistName]
  );
  await query(
    `INSERT INTO generated_playlists (user_id, name, playlist, generated_at)
     VALUES ($1, $2, $3, now())`,
    [userId, playlistName, JSON.stringify(items)]
  );

  await redis.set(redis.keys.playlist(userId, playlistName), items, redis.ttl.playlist);

  for (const item of items) {
    const videoId = item.videoId || item.id;
    if (!videoId) continue;
    try {
      const info = await trackService.getVideoInfo(videoId);
      await songService.upsertSong(info);
    } catch (err) {
      logger.warn({ err, videoId }, 'failed to persist song generated in playlist');
    }
  }
}

async function handleJob(job) {
  if (job.type === 'GENERATE_HOME_FEED') {
    return generateHomeFeed(job.userId);
  }
  if (job.type === 'GENERATE_PERSONALIZED_PLAYLISTS') {
    return generatePersonalizedPlaylist(job.userId);
  }
  logger.warn({ job }, 'unknown feed_generation job type');
}

async function start() {
  await consume(QUEUES.feedGeneration, withWorkerLogging('feed-worker', 'feed_generation', handleJob));
  logger.info('feed-worker listening on feed_generation');
}

start().catch((err) => {
  logger.error({ err }, 'feed-worker failed to start');
  process.exit(1);
});
