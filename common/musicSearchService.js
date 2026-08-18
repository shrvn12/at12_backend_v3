const { createAppError } = require('./utils/appError');
const { ytmusic, ytm, initializeYtmusic } = require('./musicClient');
const searchService = require('./search-service');

const getSearchSuggestions = async (query) => {
    if (!query || query === 'null') {
        throw createAppError(400, 'Query missing or invalid!');
    }

    await initializeYtmusic();
    return ytmusic.getSearchSuggestions(query);
};

const searchSongsAndVideos = async (query, maxResults = 5) => {
    if (!query || query === 'null') {
        throw createAppError(400, 'Query missing or invalid!');
    }

    const cacheKey = `${searchService.normalizeQuery(query)}:${maxResults}`;
    const cached = await searchService.getCachedSearch(cacheKey);
    if (cached) {
        return cached;
    }

    await initializeYtmusic();

    const songs = await ytm.search(query, 'song');
    const videos = await ytm.search(query, 'video');

    const response = {
        songs: songs.content?.slice(0, maxResults),
        videos: videos.content?.sort((a, b) => a.searchRanking - b.searchRanking).slice(0, maxResults),
    };

    response.songs?.map((item) => {
        item.videoId = item.id;
        item.name = item.title;
    });
    response.videos?.map((item) => {
        item.videoId = item.id;
        item.name = item.title;
    });

    await searchService.cacheSearch(cacheKey, response);

    return response;
};

const searchPlaylists = async (query) => {
    await initializeYtmusic();
    return ytmusic.searchPlaylists(query);
};

module.exports = {
    getSearchSuggestions,
    searchSongsAndVideos,
    searchPlaylists,
};
