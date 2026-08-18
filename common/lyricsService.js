const parseYouTubeDuration = (isoDuration) => {
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);

    const hours = parseInt(match?.[1]) || 0;
    const minutes = parseInt(match?.[2]) || 0;
    const seconds = parseInt(match?.[3]) || 0;

    return hours * 3600 + minutes * 60 + seconds;
};

const cleanTitle = (rawTitle) => {
    const unwantedWords = [
        'full video', 'lyrical', 'full audio', 'full song', 'full album', 'full movie',
        'full', 'official video', 'official audio', 'official song', 'official music video',
        'official full video', 'official full song', 'official full album', 'official full movie',
        'audio', 'song', 'album', 'movie', 'music video', 'music', 'video', 'lyrics', 'lyric',
        'official', 'full song audio', 'full song video', 'full song music video',
        'full song lyrics', 'full song lyric', 'full album audio', 'full album video',
        'full album music video', 'full album lyrics', 'full album lyric',
    ];

    let cleaned = rawTitle;

    unwantedWords.forEach((word) => {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        cleaned = cleaned.replace(regex, '');
    });

    cleaned = cleaned.replace(/^[^a-zA-Z0-9]+/, '');

    const splitByPipe = cleaned.split('|')[0];
    const splitByDash = splitByPipe.split('-')[0];

    return splitByDash.trim().replace(/\s{2,}/g, ' ');
};

const parseLyrics = (lyricsText) => {
    const result = [];
    if (!lyricsText || typeof lyricsText !== 'string') {
        return null;
    }

    const lines = lyricsText.split(/\r?\n/);

    for (const line of lines) {
        let match = line.match(/^\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)$/);
        if (match) {
            const [, min, sec, ms, text] = match;
            const time = parseInt(min) * 60 + parseInt(sec) + parseInt(ms) / 1000;
            result.push({ time, text: text.trim() });
            continue;
        }

        match = line.match(/^\[(\d{2}):(\d{3,5})\](.*)$/);
        if (match) {
            const [, min, combined, text] = match;
            const msLength = combined.length > 4 ? 3 : 2;
            const ms = parseInt(combined.slice(-msLength).padEnd(3, '0'));
            const sec = parseInt(combined.slice(0, -msLength));
            const time = parseInt(min) * 60 + sec + ms / 1000;
            result.push({ time, text: text.trim() });
        }
    }

    return result;
};

const searchLyrics = async (query, duration) => {
    const response = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) {
        throw new Error('Failed to fetch lyrics');
    }

    const data = await response.json();
    const durationFiltered = data.filter((song) => {
        const songDuration = Math.round(song.duration);
        return Math.abs(songDuration - duration) <= 3;
    });

    const synced = durationFiltered.find((song) => song.syncedLyrics);
    const plain = durationFiltered.find((song) => song.plainLyrics);
    return synced || plain || { message: 'No lyrics found matching criteria' };
};

const fetchSyncedLyricsForTrack = async (cleanedTitle, artistName, duration) => {
    let lyricsData = [];

    const primaryRes = await fetch(
        `https://lrclib.net/api/search?q=${encodeURIComponent(cleanedTitle)}+${artistName || ''}`
    );
    if (primaryRes.ok) {
        lyricsData = await primaryRes.json();
    }

    let filteredByDuration = lyricsData.filter((song) => {
        return song.duration && Math.abs(Math.round(song.duration) - duration) <= 2;
    });

    if (filteredByDuration.length === 0) {
        const fallbackRes = await fetch(
            `https://lrclib.net/api/search?q=${encodeURIComponent(cleanedTitle)}`
        );
        if (fallbackRes.ok) {
            const fallbackData = await fallbackRes.json();
            filteredByDuration = fallbackData.filter((song) => {
                return song.duration && Math.abs(Math.round(song.duration) - duration) <= 2;
            });
        }
    }

    const withSynced = filteredByDuration.find((song) => song.syncedLyrics);
    return parseLyrics(withSynced?.syncedLyrics);
};

module.exports = {
    parseYouTubeDuration,
    cleanTitle,
    parseLyrics,
    searchLyrics,
    fetchSyncedLyricsForTrack,
};
