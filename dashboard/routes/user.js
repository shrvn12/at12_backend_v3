const express = require('express');
const verifyToken = require('../middlewares/verifyToken');
const { optionalAuth } = require('../../common/auth');
const userController = require('../controllers/userController');
const feedController = require('../controllers/feedController');
const userPlaylistController = require('../controllers/userPlaylistController');
const statsController = require('../controllers/statsController');

const userRouter = express.Router();

userRouter.get('/userInfo', verifyToken, userController.getUserInfo);
userRouter.get('/search', verifyToken, userController.searchUser);
userRouter.get('/likedSongs', verifyToken, userController.getLikedSongs);
userRouter.post('/likeSong', verifyToken, userController.likeSong);
userRouter.post('/unlikeSong', verifyToken, userController.unlikeSong);

// Recommendation-ready home feed / "Made For You" playlist - precomputed by
// the Feed Worker, Dashboard only ever reads it here, never generates it.
userRouter.get('/homeFeed', optionalAuth, feedController.getHomeFeed);
userRouter.get('/madeForYou', optionalAuth, feedController.getMadeForYouPlaylist);
userRouter.get('/topTracks', optionalAuth, statsController.getTopTracks);

// User-created playlists
userRouter.get('/playlists', verifyToken, userPlaylistController.listPlaylists);
userRouter.post('/playlists', verifyToken, userPlaylistController.createPlaylist);
userRouter.get('/playlists/:id', verifyToken, userPlaylistController.getPlaylist);
userRouter.post('/playlists/:id/songs', verifyToken, userPlaylistController.addSong);
userRouter.delete('/playlists/:id/songs/:songId', verifyToken, userPlaylistController.removeSong);


module.exports = userRouter;
