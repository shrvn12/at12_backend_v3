const { query, withTransaction } = require('../../common/db');

async function listPlaylists(userId) {
  const { rows } = await query(
    `SELECT p.id, p.name, p.created_at, p.updated_at, count(s.video_id) AS song_count
     FROM user_playlists p
     LEFT JOIN user_playlist_songs s ON s.playlist_id = p.id
     WHERE p.user_id = $1
     GROUP BY p.id
     ORDER BY p.updated_at DESC`,
    [userId]
  );
  return rows;
}

async function getPlaylist(userId, playlistId) {
  const { rows: playlistRows } = await query(
    `SELECT id, name, created_at, updated_at FROM user_playlists WHERE id = $1 AND user_id = $2`,
    [playlistId, userId]
  );
  if (!playlistRows[0]) return null;

  const { rows: songRows } = await query(
    `SELECT video_id, added_at FROM user_playlist_songs WHERE playlist_id = $1 ORDER BY added_at DESC`,
    [playlistId]
  );

  return { ...playlistRows[0], songs: songRows };
}

async function createPlaylist(userId, name) {
  const { rows } = await query(
    `INSERT INTO user_playlists (user_id, name) VALUES ($1, $2) RETURNING id, name, created_at, updated_at`,
    [userId, name]
  );
  return rows[0];
}

async function addSongToPlaylist(userId, playlistId, videoId) {
  return withTransaction(async (client) => {
    const owned = await client.query(
      `SELECT 1 FROM user_playlists WHERE id = $1 AND user_id = $2`,
      [playlistId, userId]
    );
    if (!owned.rows.length) {
      return null; // not found / not owned by this user
    }

    await client.query(
      `INSERT INTO user_playlist_songs (playlist_id, video_id) VALUES ($1, $2)
       ON CONFLICT (playlist_id, video_id) DO NOTHING`,
      [playlistId, videoId]
    );
    await client.query(`UPDATE user_playlists SET updated_at = now() WHERE id = $1`, [playlistId]);
    return true;
  });
}

async function removeSongFromPlaylist(userId, playlistId, videoId) {
  const { rowCount } = await query(
    `DELETE FROM user_playlist_songs
     WHERE playlist_id = $1 AND video_id = $2
       AND playlist_id IN (SELECT id FROM user_playlists WHERE user_id = $3)`,
    [playlistId, videoId, userId]
  );
  return rowCount > 0;
}

module.exports = {
  listPlaylists,
  getPlaylist,
  createPlaylist,
  addSongToPlaylist,
  removeSongFromPlaylist,
};
