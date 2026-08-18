const express = require('express');
const musicController = require('../controllers/musicController');
const { searchLimiter } = require('../middlewares/rateLimiters');
const { requireQuery } = require('../middlewares/validateQuery');

const router = express.Router();

router.get('/', musicController.index);
router.get('/search', searchLimiter, requireQuery(['query']), musicController.search);
router.get('/searchSong', searchLimiter, requireQuery(['query']), musicController.searchSong);
router.get('/getQueue', musicController.getQueue);
router.get('/getUpNexts/:id', musicController.getUpNexts);
router.get('/trackInfo/:id', musicController.trackInfo);
router.get('/getInfo', requireQuery(['id']), musicController.getInfo);
router.get('/info', requireQuery(['id']), musicController.info);
router.get('/lyrics', musicController.lyrics);
router.get('/artist', requireQuery(['id']), musicController.artist);
router.get('/artistInfo/:id', musicController.artistInfo);
router.get('/search/artist', searchLimiter, requireQuery(['q']), musicController.searchArtist);
router.get('/playlist/:id', musicController.playlist);
router.get('/search/playlist', searchLimiter, requireQuery(['q']), musicController.searchPlaylist);
router.get('/g/:genre', musicController.getGenre);

module.exports = router;
