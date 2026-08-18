const axios = require('axios');
require('dotenv').config();
const config = require('./config');

const { createAppError } = require('./utils/appError');
const { ytmusic, initializeYtmusic } = require('./musicClient');

const getQueue = async (query, providedVideoId) => {
    await initializeYtmusic();

    let videoId = providedVideoId;

    if ((!query || query === 'null') && !videoId) {
        throw createAppError(400, 'Query/videoId missing or invalid!');
    }

    if (!videoId) {
        const songs = await ytmusic.searchSongs(query);
        videoId = songs[0]?.videoId;
        if (!videoId) {
            throw createAppError(404, 'No video found for the given query.');
        }
    }

    const apiUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=RDAMVM${videoId}&key=${config.youtube.apiKey}&maxResults=50`;
    const response = await axios.get(apiUrl);
    const items = response.data.items;

    if (!items || items.length === 0) {
        throw createAppError(404, 'No playlist items found.');
    }

    return items.map((item) => ({
        id: item.snippet?.resourceId?.videoId,
        thumbnails: item.snippet?.thumbnails,
        title: item.snippet?.title,
        artist: { name: item.snippet?.videoOwnerChannelTitle },
        channel: item.snippet?.videoOwnerChannelTitle,
    }));
};

const getPlaylist = async (rawId) => {
    let id = rawId;
    if (id.substring(0, 2) === 'VL') {
        id = id.substring(2);
    }
    if (!id) {
        throw createAppError(400, 'Playlist ID is missing');
    }

    const playlistItemsUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${id}&key=${config.youtube.apiKey}&maxResults=50`;
    const playlistUrl = `https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${id}&key=${config.youtube.apiKey}`;

    const items = await axios.get(playlistItemsUrl);
    const metaData = await axios.get(playlistUrl);

    return {
        items: items.data,
        metaData: metaData.data,
    };
};

module.exports = {
    getQueue,
    getPlaylist,
};
