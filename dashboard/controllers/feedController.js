const redis = require('../../common/redis');
const { query } = require('../../common/db');
const { sendSuccess, sendError } = require('../../common/utils/respond');
const { logger } = require('../../common/logger');
const globalTrendingRepository = require('../repositories/globalTrendingRepository');

const getHomeFeed = async (req, res) => {
  try {
    if (!req.user) {
      const trending = await globalTrendingRepository.getGlobalTrendingSongs(25);
      return sendSuccess(res, { feed: trending, generatedAt: null, source: 'global-trending' });
    }

    const userId = req.user.id;
    const cached = await redis.get(redis.keys.homeFeed(userId));
    if (cached) {
      return sendSuccess(res, { feed: cached, generatedAt: null, source: 'cache' });
    }

    const { rows } = await query(
      'SELECT feed, generated_at FROM generated_home_feeds WHERE user_id = $1',
      [userId]
    );

    if (!rows[0]) {
      return sendSuccess(res, { feed: [], generatedAt: null, source: 'none' });
    }

    return sendSuccess(res, { feed: rows[0].feed, generatedAt: rows[0].generated_at, source: 'db' });
  } catch (err) {
    req.log?.error({ err }, 'getHomeFeed failed');
    return sendError(res, 500, 'Could not load home feed');
  }
};

const getMadeForYouPlaylist = async (req, res) => {
  try {
    if (!req.user) {
      const popular = await globalTrendingRepository.getPopularSongs(25);
      return sendSuccess(res, { name: 'Popular Right Now', songs: popular, generatedAt: null, source: 'global-popular' });
    }

    const userId = req.user.id;
    const playlistName = 'Made For You';

    const cached = await redis.get(redis.keys.playlist(userId, playlistName));
    if (cached) {
      return sendSuccess(res, { name: playlistName, songs: cached, generatedAt: null, source: 'cache' });
    }

    const { rows } = await query(
      `SELECT playlist, generated_at FROM generated_playlists WHERE user_id = $1 AND name = $2`,
      [userId, playlistName]
    );

    if (!rows[0]) {
      return sendSuccess(res, { name: playlistName, songs: [], generatedAt: null, source: 'none' });
    }

    return sendSuccess(res, {
      name: playlistName,
      songs: rows[0].playlist,
      generatedAt: rows[0].generated_at,
      source: 'db',
    });
  } catch (err) {
    req.log?.error({ err }, 'getMadeForYouPlaylist failed');
    return sendError(res, 500, 'Could not load Made For You playlist');
  }
};

module.exports = { getHomeFeed, getMadeForYouPlaylist };
