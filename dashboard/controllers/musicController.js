const musicSearchService = require('../../common/musicSearchService');
const artistService = require('../../common/artistService');
const playlistService = require('../../common/playlistService');
const trackService = require('../../common/trackService');
const lyricsService = require('../../common/lyricsService');
const genreService = require('../../common/genreService');
const searchService = require('../../common/search-service');
const { handleServiceError } = require('../../common/utils/errorHandler');

const index = (req, res) => {
    res.render('index', { title: 'AT12' });
};

const search = async (req, res) => {
    try {
        const cached = await searchService.getCachedAutocomplete(req.query.query);
        if (cached) {
            return res.json(cached);
        }
        const result = await musicSearchService.getSearchSuggestions(req.query.query);
        await searchService.cacheAutocomplete(req.query.query, result);
        res.json(result);
    } catch (error) {
        handleServiceError(res, error, { context: 'search', format: 'music' });
    }
};

const searchSong = async (req, res) => {
    try {
        const maxResults = parseInt(req.query.maxResults) || 5;
        const result = await musicSearchService.searchSongsAndVideos(req.query.query, maxResults);
        res.json(result);
    } catch (error) {
        handleServiceError(res, error, { context: 'song search', format: 'music' });
    }
};

const getQueue = async (req, res) => {
    try {
        const { query, videoId } = req.query;
        const result = await playlistService.getQueue(query, videoId);
        res.json(result);
    } catch (error) {
        handleServiceError(res, error, { context: 'fetching queue', format: 'music' });
    }
};

const getUpNexts = async (req, res) => {
    try {
        const result = await trackService.getUpNexts(req.params.id);
        res.json(result);
    } catch (error) {
        handleServiceError(res, error, { context: 'getUpNexts', format: 'music' });
    }
};

const trackInfo = async (req, res) => {
    try {
        const details = await trackService.getTrackInfo(req.params.id);
        res.json(details);
    } catch (error) {
        handleServiceError(res, error, { context: 'fetching track info', format: 'music' });
    }
};

const getInfo = async (req, res) => {
    try {
        const videoInfo = await trackService.getVideoInfo(req.query.id);
        res.json(videoInfo);
    } catch (error) {
        handleServiceError(res, error, { context: 'fetching video info', format: 'music' });
    }
};

const info = async (req, res) => {
    try {
        const details = await trackService.getTrackInfo(req.query.id);
        res.json(details);
    } catch (error) {
        handleServiceError(res, error, { context: 'fetching video details', format: 'music' });
    }
};

const lyrics = async (req, res) => {
    const query = req.query.q || '';
    const duration = parseInt(req.query.duration);

    if (!query.length) {
        return res.status(400).send('Query is missing');
    }

    if (isNaN(duration)) {
        return res.status(400).send('Duration (in seconds) is required and must be a number');
    }

    try {
        const result = await lyricsService.searchLyrics(query, duration);
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal server error');
    }
};

const artist = async (req, res) => {
    try {
        const results = await artistService.getArtistDetails(req.query.id);
        res.json(results);
    } catch (error) {
        handleServiceError(res, error, { context: 'fetching artist', format: 'music' });
    }
};

const artistInfo = async (req, res) => {
    try {
        const response = await artistService.getArtistInfo(req.params.id);
        res.json(response);
    } catch (error) {
        handleServiceError(res, error, { context: 'fetching artist info', format: 'music' });
    }
};

const searchArtist = async (req, res) => {
    try {
        const query = req.query.q || '';
        const result = await artistService.searchArtists(query);
        res.json(result);
    } catch (error) {
        console.log('artist search request query', req.query.q);
        handleServiceError(res, error, { context: 'artist search', format: 'music' });
    }
};

const playlist = async (req, res) => {
    try {
        const result = await playlistService.getPlaylist(req.params.id);
        res.json(result);
    } catch (error) {
        handleServiceError(res, error, { context: 'playlist retrieval', format: 'music' });
    }
};

const searchPlaylist = async (req, res) => {
    try {
        const result = await musicSearchService.searchPlaylists(req.query.q);
        res.json(result);
    } catch (error) {
        handleServiceError(res, error, { context: 'playlist search', format: 'music' });
    }
};

const getGenre = async (req, res) => {
    try {
        const genre = req.params.genre;
        const result = await genreService.getGenre(genre);
        res.json(result);
    } catch (error) {
        handleServiceError(res, error, { context: 'genre search', format: 'music' });
    }
}

module.exports = {
    index,
    search,
    searchSong,
    getQueue,
    getUpNexts,
    trackInfo,
    getInfo,
    info,
    lyrics,
    artist,
    artistInfo,
    searchArtist,
    playlist,
    searchPlaylist,
    getGenre,
};
