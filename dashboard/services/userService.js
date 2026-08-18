const userRepository = require('../../common/userRepository');
const { createAppError } = require('../../common/utils/appError');
const { publishInteractionEvent } = require('../../common/queue');
const { logger } = require('../../common/logger');

const getUserInfo = async (userId) => {
    const userData = await userRepository.findById(userId);
    if (!userData) {
        throw createAppError(404, 'User not found');
    }
    delete userData.password;
    return userData;
};

const searchUserByName = async (userName) => {
    if (!userName) {
        throw createAppError(403, 'Invalid query');
    }
    // Legacy behavior matched on a `userName` field that never existed on the
    // user schema (name/email only) - preserved as-is: matches by email.
    return userRepository.findByEmail(userName);
};

const getLikedSongs = async (userId) => {
    const userData = await userRepository.findById(userId);
    if (!userData) {
        throw createAppError(404, 'User not found');
    }
    return userRepository.getLikedSongVideoIds(userId);
};

const likeSong = async (userId, songId) => {
    if (!songId) {
        throw createAppError(400, 'Song ID is required');
    }

    const userData = await userRepository.findById(userId);
    if (!userData) {
        throw createAppError(404, 'User not found');
    }

    const alreadyLiked = await userRepository.isSongLiked(userId, songId);
    if (alreadyLiked) {
        throw createAppError(400, 'Song already liked');
    }

    await userRepository.likeSong(userId, songId);

    // Fire-and-forget: the like itself is already durable in liked_songs.
    // This just gives the Event Worker a history record + a chance to
    // persist/refresh the song's metadata per the song lifecycle rules.
    publishInteractionEvent({
        userId,
        videoId: songId,
        eventType: 'SONG_LIKED',
        metadata: {},
    }).catch((err) => logger.warn({ err, userId, songId }, 'failed to publish SONG_LIKED event'));

    return { msg: 'Song liked successfully', success: true };
};

const unlikeSong = async (userId, songId) => {
    if (!songId) {
        throw createAppError(400, 'Song ID is required');
    }

    const userData = await userRepository.findById(userId);
    if (!userData) {
        throw createAppError(404, 'User not found');
    }

    const liked = await userRepository.isSongLiked(userId, songId);
    if (!liked) {
        throw createAppError(400, 'Song not liked');
    }

    await userRepository.unlikeSong(userId, songId);

    publishInteractionEvent({
        userId,
        videoId: songId,
        eventType: 'SONG_UNLIKED',
        metadata: {},
    }).catch((err) => logger.warn({ err, userId, songId }, 'failed to publish SONG_UNLIKED event'));

    return { msg: 'Song unliked successfully', success: true };
};

module.exports = {
    getUserInfo,
    searchUserByName,
    getLikedSongs,
    likeSong,
    unlikeSong,
};
