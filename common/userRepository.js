// Postgres repository for users. Replaces models/user.model.js.
// Row -> plain object mapping intentionally mirrors the old Mongo shape
// (camelCase, `id` instead of `_id`) so controllers need minimal changes.
const { query, withTransaction } = require('./db');

function toUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    password: row.password,
    avatar: row.avatar,
    emailVerified: row.email_verified,
    verificationToken: row.verification_token,
    verificationTokenExpiry: row.verification_token_expiry,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function findByEmail(email) {
  const { rows } = await query('SELECT * FROM users WHERE email = $1', [email]);
  return toUser(rows[0]);
}

async function findById(id) {
  const { rows } = await query('SELECT * FROM users WHERE id = $1', [id]);
  return toUser(rows[0]);
}

async function create({ name, email, password }) {
  const { rows } = await query(
    `INSERT INTO users (name, email, password)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [name, email, password]
  );
  return toUser(rows[0]);
}

async function setVerificationToken(userId, token, expiry) {
  await query(
    `UPDATE users SET verification_token = $2, verification_token_expiry = $3, updated_at = now()
     WHERE id = $1`,
    [userId, token, expiry]
  );
}

async function findByVerificationToken(token) {
  const { rows } = await query(
    `SELECT * FROM users WHERE verification_token = $1 AND verification_token_expiry > now()`,
    [token]
  );
  return toUser(rows[0]);
}

async function markEmailVerified(userId) {
  await query(
    `UPDATE users
     SET email_verified = true, verification_token = NULL, verification_token_expiry = NULL, updated_at = now()
     WHERE id = $1`,
    [userId]
  );
}

async function setResetToken(userId, token, expiry) {
  await query(
    `UPDATE users SET reset_token = $2, reset_token_expiry = $3, updated_at = now() WHERE id = $1`,
    [userId, token, expiry]
  );
}

async function findByResetToken(token) {
  const { rows } = await query(
    `SELECT * FROM users WHERE reset_token = $1 AND reset_token_expiry > now()`,
    [token]
  );
  return toUser(rows[0]);
}

async function updatePassword(userId, hashedPassword) {
  await query(
    `UPDATE users
     SET password = $2, reset_token = NULL, reset_token_expiry = NULL, updated_at = now()
     WHERE id = $1`,
    [userId, hashedPassword]
  );
}

async function getLikedSongVideoIds(userId) {
  const { rows } = await query(
    'SELECT video_id FROM liked_songs WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  );
  return rows.map((r) => r.video_id);
}

async function isSongLiked(userId, videoId) {
  const { rows } = await query(
    'SELECT 1 FROM liked_songs WHERE user_id = $1 AND video_id = $2',
    [userId, videoId]
  );
  return rows.length > 0;
}

async function likeSong(userId, videoId) {
  return withTransaction(async (client) => {
    await client.query(
      `INSERT INTO liked_songs (user_id, video_id) VALUES ($1, $2)
       ON CONFLICT (user_id, video_id) DO NOTHING`,
      [userId, videoId]
    );
  });
}

async function unlikeSong(userId, videoId) {
  await query('DELETE FROM liked_songs WHERE user_id = $1 AND video_id = $2', [userId, videoId]);
}

module.exports = {
  findByEmail,
  findById,
  create,
  setVerificationToken,
  findByVerificationToken,
  markEmailVerified,
  setResetToken,
  findByResetToken,
  updatePassword,
  getLikedSongVideoIds,
  isSongLiked,
  likeSong,
  unlikeSong,
};
