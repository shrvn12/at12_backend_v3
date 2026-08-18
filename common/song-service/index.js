// Song metadata follows the current getInfo response shape - this module
// does not change that shape, it just adds caching in front of it and
// persistence primitives behind it.
//
// IMPORTANT: songs are only persisted to Postgres after one of the
// qualifying lifecycle events (SONG_COMPLETED, SONG_SKIPPED, SONG_LIKED,
// PLAYLIST_ADDED, GENERATED_IN_HOME_FEED, GENERATED_IN_PLAYLIST) - never
// from a bare getInfo/search call. That's why `getCachedSong`/`cacheSong`
// only touch Redis, while `upsertSong`/`refreshStats` (Postgres writes) are
// meant to be called from the Event Worker.
const redis = require('../redis');
const { query } = require('../db');
const config = require('../config');

async function getCachedSong(videoId) {
  return redis.get(redis.keys.song(videoId));
}

async function cacheSong(videoId, songInfo) {
  return redis.set(redis.keys.song(videoId), songInfo, redis.ttl.song);
}

/**
 * Upsert song metadata + stats into Postgres. Called by the Event Worker
 * after a qualifying interaction event, never from a request path.
 */
async function upsertSong(songInfo) {
  const {
    id: videoId,
    resultType,
    title,
    description,
    duration,
    publishedAt,
    channelId,
    channelTitle,
    album,
    artist,
    thumbnails,
    categoryId,
    isAudioOnly,
    lyrics,
    stats,
  } = songInfo;

  await query(
    `INSERT INTO songs (
       video_id, result_type, title, description, duration, published_at,
       channel_id, channel_title, album, artists, thumbnails, category_id,
       is_audio_only, lyrics, last_accessed_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14, now())
     ON CONFLICT (video_id) DO UPDATE SET
       result_type = EXCLUDED.result_type,
       title = EXCLUDED.title,
       description = EXCLUDED.description,
       duration = EXCLUDED.duration,
       published_at = EXCLUDED.published_at,
       channel_id = EXCLUDED.channel_id,
       channel_title = EXCLUDED.channel_title,
       album = EXCLUDED.album,
       artists = EXCLUDED.artists,
       thumbnails = EXCLUDED.thumbnails,
       category_id = EXCLUDED.category_id,
       is_audio_only = EXCLUDED.is_audio_only,
       lyrics = EXCLUDED.lyrics,
       last_accessed_at = now(),
       updated_at = now()`,
    [
      videoId,
      resultType || null,
      title || null,
      description || null,
      duration || null,
      publishedAt || null,
      channelId || null,
      channelTitle || null,
      JSON.stringify(album || null),
      JSON.stringify(artist || null),
      JSON.stringify(thumbnails || null),
      categoryId || null,
      !!isAudioOnly,
      JSON.stringify(lyrics || null),
    ]
  );

  if (stats) {
    await query(
      `INSERT INTO song_stats (video_id, view_count, like_count, favorite_count, comment_count, last_updated_at)
       VALUES ($1,$2,$3,$4,$5, now())
       ON CONFLICT (video_id) DO UPDATE SET
         view_count = EXCLUDED.view_count,
         like_count = EXCLUDED.like_count,
         favorite_count = EXCLUDED.favorite_count,
         comment_count = EXCLUDED.comment_count,
         last_updated_at = now()`,
      [
        videoId,
        stats.viewCount || 0,
        stats.likeCount || 0,
        stats.favoriteCount || 0,
        stats.commentCount || 0,
      ]
    );
  }
}

async function touchLastAccessed(videoId) {
  await query('UPDATE songs SET last_accessed_at = now() WHERE video_id = $1', [videoId]);
}

/**
 * Returns the persisted stats row and whether it's stale (older than
 * SONG_STATS_STALE_HOURS). Callers should return the cached row immediately
 * and, if stale, trigger an async refresh rather than blocking the request.
 */
async function getStatsIfPresent(videoId) {
  const { rows } = await query('SELECT * FROM song_stats WHERE video_id = $1', [videoId]);
  if (!rows[0]) return { stats: null, stale: true };

  const ageMs = Date.now() - new Date(rows[0].last_updated_at).getTime();
  const stale = ageMs > config.songs.statsStaleHours * 60 * 60 * 1000;
  return { stats: rows[0], stale };
}

module.exports = {
  getCachedSong,
  cacheSong,
  upsertSong,
  touchLastAccessed,
  getStatsIfPresent,
};
