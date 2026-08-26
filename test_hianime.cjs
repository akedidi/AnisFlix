const axios = require('axios');
const cheerio = require('cheerio');

const TMDB_API_KEY = "68e094699525b18a70bab2f86b1fa706";
const MEGAPLAY_BASE = "https://megaplay.app";
const VIDWISH_BASE = "https://vidwish.com";
const MEGACLOUD_BASE = "https://megacloud.tv";

const DEFAULT_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
};

async function fetchText(url, options = {}) {
    const proxyUrl = `https://anisflix-worker.kedidi-anis.workers.dev/?path=mob&url=${encodeURIComponent(url)}`;
    const response = await axios.get(proxyUrl, {
        headers: { ...DEFAULT_HEADERS, ...options.headers }
    });
    return response.data;
}

async function fetchJson(url, options = {}) {
    // Some APIs like Jikan or TMDB don't need proxy, only scraping domains
    if (url.includes('jikan') || url.includes('themoviedb') || url.includes('hf.space')) {
        const response = await axios.get(url, {
            headers: { ...DEFAULT_HEADERS, ...options.headers }
        });
        return response.data;
    }
    const proxyUrl = `https://anisflix-worker.kedidi-anis.workers.dev/?path=mob&url=${encodeURIComponent(url)}`;
    const response = await axios.get(proxyUrl, {
        headers: { ...DEFAULT_HEADERS, ...options.headers }
    });
    return response.data;
}

async function getImdbId(tmdbId, mediaType) {
    try {
        const url = `https://api.themoviedb.org/3/${mediaType === "tv" ? "tv" : "movie"}/${tmdbId}/external_ids?api_key=${TMDB_API_KEY}`;
        const data = await fetchJson(url);
        return data.imdb_id || null;
    } catch (e) {
        return null;
    }
}

async function getTmdbShowTitle(tmdbId, mediaType) {
    try {
        const url = `https://api.themoviedb.org/3/${mediaType === "tv" ? "tv" : "movie"}/${tmdbId}?api_key=${TMDB_API_KEY}`;
        const data = await fetchJson(url);
        return data.name || data.title || data.original_title || null;
    } catch (e) {
        return null;
    }
}

async function resolveMapping(imdbId, season, episode) {
    try {
        const url = `https://id-mapping-api-malid.hf.space/api/resolve?id=${imdbId}&s=${season}&e=${episode}`;
        const data = await fetchJson(url);
        if (data.error) return null;
        return data;
    } catch (e) {
        return null;
    }
}

async function searchMalId(title, mediaType) {
    try {
        const type = mediaType === "movie" ? "movie" : "tv";
        const url = `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(title)}&type=${type}&limit=1`;
        const data = await fetchJson(url);
        if (data.data && data.data.length > 0) {
            return data.data[0].mal_id;
        }
        return null;
    } catch (e) {
        return null;
    }
}

async function extractSources(apiUrl, referer, origin, serverName, animeTitle, episodeNum, type) {
    try {
        const json = await fetchJson(apiUrl, {
            headers: {
                "X-Requested-With": "XMLHttpRequest",
                "Referer": referer,
                "Origin": origin
            }
        });
        const file = json.sources?.file;
        if (!file) return [];
        const streamTitle = `${animeTitle} - Episode ${episodeNum} (${type.toUpperCase()})`;
        const streams = [];
        streams.push({
            name: `HiAnime [${serverName}] (${type.toUpperCase()})`,
            title: streamTitle,
            url: file,
            quality: "Auto",
            headers: {
                ...DEFAULT_HEADERS,
                "Referer": `${origin}/`,
                "Origin": origin
            },
            provider: "hianime",
            type: "m3u8"
        });
        if (json.tracks && json.tracks.length > 0) {
            const subtitles = json.tracks.filter(t => t.file && t.kind === "captions").map(t => ({
                url: t.file,
                name: t.label || "English",
                language: t.label ? t.label.slice(0, 3).toLowerCase() : "en"
            }));
            streams[0].subtitles = subtitles;
        }
        return streams;
    } catch (e) {
        return [];
    }
}

async function scrapeType(malId, episode, type, animeTitle) {
    const streams = [];
    const megaUrl = `${MEGAPLAY_BASE}/stream/mal/${malId}/${episode}/${type}`;
    console.log(`[HiAnime] Scraping ${megaUrl}`);
    try {
        const html = await fetchText(megaUrl, {
            headers: { "Referer": megaUrl }
        });
        const $ = cheerio.load(html);
        const player = $("div.fix-area#megaplay-player");
        if (!player.length) {
            console.log(`[HiAnime] No player found on Megaplay`);
            return [];
        }
        const dataId = player.attr("data-id");
        const realId = player.attr("data-realid");
        const extractions = [];
        if (dataId) {
            const apiUrl = `${MEGAPLAY_BASE}/stream/getSources?id=${dataId}&id=${dataId}`;
            extractions.push(
                extractSources(apiUrl, megaUrl, MEGAPLAY_BASE, "MegaPlay", animeTitle, episode, type)
            );
        }
        if (realId) {
            const vidPage = `${VIDWISH_BASE}/stream/s-2/${realId}/${type}`;
            extractions.push((async () => {
                try {
                    const vidHtml = await fetchText(vidPage, { headers: { "Referer": megaUrl } });
                    const $v = cheerio.load(vidHtml);
                    const vPlayer = $v("div.fix-area#megaplay-player");
                    const vDataId = vPlayer.attr("data-id");
                    if (vDataId) {
                        const apiUrl = `${VIDWISH_BASE}/stream/getSources?id=${vDataId}&id=${vDataId}`;
                        return await extractSources(apiUrl, vidPage, VIDWISH_BASE, "Vidwish", animeTitle, episode, type);
                    }
                } catch (err) { }
                return [];
            })());
        }
        if (realId) {
            const megacloudPage = `${MEGACLOUD_BASE}/stream/s-3/${realId}/${type}`;
            extractions.push((async () => {
                try {
                    const mcHtml = await fetchText(megacloudPage, { headers: { "Referer": megaUrl } });
                    const $m = cheerio.load(mcHtml);
                    const mPlayer = $m("div.fix-area#megaplay-player");
                    const mDataId = mPlayer.attr("data-id");
                    if (mDataId) {
                        const apiUrl = `${MEGACLOUD_BASE}/stream/getSources?id=${mDataId}&id=${mDataId}`;
                        return await extractSources(apiUrl, megacloudPage, MEGACLOUD_BASE, "MegaCloud", animeTitle, episode, type);
                    }
                } catch (err) { }
                return [];
            })());
        }
        const results = await Promise.all(extractions);
        for (const res of results) {
            streams.push(...res);
        }
    } catch (e) {
        console.error(`[HiAnime] Error scraping type ${type}:`, e.message);
    }
    return streams;
}

async function getStreams(tmdbId, mediaType = "tv", season = 1, episode = 1) {
    try {
        console.log(`[HiAnime] Getting streams for TMDB ${tmdbId} S${season}E${episode}`);
        let malId = null;
        let mappedEp = episode;
        let showTitle = "";
        const imdbId = await getImdbId(tmdbId, mediaType);
        showTitle = (await getTmdbShowTitle(tmdbId, mediaType)) || (mediaType === "movie" ? "Movie" : "Anime");
        
        console.log(`[HiAnime] TMDB Title: ${showTitle}, IMDB: ${imdbId}`);
        if (!imdbId) return [];
        
        const s = mediaType === "movie" ? 1 : season;
        const e = mediaType === "movie" ? 1 : episode;
        
        if (mediaType === "movie") {
            malId = await searchMalId(showTitle, "movie");
            mappedEp = 1;
        }
        if (!malId && mediaType !== "movie") {
            console.log(`[HiAnime] Resolving MAL ID for ${imdbId} S${s}E${e}`);
            const mapping = await resolveMapping(imdbId, s, e);
            console.log(`[HiAnime] Mapping result:`, mapping);
            if (mapping && mapping.mal_id) {
                malId = mapping.mal_id;
                mappedEp = mapping.mal_episode || episode;
            } else {
                malId = await searchMalId(showTitle, "tv");
            }
        }
        
        if (!malId) {
            console.log(`[HiAnime] No MAL ID found`);
            return [];
        }
        
        console.log(`[HiAnime] Found MAL ID: ${malId}, Episode: ${mappedEp}`);
        
        const [subStreams, dubStreams] = await Promise.all([
            scrapeType(malId, mappedEp, "sub", showTitle),
            scrapeType(malId, mappedEp, "dub", showTitle)
        ]);
        
        const allStreams = [...subStreams, ...dubStreams];
        const seen = new Set();
        return allStreams.filter(s => {
            if (seen.has(s.url)) return false;
            seen.add(s.url);
            return true;
        });
    } catch (e) {
        console.error(`[HiAnime] Main error:`, e.message);
        return [];
    }
}

// Test Jujutsu Kaisen S02E10 (TMDB: 95479)
(async () => {
    console.log("=== Testing HiAnime ===");
    const streams = await getStreams(95479, "tv", 2, 10);
    console.log("Results:", JSON.stringify(streams, null, 2));
})();
