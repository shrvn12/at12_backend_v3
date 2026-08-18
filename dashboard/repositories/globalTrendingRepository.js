const { query } = require('../../common/db');

// "Trending" = most SONG_COMPLETED events across ALL users in the window.
// Cheap on purpose: one grouped aggregate, no per-user computation.
async function getGlobalTrendingSongs(limit = 25, windowDays = 14) {
  const { rows } = await query(
    `SELECT s.video_id, s.title, s.artists, s.thumbnails, s.duration,
            count(*) AS play_count
     FROM interaction_events ie
     JOIN songs s ON s.video_id = ie.video_id
     WHERE ie.event_type = 'SONG_COMPLETED'
       AND ie.created_at > now() - ($2 || ' days')::interval
     GROUP BY s.video_id, s.title, s.artists, s.thumbnails, s.duration
     ORDER BY play_count DESC
     LIMIT $1`,
    [limit, windowDays]
  );
  return rows;
}

// "Popular" = highest YouTube view counts among songs already persisted.
// Even cheaper - no interaction_events scan at all, just an ORDER BY on
// an already-indexed-friendly column.
async function getPopularSongs(limit = 25) {
  const { rows } = await query(
    `SELECT s.video_id, s.title, s.artists, s.thumbnails, s.duration,
            st.view_count, st.like_count
     FROM song_stats st
     JOIN songs s ON s.video_id = st.video_id
     ORDER BY st.view_count DESC NULLS LAST
     LIMIT $1`,
    [limit]
  );
  return rows;
}

module.exports = { getGlobalTrendingSongs, getPopularSongs };