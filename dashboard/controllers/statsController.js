const { query } = require('../../common/db');
const { sendSuccess, sendError } = require('../../common/utils/respond');
const globalTrendingRepository = require('../repositories/globalTrendingRepository');

// Exponential recency decay: each play contributes exp(-ageInDays / HALF_LIFE_DAYS).
// A song played 10 times last month can still lose to a song played twice
// today, because old plays fade out - same feel as a chat list where a
// single new message bumps a thread back to the top.
const HALF_LIFE_DAYS = 7;


const getTopTracks = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);

    if (!req.user) {
      const rows = await globalTrendingRepository.getGlobalTrendingSongs(limit, 30);
      return sendSuccess(res, {
        tracks: rows.map((r) => ({
          videoId: r.video_id,
          title: r.title,
          artists: r.artists,
          thumbnail: r.thumbnails || null,
          duration: r.duration,
          playCount: parseInt(r.play_count, 10),
          lastPlayedAt: null,
          score: null,
        })),
        scope: 'global',
      });
    }

    const { rows } = await query(
      `SELECT
        ie.video_id,
        s.title,
        s.artists,
        s.thumbnails,
        s.duration,
        count(*) AS play_count,
        max(ie.created_at) AS last_played_at,
        sum(exp(-EXTRACT(EPOCH FROM (now() - ie.created_at)) / 86400.0 / $2)) AS score
        FROM interaction_events ie
        JOIN songs s ON s.video_id = ie.video_id
        WHERE ie.user_id = $1
        AND ie.event_type IN ('SONG_COMPLETED', 'SONG_SKIPPED')
        GROUP BY ie.video_id, s.title, s.artists, s.thumbnails, s.duration
        ORDER BY score DESC
        LIMIT $3`,
      [req.user.id, HALF_LIFE_DAYS, limit],
    );

    return sendSuccess(res, {
        tracks: rows.map((r) => ({
            videoId: r.video_id,
            title: r.title,
            artists: r.artists,
            thumbnail: r.thumbnails || null,
            duration: r.duration,
            playCount: parseInt(r.play_count, 10),
            lastPlayedAt: r.last_played_at,
            score: parseFloat(r.score),
        })),
    });
  } catch (err) {
    req.log?.error({ err }, 'getTopTracks failed');
    return sendError(res, 500, 'Could not load top tracks');
  }
};

module.exports = { getTopTracks };