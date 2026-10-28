const { query } = require('../../common/db');

async function trendingForWindow(limit, days) {
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
    [limit, days]
  );
  return rows;
}

// Highest view counts among persisted songs; if song_stats is empty too,
// fall back to whatever songs were touched most recently.
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
  if (rows.length) return rows;

  const recent = await query(
    `SELECT video_id, title, artists, thumbnails, duration
     FROM songs
     ORDER BY last_accessed_at DESC
     LIMIT $1`,
    [limit]
  );
  return recent.rows;
}

// Try the requested window first, widen it if empty, and only then fall
// back to all-time popularity. A quiet week no longer empties the feed.
async function getGlobalTrendingSongs(limit = 25, windowDays = 14) {
  for (const days of [windowDays, 90, 365]) {
    const rows = await trendingForWindow(limit, days);
    if (rows.length) return rows;
  }
  return getPopularSongs(limit);
}

module.exports = { getGlobalTrendingSongs, getPopularSongs };