/**
 * VidlinkScraper - Extracts HLS streams from vidlink.pro
 * Uses TMDB ID encryption via enc-dec.app
 * Light proxy mode: only M3U8 playlists pass through the proxy,
 * segments are served directly with Referer: https://vidlink.pro/
 */

const TMDB_API_KEY = "68e094699525b18a70bab2f86b1fa706";
const ENC_DEC_API = "https://enc-dec.app/api";
const VIDLINK_API = "https://vidlink.pro/api/b";
const VIDLINK_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
    "Connection": "keep-alive",
    "Referer": "https://vidlink.pro/",
    "Origin": "https://vidlink.pro"
};

const QUALITY_ORDER = { "4K": 5, "1440p": 4, "1080p": 3, "720p": 2, "480p": 1, "360p": 0, "240p": -1, "Auto": -2, "Unknown": -3 };

async function makeRequest(url, options = {}) {
    const response = await fetch(url, {
        method: options.method || "GET",
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
            "Accept": "application/json,*/*",
            "Accept-Language": "en-US,en;q=0.5",
            "Connection": "keep-alive",
            ...(options.headers || {})
        },
        ...options
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    return response;
}

async function getTmdbInfo(tmdbId, mediaType) {
    const endpoint = mediaType === "tv" ? "tv" : "movie";
    const response = await makeRequest(`https://api.themoviedb.org/3/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}`);
    const data = await response.json();
    const title = mediaType === "tv" ? data.name : data.title;
    const year = (mediaType === "tv" ? data.first_air_date : data.release_date)?.substring(0, 4);
    if (!title) throw new Error("Could not extract title from TMDB response");
    return { title, year };
}

async function encryptTmdbId(tmdbId) {
    const response = await makeRequest(`${ENC_DEC_API}/enc-vidlink?text=${tmdbId}`);
    const data = await response.json();
    if (data?.result) return data.result;
    throw new Error("Invalid encryption response from enc-dec.app");
}

function resolveUrl(url, baseUrl) {
    if (url.startsWith("http")) return url;
    try { return new URL(url, baseUrl).toString(); } catch { return url; }
}

function getQualityFromResolution(resolution) {
    if (!resolution) return "Auto";
    const [, h] = resolution.split("x").map(Number);
    if (h >= 2160) return "4K";
    if (h >= 1440) return "1440p";
    if (h >= 1080) return "1080p";
    if (h >= 720) return "720p";
    if (h >= 480) return "480p";
    if (h >= 360) return "360p";
    return "240p";
}

function extractQuality(streamData) {
    if (!streamData) return "Unknown";
    for (const field of ["quality", "resolution", "label", "name"]) {
        if (!streamData[field]) continue;
        const q = streamData[field].toString().toLowerCase();
        if (q.includes("2160") || q.includes("4k")) return "4K";
        if (q.includes("1440") || q.includes("2k")) return "1440p";
        if (q.includes("1080") || q.includes("fhd")) return "1080p";
        if (q.includes("720") || q.includes("hd")) return "720p";
        if (q.includes("480") || q.includes("sd")) return "480p";
        if (q.includes("360")) return "360p";
        if (q.includes("240")) return "240p";
        const m = q.match(/(\d{3,4})[pP]?/);
        if (m) {
            const r = parseInt(m[1]);
            if (r >= 2160) return "4K";
            if (r >= 1440) return "1440p";
            if (r >= 1080) return "1080p";
            if (r >= 720) return "720p";
            if (r >= 480) return "480p";
            if (r >= 360) return "360p";
            return "240p";
        }
    }
    return "Unknown";
}

function parseM3U8(content, baseUrl) {
    const lines = content.split("\n").map(l => l.trim()).filter(Boolean);
    const streams = [];
    let current = null;
    for (const line of lines) {
        if (line.startsWith("#EXT-X-STREAM-INF:")) {
            current = { bandwidth: null, resolution: null, url: null };
            const bw = line.match(/BANDWIDTH=(\d+)/);
            if (bw) current.bandwidth = parseInt(bw[1]);
            const res = line.match(/RESOLUTION=(\d+x\d+)/);
            if (res) current.resolution = res[1];
        } else if (current && !line.startsWith("#")) {
            current.url = resolveUrl(line, baseUrl);
            streams.push(current);
            current = null;
        }
    }
    return streams;
}

async function fetchAndParseM3U8(playlistUrl, title) {
    try {
        const response = await makeRequest(playlistUrl, { headers: VIDLINK_HEADERS });
        const content = await response.text();
        const parsed = parseM3U8(content, playlistUrl);
        if (parsed.length === 0) {
            return [{ name: "Vidlink - Auto", title, url: playlistUrl, quality: "Auto" }];
        }
        return parsed.map(stream => ({
            name: `Vidlink - ${getQualityFromResolution(stream.resolution)}`,
            title,
            url: stream.url,
            quality: getQualityFromResolution(stream.resolution)
        }));
    } catch {
        return [{ name: "Vidlink - Auto", title, url: playlistUrl, quality: "Auto" }];
    }
}

function processVidlinkResponse(data, title) {
    const streams = [];
    try {
        if (data.stream?.qualities) {
            Object.entries(data.stream.qualities).forEach(([qualityKey, qualityData]) => {
                if (qualityData.url) {
                    streams.push({ name: `Vidlink - ${extractQuality({ quality: qualityKey })}`, title, url: qualityData.url, quality: extractQuality({ quality: qualityKey }) });
                }
            });
            if (data.stream.playlist) streams.push({ _isPlaylist: true, url: data.stream.playlist });
        } else if (data.stream?.playlist) {
            streams.push({ _isPlaylist: true, url: data.stream.playlist });
        } else if (data.url) {
            streams.push({ name: `Vidlink - ${extractQuality(data)}`, title, url: data.url, quality: extractQuality(data) });
        } else if (typeof data === "object") {
            const findUrls = (obj) => {
                for (const [key, value] of Object.entries(obj)) {
                    if (typeof value === "string" && (value.startsWith("http") || value.includes(".m3u8"))) {
                        if ([".srt", ".vtt", "subtitle", "caption"].some(k => value.includes(k) || key.toLowerCase().includes(k.replace(".", "")))) continue;
                        streams.push({ name: `Vidlink ${key} - ${extractQuality({ [key]: value })}`, title, url: value, quality: extractQuality({ [key]: value }) });
                    } else if (typeof value === "object" && value !== null && !key.toLowerCase().includes("caption") && !key.toLowerCase().includes("subtitle")) {
                        findUrls(value);
                    }
                }
            };
            findUrls(data);
        }
    } catch (error) {
        console.error(`[Vidlink] Error processing response: ${error.message}`);
    }
    return streams;
}

export class VidlinkScraper {
    /**
     * Get streams for a movie or TV episode.
     * M3U8 playlist URLs are returned as-is (will be proxied by the API route via /api/proxy).
     * Segments need Referer: https://vidlink.pro/ (set by hls.js xhrSetup on the client).
     */
    async getStreams(tmdbId, mediaType = "movie", season = null, episode = null) {
        console.log(`[Vidlink] Fetching streams for TMDB:${tmdbId}, Type:${mediaType}`);
        try {
            const { title, year } = await getTmdbInfo(tmdbId, mediaType);
            const encryptedId = await encryptTmdbId(tmdbId);

            const streamTitle = mediaType === "tv" && season && episode
                ? `${title} S${String(season).padStart(2, "0")}E${String(episode).padStart(2, "0")}`
                : year ? `${title} (${year})` : title;

            let vidlinkUrl = mediaType === "tv" && season && episode
                ? `${VIDLINK_API}/tv/${encryptedId}/${season}/${episode}`
                : `${VIDLINK_API}/movie/${encryptedId}`;

            console.log(`[Vidlink] Requesting: ${vidlinkUrl}`);
            const response = await makeRequest(vidlinkUrl, { headers: VIDLINK_HEADERS });
            const data = await response.json();

            const rawStreams = processVidlinkResponse(data, streamTitle);
            if (rawStreams.length === 0) return [];

            const playlistStreams = rawStreams.filter(s => s._isPlaylist);
            const directStreams = rawStreams.filter(s => !s._isPlaylist);

            if (playlistStreams.length > 0) {
                const parsedArrays = await Promise.all(
                    playlistStreams.map(ps => fetchAndParseM3U8(ps.url, streamTitle))
                );
                const all = [...directStreams, ...parsedArrays.flat()];
                all.sort((a, b) => (QUALITY_ORDER[b.quality] || -3) - (QUALITY_ORDER[a.quality] || -3));
                console.log(`[Vidlink] Returning ${all.length} streams`);
                return all;
            }

            directStreams.sort((a, b) => (QUALITY_ORDER[b.quality] || -3) - (QUALITY_ORDER[a.quality] || -3));
            console.log(`[Vidlink] Returning ${directStreams.length} streams`);
            return directStreams;
        } catch (error) {
            console.error(`[Vidlink] getStreams error: ${error.message}`);
            return [];
        }
    }
}
