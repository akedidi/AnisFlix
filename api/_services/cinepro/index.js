import axios from 'axios';
import * as cheerio from 'cheerio';
import crypto from 'crypto';

// --- Helper Functions ---

function baseTransform(d, e, f) {
    const charset = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ+/';
    const g = [...charset];
    const h = g.slice(0, e);
    const i = g.slice(0, f);

    let j = 0;
    const reversedD = d.split('').reverse();
    for (let c = 0; c < reversedD.length; c++) {
        const b = reversedD[c];
        if (h.includes(b)) {
            j += h.indexOf(b) * Math.pow(e, c);
        }
    }

    let k = '';
    while (j > 0) {
        k = i[j % f] + k;
        j = Math.floor(j / f);
    }
    return k || '0';
}

function decodeHunter(h, u, n, t, e, r = '') {
    let i = 0;
    while (i < h.length) {
        let s = '';
        while (h[i] !== n[e]) {
            s += h[i];
            i++;
        }
        i++;
        for (let j = 0; j < n.length; j++) {
            s = s.replace(
                new RegExp(n[j].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
                j.toString()
            );
        }
        const charCode = parseInt(baseTransform(s, e, 10)) - t;
        r += String.fromCharCode(charCode);
    }
    return decodeURIComponent(r);
}

function decryptData(encryptedObjectB64) {
    const encryptedObject = JSON.parse(Buffer.from(encryptedObjectB64, 'base64').toString('utf8'));
    const { algorithm, key, iv, salt, iterations, encryptedData } = encryptedObject;
    const derivedKey = crypto.pbkdf2Sync(key, Buffer.from(salt, 'hex'), iterations, 32, 'sha256');
    const ivBuffer = Buffer.from(iv, 'hex');
    const decipher = crypto.createDecipheriv(algorithm, derivedKey, ivBuffer);
    let decrypted = decipher.update(encryptedData, 'base64', 'utf8') + decipher.final('utf8');
    return JSON.parse(decrypted);
}

// --- Main Class ---

export class CineproScraper {
    constructor() {
        this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
        this.headers = {
            'User-Agent': this.userAgent,
            'Origin': 'https://multiembed.mov',
            'Referer': 'https://multiembed.mov/',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'same-origin',
            'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"Windows"'
        };
    }

    /**
     * Helper to process a discovered stream:
     * 1. If it's HLS (m3u8), try to fetch it.
     * 2. If it is a Master Playlist, extract resolutions and return multiple streams.
     * 3. If standard/single, return single stream.
     */
    async processStream(streamObj, host) {
        const results = [];

        // Always add the "Auto" (Master) stream first
        // Apply proxy if needed
        let autoLink = streamObj.link;
        if (host) {
            const protocol = 'https';
            autoLink = `${protocol}://${host}/api/movix-proxy?path=cinepro-proxy&url=${encodeURIComponent(streamObj.link)}&headers=${encodeURIComponent(JSON.stringify(streamObj.headers))}`;
        }


        results.push({
            ...streamObj,
            link: autoLink,
            quality: 'Auto'
        });

        // Only parse resolutions if it is HLS
        if (streamObj.type === 'hls') {
            try {
                // Fetch the M3U8 content to check for variants
                // Use a short timeout because this is extra "bonus" processing
                const response = await axios.get(streamObj.link, { headers: streamObj.headers, timeout: 3000 });
                const content = response.data.toString();

                if (content.includes('#EXT-X-STREAM-INF')) {
                    const lines = content.split('\n');
                    for (let i = 0; i < lines.length; i++) {
                        const line = lines[i].trim();
                        if (line.startsWith('#EXT-X-STREAM-INF')) {
                            // Extract Resolution
                            const resMatch = line.match(/RESOLUTION=(\d+x\d+)/);
                            let qualityLabel = 'Unknown';
                            if (resMatch) {
                                const [w, h] = resMatch[1].split('x').map(Number);
                                qualityLabel = `${h}p`; // e.g. 1080p
                            }

                            // Get URL (next line)
                            let nextLine = lines[i + 1]?.trim();
                            if (nextLine && !nextLine.startsWith('#')) {
                                let variantUrl = nextLine;
                                // Handle relative URL
                                if (!variantUrl.startsWith('http')) {
                                    const baseUrl = streamObj.link.substring(0, streamObj.link.lastIndexOf('/') + 1);
                                    variantUrl = new URL(variantUrl, baseUrl).toString();
                                }

                                // Proxy the variant URL
                                let proxiedVariant = variantUrl;
                                if (host) {
                                    proxiedVariant = `https://${host}/api/movix-proxy?path=cinepro-proxy&url=${encodeURIComponent(variantUrl)}&headers=${encodeURIComponent(JSON.stringify(streamObj.headers))}`;
                                }

                                results.push({
                                    ...streamObj,
                                    link: proxiedVariant,
                                    quality: qualityLabel,
                                    server: `${streamObj.server} (${qualityLabel})` // Distinguish name
                                });
                            }
                        }
                    }
                }
            } catch (e) {
                // If fetching/parsing fails, we just return the Auto stream (already added)
                // console.warn('Failed to parse M3U8 for resolutions:', e.message);
            }
        }

        return results;
    }

    async getStreams(tmdbId, season = null, episode = null, imdbId = null, host = null, fetcher = null, runtime = 0) {
        console.log(`🔍 [Cinepro] Getting streams for TMDB:${tmdbId} IMDB:${imdbId} S:${season} E:${episode} Runtime:${runtime}min`);
        const streams = [];

        // Only use AutoEmbed (MegaCDN) - MultiEmbed was returning incorrect links for movies it didn't have
        try {
            console.log('🎬 [Cinepro] Fetching from AutoEmbed (MegaCDN)...');
            const autoEmbedStreams = await this.getAutoEmbed(tmdbId, season, episode, host, fetcher, imdbId, runtime);
            if (autoEmbedStreams && autoEmbedStreams.length > 0) {
                for (const s of autoEmbedStreams) {
                    const processed = await this.processStream(s, host);
                    streams.push(...processed);
                }
            }
        } catch (e) {
            console.error(`❌ [Cinepro] AutoEmbed failed: ${e.message}`);
        }

        return streams;
    }

    // --- MultiEmbed Logic ---
    async getMultiEmbed(imdbId, season, episode, fetcher = null) {
        let baseUrl = `https://multiembed.mov/?video_id=${imdbId}`;
        /* MultiEmbed usually requires Puppeteer for Captcha/Cloudflare too. 
           If fetcher is provided, we could use it, but logic is complex (click play etc). 
           For now, we leave standard logic or partial fetcher usage if simple GET. */

        if (season && episode) {
            baseUrl += `&s=${season}&e=${episode}`;
        }
        const foundStreams = [];
        try {
            // Direct request to MultiEmbed (corsproxy.io was ineffective)
            const resolved = await axios.get(baseUrl, { headers: this.headers, timeout: 8000 });
            const defaultDomain = new URL(baseUrl).origin + '/';
            // ... (rest of logic handles POST which proxies might simplify or complicate, 
            // but the prompt specifically asked to integrate corsproxy on necessary calls)

            // For the POST below, corsproxy.io primarily supports GET. 
            // We will leave the POST as direct for now (as per plan discussion), or try to adapt if it fails.
            // But fixing the initial GET is the first step requested.

            const dataPayload = { 'button-click': 'ZEhKMVpTLVF0LVBTLVF0LVAtMGs1TFMtUXpPREF0TC0wLVYzTi0wVS1RTi0wQTFORGN6TmprLTU=', 'button-referer': '' };
            const resp1 = await axios.post(baseUrl, new URLSearchParams(dataPayload), { headers: this.headers, timeout: 5000 });
            const tokenMatch = resp1.data.match(/load_sources\(\"(.*?)\"\)/);
            if (!tokenMatch) throw new Error('Token not found');
            const token = tokenMatch[1];
            const resp2 = await axios.post('https://streamingnow.mov/response.php', new URLSearchParams({ token }), { headers: this.headers, timeout: 5000 });
            const $ = cheerio.load(resp2.data);
            const vipSources = [];
            $('li').each((i, el) => {
                const txt = $(el).text().toLowerCase();
                const id = $(el).attr('data-id');
                if (txt.includes('vipstream') && id) {
                    vipSources.push({ id, server: $(el).attr('data-server'), name: txt });
                }
            });
            if (vipSources.length === 0) throw new Error('No VIP source found');
            for (const source of vipSources) {
                try {
                    const serverId = source.server;
                    const videoId = source.id;
                    const vipUrl = `https://streamingnow.mov/playvideo.php?video_id=${videoId}&server_id=${serverId}&token=${token}&init=1`;
                    // Direct fetch (corsproxy.io was ineffective)
                    const resp3 = await axios.get(vipUrl, { headers: this.headers, timeout: 5000 });
                    const $2 = cheerio.load(resp3.data);
                    let iframeUrl = $2('iframe').attr('src');
                    if (!iframeUrl) continue;

                    // Direct fetch (corsproxy.io was ineffective)
                    const resp4 = await axios.get(iframeUrl, { headers: this.headers, timeout: 5000 });
                    let videoUrl = null;
                    const hunterMatch = resp4.data.match(/\(\s*function\s*\([^\)]*\)\s*\{[\s\S]*?\}\s*\(\s*(.*?)\s*\)\s*\)\s*\)/);
                    if (hunterMatch) {
                        try {
                            let dataArray;
                            try { dataArray = new Function('return [' + hunterMatch[1] + ']')(); } catch { }
                            if (Array.isArray(dataArray) && dataArray.length >= 6) {
                                const [h, u, n, t, e, r] = dataArray;
                                const decoded = decodeHunter(h, u, n, t, e, r);
                                const videoMatch = decoded.match(/file:"(https?:\/\/[^"]+)"/);
                                if (videoMatch) videoUrl = videoMatch[1];
                            }
                        } catch (e) { }
                    }
                    if (!videoUrl) {
                        const fileMatch = resp4.data.match(/file\s*:\s*"([^"]+)"/);
                        if (fileMatch) {
                            let rawUrl = fileMatch[1];
                            const proxySrcMatch = rawUrl.match(/src=([^&]+)/);
                            if (proxySrcMatch) rawUrl = decodeURIComponent(proxySrcMatch[1]);
                            videoUrl = rawUrl;
                        }
                    }
                    if (videoUrl) {
                        const isMega = videoUrl.includes('megacdn') || videoUrl.includes('megaf');
                        const isMilky = videoUrl.includes('premilkyway');
                        const serverLabel = isMega ? 'MegaCDN' : (isMilky ? 'PreMilkyWay' : 'MultiEmbed');
                        foundStreams.push({ server: serverLabel, link: videoUrl, type: 'hls', quality: 'Auto', lang: 'VO', headers: { 'Referer': defaultDomain, 'User-Agent': this.userAgent, 'Origin': defaultDomain } });
                    }
                } catch (err) { }
            }
            return foundStreams;
        } catch (e) { throw e; }
    }

    // --- AutoEmbed Logic (MegaCDN Only - Server 10) ---
    async getAutoEmbed(tmdbId, season, episode, host, fetcher = null, imdbId = null, tmdbRuntime = 0) {
        const type = season && episode ? 'tv' : 'movie';

        // Use IMDB ID for movies if available for better accuracy
        const idParam = (type === 'movie' && imdbId) ? imdbId : tmdbId;

        const baseUrl = type === 'tv'
            ? `https://test.autoembed.cc/api/server?id=${idParam}&ss=${season}&ep=${episode}`
            : `https://test.autoembed.cc/api/server?id=${idParam}`;
        const headers = { 'Referer': 'https://player.vidsrc.co/', 'Origin': 'https://player.vidsrc.co/', 'User-Agent': this.userAgent };
        const streams = [];

        // Only fetch Server 10 (MegaCDN - most reliable with multi-resolution)
        const megaCdnServer = 10;
        const serverUrl = `${baseUrl}&sr=${megaCdnServer}`;

        try {
            console.log(`[Cinepro] Fetching MegaCDN (Server ${megaCdnServer})...`);

            let responseData = null;

            // Priority 1: Use provided fetcher (Puppeteer) if available
            // This is the Vercel-side solution to bypass Cloudflare Challenge
            if (fetcher) {
                console.log(`[Cinepro] Using custom fetcher (Puppeteer) for MegaCDN: ${serverUrl}`);
                try {
                    const response = await fetcher(serverUrl, {
                        headers: {
                            'Referer': 'https://player.vidsrc.co/',
                            'Origin': 'https://player.vidsrc.co/',
                            'User-Agent': this.userAgent
                        }
                    });

                    // Parse response if it's a string (Puppeteer typically returns text or object)
                    let data = response.data || response.body || response;
                    if (typeof data === 'string') {
                        try {
                            // If it's a string, it might be the JSON response directly
                            const parsed = JSON.parse(data);
                            data = parsed;
                        } catch (e) {
                            console.warn(`⚠️ [Cinepro] Failed to parse Puppeteer response as JSON.`);
                        }
                    }

                    if (data && data.data) {
                        console.log(`✅ [Cinepro] Success with Puppeteer`);
                        responseData = data;
                    }
                } catch (err) {
                    console.error(`❌ [Cinepro] Puppeteer Failed: ${err.message}`);
                }
            }

            // Priority 2: Use Cors.eu.org (only working proxy from 34 tested)
            if (!responseData) {
                const proxyUrl = `https://cors.eu.org/${serverUrl}`;
                console.log(`[Cinepro] Fetching MegaCDN via Cors.eu.org: ${proxyUrl}`);
                try {
                    const response = await axios.get(proxyUrl, { headers, timeout: 8000 });
                    if (response.data && response.data.data) {
                        console.log(`✅ [Cinepro] Success with Cors.eu.org`);
                        responseData = response.data;
                    } else if (response.data && typeof response.data === 'string' && response.data.includes('"data"')) {
                        try {
                            const parsed = JSON.parse(response.data);
                            if (parsed.data) {
                                console.log(`✅ [Cinepro] Success with Cors.eu.org (parsed string)`);
                                responseData = parsed;
                            }
                        } catch (e) { /* ignore */ }
                    }
                } catch (err) {
                    console.warn(`⚠️ [Cinepro] Failed Cors.eu.org: ${err.message}`);
                }
            }

            if (responseData && responseData.data) {
                const decrypted = decryptData(responseData.data);
                let directUrl = decrypted.url;

                // De-proxy the URL (extract real MegaCDN URL from sexyproxy.aether.mom wrapper)
                if (directUrl.includes('proxy') && directUrl.includes('url=')) {
                    const urlMatch = directUrl.match(/[?&]url=([^&]+)/);
                    if (urlMatch) directUrl = decodeURIComponent(urlMatch[1]);
                }

                console.log(`[Cinepro] MegaCDN raw URL: ${directUrl}`);

                // Check if this is a MegaCDN URL
                if (directUrl.includes('megacdn')) {
                    // Fetch the master playlist to get available resolutions
                    try {
                        const masterPlaylistResponse = await axios.get(directUrl, { timeout: 8000 });
                        const masterPlaylist = masterPlaylistResponse.data;

                        // VALIDATION: Check if we got a valid M3U8 playlist
                        // If AutoEmbed doesn't have this content, it may return HTML or an error page
                        if (typeof masterPlaylist !== 'string' || !masterPlaylist.includes('#EXTM3U')) {
                            console.log('[Cinepro] ⚠️ Stream validation FAILED - not a valid M3U8 playlist');
                            console.log('[Cinepro] Content preview:', String(masterPlaylist).substring(0, 200));
                            return []; // Return empty - this content is not available
                        }

                        console.log('[Cinepro] ✅ Stream validation PASSED - valid M3U8 playlist');

                        // DURATION VALIDATION: Calculate stream duration and compare with TMDB runtime
                        if (tmdbRuntime > 0) {
                            try {
                                // Get first variant URL from master playlist
                                const variantMatch = masterPlaylist.match(/^(?!#)(.+\.m3u8.*)$/m) ||
                                    masterPlaylist.match(/^(\d+\/index\.m3u8.*)$/m);

                                if (variantMatch) {
                                    let variantUrl = variantMatch[1].trim();
                                    if (!variantUrl.startsWith('http')) {
                                        const baseUrlParts = directUrl.split('/');
                                        baseUrlParts.pop();
                                        variantUrl = baseUrlParts.join('/') + '/' + variantUrl;
                                    }

                                    console.log(`[Cinepro] Fetching variant for duration check: ${variantUrl}`);
                                    const variantResponse = await axios.get(variantUrl, { timeout: 8000 });
                                    const variantContent = variantResponse.data;

                                    // Calculate duration from EXTINF tags
                                    const extinfMatches = variantContent.matchAll(/#EXTINF:([\d.]+)/g);
                                    let totalDuration = 0;
                                    for (const match of extinfMatches) {
                                        totalDuration += parseFloat(match[1]);
                                    }
                                    const streamDurationMinutes = totalDuration / 60;

                                    const durationDiff = Math.abs(streamDurationMinutes - tmdbRuntime);
                                    console.log(`[Cinepro] Duration validation: Stream=${streamDurationMinutes.toFixed(1)}min, TMDB=${tmdbRuntime}min, Diff=${durationDiff.toFixed(1)}min`);

                                    if (durationDiff > 10) {
                                        console.log('[Cinepro] ⚠️ Duration mismatch > 10 minutes - WRONG MOVIE detected!');
                                        return []; // Wrong movie - reject
                                    }

                                    console.log('[Cinepro] ✅ Duration validation PASSED');
                                }
                            } catch (durationErr) {
                                console.warn(`[Cinepro] Duration validation skipped: ${durationErr.message}`);
                                // Continue anyway if duration check fails
                            }
                        }

                        // Parse resolutions from master playlist
                        // Format: #EXT-X-STREAM-INF:...RESOLUTION=WIDTHxHEIGHT\nURL
                        const lines = masterPlaylist.split('\n');
                        const resolutions = [];

                        for (let i = 0; i < lines.length; i++) {
                            const line = lines[i].trim();
                            if (line.startsWith('#EXT-X-STREAM-INF')) {
                                // Extract resolution and bandwidth
                                const resMatch = line.match(/RESOLUTION=(\d+)x(\d+)/);
                                const bwMatch = line.match(/BANDWIDTH=(\d+)/);
                                const nextLine = lines[i + 1]?.trim();

                                if (resMatch && nextLine && !nextLine.startsWith('#')) {
                                    const width = parseInt(resMatch[1]);
                                    const height = parseInt(resMatch[2]);
                                    const bandwidth = bwMatch ? parseInt(bwMatch[1]) : 0;

                                    // Construct absolute URL if relative
                                    let streamUrl = nextLine;
                                    if (!streamUrl.startsWith('http')) {
                                        const baseUrlParts = directUrl.split('/');
                                        baseUrlParts.pop(); // Remove playlist.m3u8
                                        streamUrl = baseUrlParts.join('/') + '/' + nextLine;
                                    }

                                    // Determine quality label
                                    let quality = 'Auto';
                                    if (height >= 1080) quality = '1080p';
                                    else if (height >= 720) quality = '720p';
                                    else if (height >= 480) quality = '480p';
                                    else if (height >= 360) quality = '360p';
                                    else quality = `${height}p`;

                                    resolutions.push({
                                        quality,
                                        width,
                                        height,
                                        bandwidth,
                                        url: streamUrl
                                    });
                                }
                            }
                        }

                        // Sort by resolution (highest first)
                        resolutions.sort((a, b) => b.height - a.height);

                        if (resolutions.length > 0) {
                            console.log(`[Cinepro] MegaCDN: Found ${resolutions.length} resolutions`);

                            // Add each resolution as a separate stream
                            for (const res of resolutions) {
                                streams.push({
                                    server: `MegaCDN ${res.quality}`,
                                    link: res.url,
                                    type: 'hls',
                                    quality: res.quality,
                                    lang: 'VO',
                                    headers: {}  // MegaCDN has open CORS, no special headers needed
                                });
                            }
                        } else {
                            // Fallback: if we couldn't parse resolutions, add the master playlist
                            console.log(`[Cinepro] MegaCDN: No resolutions parsed, using master playlist`);
                            streams.push({
                                server: 'MegaCDN Auto',
                                link: directUrl,
                                type: 'hls',
                                quality: 'Auto',
                                lang: 'VO',
                                headers: {}
                            });
                        }
                    } catch (playlistErr) {
                        console.error(`[Cinepro] MegaCDN playlist fetch failed: ${playlistErr.message}`);
                        // Still add the URL even if we can't fetch the playlist
                        streams.push({
                            server: 'MegaCDN',
                            link: directUrl,
                            type: 'hls',
                            quality: 'Auto',
                            lang: 'VO',
                            headers: {}
                        });
                    }
                } else {
                    // Not MegaCDN, add as-is
                    streams.push({
                        server: 'AutoEmbed Server 10',
                        link: directUrl,
                        type: directUrl.includes('.mp4') ? 'mp4' : 'hls',
                        quality: 'Auto',
                        lang: 'VO',
                        headers: headers
                    });
                }
            }
        } catch (e) {
            console.error(`❌ [Cinepro] MegaCDN (Server ${megaCdnServer}) failed: ${e.message}`);
        }

        console.log(`✅ [Cinepro] AutoEmbed (MegaCDN) finished with ${streams.length} streams`);
        return streams;
    }
}
