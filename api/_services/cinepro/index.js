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

    async getStreams(tmdbId, season = null, episode = null, imdbId = null, host = null, fetcher = null) {
        console.log(`🔍 [Cinepro] Getting streams for TMDB:${tmdbId} IMDB:${imdbId} S:${season} E:${episode}`);
        const streams = [];

        // 1. Try MultiEmbed
        if (imdbId) {
            try {
                const multiEmbedStreams = await this.getMultiEmbed(imdbId, season, episode, fetcher);
                if (multiEmbedStreams && multiEmbedStreams.length > 0) {
                    for (const s of multiEmbedStreams) {
                        const processed = await this.processStream(s, host);
                        streams.push(...processed);
                    }
                }
            } catch (e) {
                console.error(`❌ [Cinepro] MultiEmbed failed: ${e.message}`);
            }
        }

        // 2. Try AutoEmbed
        if (streams.length === 0) {
            console.log('⚠️ [Cinepro] MultiEmbed returned no streams, trying AutoEmbed...');
            try {
                const autoEmbedStreams = await this.getAutoEmbed(tmdbId, season, episode, host, fetcher);
                if (autoEmbedStreams && autoEmbedStreams.length > 0) {
                    for (const s of autoEmbedStreams) {
                        const processed = await this.processStream(s, host);
                        streams.push(...processed);
                    }
                }
            } catch (e) {
                console.error(`❌ [Cinepro] AutoEmbed failed: ${e.message}`);
            }
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
            // ... existing logic ...
            if (baseUrl.includes('multiembed')) {
                // Use CorsProxy.io to bypass Vercel 403 on initial navigation
                const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(baseUrl)}`;
                console.log(`[Cinepro] Proxying MultiEmbed initial request via corsproxy.io`);
                const resolved = await axios.get(proxyUrl, { headers: this.headers, timeout: 8000 });
                // Note: resolved.request.res.responseUrl might be the proxy URL now, need to be careful if we rely on redirection updates
                // But usually we just need the body or the final effective URL if it redirects. 
                // For MultiEmbed, the important part is getting the content or the resolved 'real' URL if it was a shortlink.
                // Assuming baseUrl doesn't drastically change structure or we can extract it.
                // If corsproxy follows redirects, resolved.data is the destination content.
            }
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
                    // Proxy the VIP URL fetch as well (it's a GET)
                    const proxyVipUrl = `https://corsproxy.io/?${encodeURIComponent(vipUrl)}`;
                    const resp3 = await axios.get(proxyVipUrl, { headers: this.headers, timeout: 5000 });
                    const $2 = cheerio.load(resp3.data);
                    let iframeUrl = $2('iframe').attr('src');
                    if (!iframeUrl) continue;

                    // Proxy the iframe fetch (GET)
                    const proxyIframeUrl = `https://corsproxy.io/?${encodeURIComponent(iframeUrl)}`;
                    const resp4 = await axios.get(proxyIframeUrl, { headers: this.headers, timeout: 5000 });
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

    // --- AutoEmbed Logic ---
    async getAutoEmbed(tmdbId, season, episode, host, fetcher = null) {
        const type = season && episode ? 'tv' : 'movie';
        const url = type === 'tv'
            ? `https://test.autoembed.cc/api/server?id=${tmdbId}&ss=${season}&ep=${episode}`
            : `https://test.autoembed.cc/api/server?id=${tmdbId}`;
        const headers = { 'Referer': 'https://player.vidsrc.co/', 'Origin': 'https://player.vidsrc.co/', 'User-Agent': this.userAgent };
        const streams = [];
        const numberOfServers = 6;
        for (let i = 1; i <= numberOfServers; i++) {
            try {
                const serverUrl = `${url}&sr=${i}`;
                let responseData;

                if (fetcher) {
                    // Use Puppeteer fetcher if available
                    try {
                        console.log(`[Cinepro] Using custom fetcher for: ${serverUrl}`);
                        const fetched = await fetcher(serverUrl, { headers });
                        // fetcher should return object with 'data' property containing JSON (string or object)
                        responseData = typeof fetched.data === 'string' ? JSON.parse(fetched.data) : fetched.data;
                    } catch (err) {
                        console.error(`[Cinepro] Custom fetcher failed: ${err.message}`);
                        // Fallback to axios if fetcher fails? or continue
                        continue;
                    }
                } else {
                    // Use CorsProxy.io here too for standard AutoEmbed requests
                    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(serverUrl)}`;
                    // console.log(`[Cinepro] Proxying AutoEmbed via corsproxy.io: ${serverUrl}`);
                    const response = await axios.get(proxyUrl, { headers, timeout: 8000 });
                    responseData = response.data;
                }

                if (responseData && responseData.data) {
                    const decrypted = decryptData(responseData.data);
                    let directUrl = decrypted.url;
                    if (directUrl.includes('embed-proxy')) {
                        const urlMatch = directUrl.match(/[?&]url=([^&]+)/);
                        if (urlMatch) directUrl = decodeURIComponent(urlMatch[1]);
                    }
                    streams.push({ server: `AutoEmbed Server ${i}`, link: directUrl, type: directUrl.includes('.mp4') ? 'mp4' : 'hls', quality: 'Auto', lang: 'VO', headers: headers });
                }
            } catch (e) {
                console.error(`❌ [Cinepro] AutoEmbed Server ${i} failed: ${e.message}`);
            }
        }
        console.log(`✅ [Cinepro] AutoEmbed finished with ${streams.length} streams`);
        return streams;
    }
}
