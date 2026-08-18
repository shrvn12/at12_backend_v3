const YTMusic = require('ytmusic-api');
const ytm = require('ytmusic_api_unofficial');

const ytmusic = new YTMusic();

const initializeYtmusic = async () => {
    await ytmusic.initialize();
};

module.exports = {
    ytmusic,
    ytm,
    initializeYtmusic,
};
