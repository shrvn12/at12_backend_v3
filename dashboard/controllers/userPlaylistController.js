const userPlaylistRepository = require('../repositories/userPlaylistRepository');
const { publishInteractionEvent } = require('../../common/queue');
const { logger } = require('../../common/logger');
const { sendSuccess, sendError } = require('../../common/utils/respond');

const listPlaylists = async (req, res) => {
  try {
    const playlists = await userPlaylistRepository.listPlaylists(req.user.id);
    return sendSuccess(res, { playlists });
  } catch (err) {
    req.log?.error({ err }, 'listPlaylists failed');
    return sendError(res, 500, 'Could not load playlists');
  }
};

const getPlaylist = async (req, res) => {
  try {
    const playlist = await userPlaylistRepository.getPlaylist(req.user.id, req.params.id);
    if (!playlist) {
      return sendError(res, 404, 'Playlist not found');
    }
    return sendSuccess(res, { playlist });
  } catch (err) {
    req.log?.error({ err }, 'getPlaylist failed');
    return sendError(res, 500, 'Could not load playlist');
  }
};

const createPlaylist = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return sendError(res, 400, 'Playlist name is required');
    }

    const playlist = await userPlaylistRepository.createPlaylist(req.user.id, name.trim());

    publishInteractionEvent({
      userId: req.user.id,
      videoId: null,
      eventType: 'PLAYLIST_CREATED',
      metadata: { playlistId: playlist.id, name: playlist.name },
    }).catch((err) => logger.warn({ err }, 'failed to publish PLAYLIST_CREATED event'));

    return sendSuccess(res, { playlist }, 201);
  } catch (err) {
    req.log?.error({ err }, 'createPlaylist failed');
    return sendError(res, 500, 'Could not create playlist');
  }
};

const addSong = async (req, res) => {
  try {
    const { songId } = req.body;
    const { id: playlistId } = req.params;
    if (!songId) {
      return sendError(res, 400, 'songId is required');
    }

    const result = await userPlaylistRepository.addSongToPlaylist(req.user.id, playlistId, songId);
    if (result === null) {
      return sendError(res, 404, 'Playlist not found');
    }

    publishInteractionEvent({
      userId: req.user.id,
      videoId: songId,
      eventType: 'PLAYLIST_ADDED',
      metadata: { playlistId },
    }).catch((err) => logger.warn({ err }, 'failed to publish PLAYLIST_ADDED event'));

    return sendSuccess(res, { added: true });
  } catch (err) {
    req.log?.error({ err }, 'addSong failed');
    return sendError(res, 500, 'Could not add song to playlist');
  }
};

const removeSong = async (req, res) => {
  try {
    const { id: playlistId, songId } = req.params;
    const removed = await userPlaylistRepository.removeSongFromPlaylist(req.user.id, playlistId, songId);
    if (!removed) {
      return sendError(res, 404, 'Song not found in playlist');
    }
    return sendSuccess(res, { removed: true });
  } catch (err) {
    req.log?.error({ err }, 'removeSong failed');
    return sendError(res, 500, 'Could not remove song from playlist');
  }
};

module.exports = { listPlaylists, getPlaylist, createPlaylist, addSong, removeSong };
