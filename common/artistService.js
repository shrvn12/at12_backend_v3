const axios = require('axios');
require('dotenv').config();
const config = require('./config');

const { createAppError } = require('./utils/appError');
const { ytmusic, ytm, initializeYtmusic } = require('./musicClient');

const getArtistDetails = async (ids) => {
    if (!ids || (Array.isArray(ids) && ids.length === 0)) {
        throw createAppError(400, 'Artist ID(s) are missing');
    }

    const idArray = Array.isArray(ids) ? ids : [ids];
    const results = [];

    try {
        await initializeYtmusic();
    } catch (err) {
        console.error('[ytmusic.initialize] Failed:', err.message);
    }

    for (const id of idArray) {
        let artist = null;
        let channelInfo = null;
        let additionalInfo = null;

        try {
            artist = await ytmusic.getArtist(id);
        } catch (err) {
            console.error(`[ytmusic] Failed for ${id}:`, err.message);
        }

        try {
            const ytRes = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
                params: {
                    part: 'snippet,statistics,brandingSettings',
                    id,
                    key: config.youtube.apiKey,
                },
            });
            channelInfo = ytRes.data?.items?.[0] || null;
        } catch (err) {
            console.error(`[YouTube API] Failed for ${id}:`, err.message);
        }

        try {
            additionalInfo = await ytm.get(id);
        } catch (err) {
            console.error(`[ytm] Failed for ${id}:`, err.message);
        }

        if (!artist && !channelInfo && !additionalInfo) {
            results.push({ id, error: 'All data sources failed' });
        } else {
            results.push({
                id,
                ...artist,
                channelInfo,
                additionalInfo,
            });
        }
    }

    return results;
};

const getArtistInfo = async (id) => {
    if (!id) {
        throw createAppError(400, 'Artist ID is missing');
    }

    const response = await ytm.get(id);
    if (!response) {
        throw createAppError(404, 'Artist not found');
    }
    return response;
};

const searchArtists = async (query) => {
    if (!query.length) {
        throw createAppError(400, 'Query is missing');
    }

    const result = await ytm.search(query, 'artist');
    const requests = [];

    for (const item of result.content) {
        if (!item.artists) {
            requests.push(ytm.get(item.id));
        } else {
            for (const artist of item.artists) {
                requests.push(ytm.get(artist.id));
            }
        }
    }

    const resolvedResponse = await Promise.all(requests);
    if (resolvedResponse.length === 0) {
        throw createAppError(404, 'No artists found for the given query');
    }

    return resolvedResponse;
};

module.exports = {
    getArtistDetails,
    getArtistInfo,
    searchArtists,
};
