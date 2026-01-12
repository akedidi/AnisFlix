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
        this.userAgent = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36';
        this.headers = {
            'User-Agent': this.userAgent,
            'Referer': 'https://multiembed.mov',
            'X-Requested-With': 'XMLHttpRequest'
        };
    }

    /**
     * Main entry point to get streams. 
     * Orchestrates MultiEmbed and AutoEmbed (Fallback).
     */
    async getStreams(tmdbId, season = null, episode = null, imdbId = null, host = null) {
        console.log(`🔍 [Cinepro] Getting streams for TMDB:${tmdbId} IMDB:${imdbId} S:${season} E:${episode}`);
        const streams = [];

        // 1. Try MultiEmbed (Primary)
        if (imdbId) {
            try {
                const multiEmbedStreams = await this.getMultiEmbed(imdbId, season, episode);
                if (multiEmbedStreams && multiEmbedStreams.length > 0) {
                    multiEmbedStreams.forEach(stream => {
                        // Proxy header-restricted streams
                        if (host) {
                            const protocol = 'https';
                            const proxiedLink = `${protocol}://${host}/api/movix-proxy?path=cinepro-proxy&url=${encodeURIComponent(stream.link)}&headers=${encodeURIComponent(JSON.stringify(stream.headers))}`;
                            stream.link = proxiedLink;
                        }
                        streams.push(stream);
                    });
                }
            } catch (e) {
                console.error(`❌ [Cinepro] MultiEmbed failed: ${e.message}`);
            }
        }

        // 2. Try AutoEmbed (Fallback) if few streams found (or always try?)
        // Let's always try for more sources if < 2, or if explicitly requested deep scan.
        // For now, if MultiEmbed has streams, we usually trust them. But if user says "Multi Res", maybe AutoEmbed has more.
        if (streams.length === 0) {
            console.log('⚠️ [Cinepro] MultiEmbed returned no streams, trying AutoEmbed...');
            try {
                const autoEmbedStreams = await this.getAutoEmbed(tmdbId, season, episode, host);
                if (autoEmbedStreams && autoEmbedStreams.length > 0) {
                    streams.push(...autoEmbedStreams);
                }
            } catch (e) {
                console.error(`❌ [Cinepro] AutoEmbed failed: ${e.message}`);
            }
        }

        return streams;
    }

    // --- MultiEmbed Logic ---
    async getMultiEmbed(imdbId, season, episode) {
        let baseUrl = `https://multiembed.mov/?video_id=${imdbId}`;
        if (season && episode) {
            baseUrl += `&s=${season}&e=${episode}`;
        }

        console.log(`🔍 [Cinepro] MultiEmbed URL: ${baseUrl}`);
        // Return array of streams
        const foundStreams = [];

        try {
            // Initial GET to resolve redirects and cookies
            if (baseUrl.includes('multiembed')) {
                const resolved = await axios.get(baseUrl, { headers: this.headers, timeout: 5000 });
                baseUrl = resolved.request.res.responseUrl || baseUrl;
            }

            const defaultDomain = new URL(baseUrl).origin + '/';

            const dataPayload = {
                'button-click': 'ZEhKMVpTLVF0LVBTLVF0LVAtMGs1TFMtUXpPREF0TC0wLVYzTi0wVS1RTi0wQTFORGN6TmprLTU=',
                'button-referer': ''
            };

            const resp1 = await axios.post(baseUrl, new URLSearchParams(dataPayload), { headers: this.headers, timeout: 5000 });
            const tokenMatch = resp1.data.match(/load_sources\(\"(.*?)\"\)/);
            if (!tokenMatch) throw new Error('Token not found');
            const token = tokenMatch[1];

            const resp2 = await axios.post(
                'https://streamingnow.mov/response.php',
                new URLSearchParams({ token }),
                { headers: this.headers, timeout: 5000 }
            );
            const $ = cheerio.load(resp2.data);

            // Find ALL VIP sources
            const vipSources = [];
            $('li').each((i, el) => {
                const txt = $(el).text().toLowerCase();
                const id = $(el).attr('data-id');
                if (txt.includes('vipstream') && id) {
                    vipSources.push({
                        id,
                        server: $(el).attr('data-server'),
                        name: txt
                    });
                }
            });

            if (vipSources.length === 0) throw new Error('No VIP source found');

            // Try ALL sources
            for (const source of vipSources) {
                try {
                    const serverId = source.server;
                    const videoId = source.id;

                    const vipUrl = `https://streamingnow.mov/playvideo.php?video_id=${videoId}&server_id=${serverId}&token=${token}&init=1`;
                    const resp3 = await axios.get(vipUrl, { headers: this.headers, timeout: 5000 });

                    const $2 = cheerio.load(resp3.data);
                    let iframeUrl = $2('iframe').attr('src');

                    if (!iframeUrl) {
                        // Check for Captcha
                        if (resp3.data.includes('captcha') || resp3.data.includes('Wait a moment')) {
                            console.error(`⚠️ [Cinepro] Captcha/Block on source ${source.name}`);
                        }
                        continue;
                    }

                    const resp4 = await axios.get(iframeUrl, { headers: this.headers, timeout: 5000 });
                    let videoUrl = null;

                    // 1. Hunter Pack Match
                    const hunterMatch = resp4.data.match(/\(\s*function\s*\([^\)]*\)\s*\{[\s\S]*?\}\s*\(\s*(.*?)\s*\)\s*\)/);
                    if (hunterMatch) {
                        try {
                            let dataArray;
                            try { dataArray = new Function('return [' + hunterMatch[1] + ']')(); }
                            catch { }

                            if (Array.isArray(dataArray) && dataArray.length >= 6) {
                                const [h, u, n, t, e, r] = dataArray;
                                const decoded = decodeHunter(h, u, n, t, e, r);
                                const videoMatch = decoded.match(/file:"(https?:\/\/[^"]+)"/);
                                if (videoMatch) videoUrl = videoMatch[1];
                            }
                        } catch (e) { console.error('Hunter decode error', e); }
                    }

                    // 2. Direct File Match
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

                        foundStreams.push({
                            server: serverLabel,
                            link: videoUrl,
                            type: 'hls',
                            quality: 'Auto',
                            lang: 'VO',
                            headers: {
                                'Referer': defaultDomain,
                                'User-Agent': this.userAgent,
                                'Origin': defaultDomain
                            }
                        });
                    }
                } catch (err) {
                    console.error(`[Cinepro] Error processing source ${source.name}: ${err.message}`);
                }
            }

            return foundStreams;
        } catch (e) {
            throw e;
        }
    }

    // --- AutoEmbed Logic ---
    async getAutoEmbed(tmdbId, season, episode, host) {
        const type = season && episode ? 'tv' : 'movie';
        const url = type === 'tv'
            ? `https://test.autoembed.cc/api/server?id=${tmdbId}&ss=${season}&ep=${episode}`
            : `https://test.autoembed.cc/api/server?id=${tmdbId}`;

        const headers = {
            'Referer': 'https://player.vidsrc.co/',
            'Origin': 'https://player.vidsrc.co/',
            'User-Agent': this.userAgent
        };

        const streams = [];
        // Increased range to check more AutoEmbed servers
        const numberOfServers = 6;

        console.log(`🔍 [Cinepro] AutoEmbed URL Base: ${url}`);

        for (let i = 1; i <= numberOfServers; i++) {
            try {
                const serverUrl = `${url}&sr=${i}`;
                const response = await axios.get(serverUrl, { headers, timeout: 5000 });

                if (response.data && response.data.data) {
                    const decrypted = decryptData(response.data.data);
                    let directUrl = decrypted.url;

                    if (directUrl.includes('embed-proxy')) {
                        const urlMatch = directUrl.match(/[?&]url=([^&]+)/);
                        if (urlMatch) directUrl = decodeURIComponent(urlMatch[1]);
                    }

                    if (host) {
                        const protocol = 'https';
                        const proxiedLink = `${protocol}://${host}/api/movix-proxy?path=cinepro-proxy&url=${encodeURIComponent(directUrl)}&headers=${encodeURIComponent(JSON.stringify(headers))}`;
                        directUrl = proxiedLink;
                    }

                    streams.push({
                        server: `AutoEmbed Server ${i}`,
                        link: directUrl,
                        type: directUrl.includes('.mp4') ? 'mp4' : 'hls',
                        quality: 'Auto',
                        lang: 'VO',
                        headers: headers
                    });
                }
            } catch (e) {
                // Ignore individual server errors
            }
        }
        return streams;
    }
}
