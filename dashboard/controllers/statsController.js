const { query } = require('../../common/db');
const redis = require('../../common/redis');
const { sendSuccess, sendError } = require('../../common/utils/respond');
const globalTrendingRepository = require('../repositories/globalTrendingRepository');

// Exponential recency decay: each play contributes exp(-ageInDays / HALF_LIFE_DAYS).
const HALF_LIFE_DAYS = 7;
const TOP_TRACKS_CACHE_TTL = 60 * 60 * 24; // 24 hours
const MAX_TOP_TRACKS = 50;

const mapGlobalTracks = (rows) =>
  rows.map((r) => ({
    videoId: r.video_id,
    title: r.title,
    artists: r.artists,
    thumbnail: r.thumbnails || null,
    duration: r.duration,
    playCount: parseInt(r.play_count, 10),
    lastPlayedAt: null,
    score: null,
  }));

const mapPersonalizedTracks = (rows) =>
  rows.map((r) => ({
    videoId: r.video_id,
    title: r.title,
    artists: r.artists,
    thumbnail: r.thumbnails || null,
    duration: r.duration,
    playCount: parseInt(r.play_count, 10),
    lastPlayedAt: r.last_played_at,
    score: parseFloat(r.score),
  }));

const getTopTracks = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, MAX_TOP_TRACKS);

    // Unauthenticated users always receive global tracks.
    if (!req.user) {
      const cacheKey = redis.keys.topTracksGlobal();
      const cached = await redis.get(cacheKey);

      if (cached) {
        return sendSuccess(res, {
          tracks: cached.slice(0, limit),
          scope: 'global',
          source: 'cache',
        });
      }

      const rows = await globalTrendingRepository.getGlobalTrendingSongs(
        MAX_TOP_TRACKS,
        30
      );

      const tracks = mapGlobalTracks(rows);

      await redis.set(cacheKey, tracks, TOP_TRACKS_CACHE_TTL);

      return sendSuccess(res, {
        tracks: tracks.slice(0, limit),
        scope: 'global',
        source: 'global',
      });
    }

    const userId = req.user.id;
    const cacheKey = redis.keys.topTracks(userId);

    // Check personalized cache.
    const cached = await redis.get(cacheKey);

    if (cached) {
      return sendSuccess(res, {
        tracks: cached.slice(0, limit),
        source: 'cache',
      });
    }

    // Generate personalized top tracks.
    const { rows } = await query(
      `SELECT
        ie.video_id,
        s.title,
        s.artists,
        s.thumbnails,
        s.duration,
        count(*) AS play_count,
        max(ie.created_at) AS last_played_at,
        sum(
          exp(
            -EXTRACT(EPOCH FROM (now() - ie.created_at))
            / 86400.0
            / $2
          )
        ) AS score
       FROM interaction_events ie
       JOIN songs s ON s.video_id = ie.video_id
       WHERE ie.user_id = $1
       AND ie.event_type IN ('SONG_COMPLETED', 'SONG_SKIPPED')
       GROUP BY
         ie.video_id,
         s.title,
         s.artists,
         s.thumbnails,
         s.duration
       ORDER BY score DESC
       LIMIT $3`,
      [userId, HALF_LIFE_DAYS, MAX_TOP_TRACKS]
    );

    let tracks;
    let source;

    if (rows.length) {
      tracks = mapPersonalizedTracks(rows);
      source = 'personalized';
    } else {
      // No personalized data → fall back to global tracks.
      const fallback = await globalTrendingRepository.getGlobalTrendingSongs(
        MAX_TOP_TRACKS,
        30
      );

      tracks = mapGlobalTracks(fallback);
      source = 'global-fallback';
    }

    // Cache the generated result for 24 hours.
    await redis.set(cacheKey, tracks, TOP_TRACKS_CACHE_TTL);

    return sendSuccess(res, {
      tracks: tracks.slice(0, limit),
      source,
    });
  } catch (err) {
    req.log?.error({ err }, 'getTopTracks failed');
    return sendError(res, 500, 'Could not load top tracks');
  }
};

module.exports = { getTopTracks };