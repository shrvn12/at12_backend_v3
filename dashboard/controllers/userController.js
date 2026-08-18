const userService = require('../services/userService');
const { handleServiceError } = require('../../common/utils/errorHandler');

const getUserInfo = async (req, res) => {
    try {
        const userData = await userService.getUserInfo(req.user.id);
        res.json(userData);
    } catch (error) {
        handleServiceError(res, error, { fallbackMessage: 'Error while fetching user', format: 'user' });
    }
};

const searchUser = async (req, res) => {
    try {
        const user = await userService.searchUserByName(req.query.userName);
        res.json(user);
    } catch (error) {
        handleServiceError(res, error, { fallbackMessage: 'Error while searching user', format: 'user' });
    }
};

const getLikedSongs = async (req, res) => {
    try {
        const likedSongs = await userService.getLikedSongs(req.user.id);
        res.json(likedSongs);
    } catch (error) {
        handleServiceError(res, error, { fallbackMessage: 'Error while fetching liked songs', format: 'user' });
    }
};

const likeSong = async (req, res) => {
    try {
        const result = await userService.likeSong(req.user.id, req.body.songId);
        res.json(result);
    } catch (error) {
        handleServiceError(res, error, { fallbackMessage: 'Error while liking song', format: 'user' });
    }
};

const unlikeSong = async (req, res) => {
    try {
        const result = await userService.unlikeSong(req.user.id, req.body.songId);
        res.json(result);
    } catch (error) {
        handleServiceError(res, error, { fallbackMessage: 'Error while unliking song', format: 'user' });
    }
};

module.exports = {
    getUserInfo,
    searchUser,
    getLikedSongs,
    likeSong,
    unlikeSong,
};
