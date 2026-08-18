const { ytmusic, initializeYtmusic } = require('./musicClient');

const getGenre = async (genre) => {
  if (!genre) {
    return {msg: 'genre missing', success: false};
  }
  try {
   await initializeYtmusic();
    const songs = await ytmusic.searchSongs(`${genre} bollywood`);
    const playlists = await ytmusic.searchPlaylists(`${genre}`);
    return {songs, success: true}
  } catch (error) {
    console.log('error at /g/:genre', error);
    return {msg: "Something went wrong", error, success: false};
  }
}

module.exports = {
  getGenre,
};