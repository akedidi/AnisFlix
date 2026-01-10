const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
const puppeteerExtra = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");

puppeteerExtra.use(StealthPlugin());

const app = express();
app.use(express.json());
app.use(cors());

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Track active browsers for cleanup
const activeBrowsers = new Set();

// Graceful shutdown handler
process.on('SIGINT', async () => {
    console.log('\nShutting down gracefully...');
    for (const browser of activeBrowsers) {
        try {
            await browser.close();
        } catch (e) {
            console.error('Error closing browser:', e.message);
        }
    }
    process.exit(0);
});

process.on('SIGTERM', async () => {
    for (const browser of activeBrowsers) {
        try {
            await browser.close();
        } catch (e) { }
    }
    process.exit(0);
});

async function extractStreamAndSubs(url, opts = {}) {
    const timeoutMs = opts.timeoutMs || 20000;
    let browser = null;
    let page = null;

    try {
        browser = await puppeteerExtra.launch({
            headless: 'new',
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-blink-features=AutomationControlled",
                "--disable-dev-shm-usage",
                "--disable-accelerated-2d-canvas",
                "--no-first-run",
                "--no-zygote",
                "--disable-gpu",
                // ADD THESE FOR BETTER STEALTH
                "--disable-web-security",
                "--disable-features=IsolateOrigins,site-per-process",
                "--window-size=1920,1080"
            ]
        });

        activeBrowsers.add(browser);
        page = await browser.newPage();

        page.setDefaultTimeout(30000);
        page.setDefaultNavigationTimeout(60000);

        // MORE REALISTIC USER AGENT
        await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36");

        // ADD MORE HEADERS
        await page.setExtraHTTPHeaders({
            "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            "accept-language": "en-US,en;q=0.9",
            "accept-encoding": "gzip, deflate, br",
            "referer": "https://vidsrc.cc/",
            "sec-ch-ua": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": '"Windows"',
            "sec-fetch-dest": "document",
            "sec-fetch-mode": "navigate",
            "sec-fetch-site": "same-origin",
            "upgrade-insecure-requests": "1"
        });

        await page.setViewport({ width: 1920, height: 1080 });

        // ENHANCED STEALTH
        await page.evaluateOnNewDocument(() => {
            // Overwrite the `navigator.webdriver` property
            Object.defineProperty(navigator, 'webdriver', { get: () => false });

            // Mock languages
            Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });

            // Mock plugins
            Object.defineProperty(navigator, 'plugins', {
                get: () => [
                    { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
                    { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' },
                    { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' }
                ]
            });

            // Mock permissions
            const originalQuery = window.navigator.permissions.query;
            window.navigator.permissions.query = (parameters) => (
                parameters.name === 'notifications' ?
                    Promise.resolve({ state: Notification.permission }) :
                    originalQuery(parameters)
            );

            // Hide automation
            delete navigator.__proto__.webdriver;

            // Mock chrome object
            window.chrome = {
                runtime: {},
                loadTimes: function () { },
                csi: function () { },
                app: {}
            };

            // Remove Puppeteer traces
            const newProto = navigator.__proto__;
            delete newProto.webdriver;
            navigator.__proto__ = newProto;
        });

        let foundStream = null;
        const streamSet = new Set();
        const subsMap = new Map();
        let responseCount = 0;
        let requestCount = 0;

        const registerStream = (u) => {
            if (!u) return;
            if (!streamSet.has(u)) {
                console.log(`[STREAM FOUND] ${u}`);
                streamSet.add(u);
                if (!foundStream) foundStream = u;
            }
        };

        const registerSub = (u, meta = {}) => {
            if (!u) return;
            if (!subsMap.has(u)) {
                console.log(`[SUBTITLE FOUND] ${u} (${meta.source})`);
                subsMap.set(u, Object.assign({
                    url: u,
                    label: meta.label || null,
                    lang: meta.lang || null,
                    source: meta.source || null
                }, meta));
            }
        };

        page.on("response", async (res) => {
            responseCount++;
            try {
                const rUrl = res.url();
                const headers = res.headers() || {};
                const ct = (headers["content-type"] || "").toLowerCase();

                if (rUrl.match(/\.m3u8(\?|$)/i) || ct.includes("mpegurl") || ct.includes("vnd.apple.mpegurl")) {
                    registerStream(rUrl);
                }

                if (rUrl.match(/\.(?:vtt|srt|ttml|dfxp)(?:\?|$)/i) || ct.includes("vtt") || ct.includes("subtitle") || ct.includes("xml")) {
                    registerSub(rUrl, { source: "response", contentType: ct });
                }

                if (ct.includes("application/json") || ct.includes("text/html") || ct.includes("application/javascript") || ct.includes("text/plain")) {
                    let text = "";
                    try {
                        text = await res.text();
                    } catch (e) {
                        text = "";
                    }
                    if (text) {
                        const subs = text.match(/https?:\/\/[^"'\\\s]+?\.(?:vtt|srt|ttml|dfxp)[^"'\\\s]*/ig) || [];
                        subs.forEach(s => registerSub(s, { source: "embedded-json/html" }));
                        const m3u8s = text.match(/https?:\/\/[^"'\\\s]+?\.m3u8[^"'\\\s]*/ig) || [];
                        m3u8s.forEach(m => registerStream(m));
                    }
                }
            } catch (e) {
                console.error('[RESPONSE ERROR]', e.message);
            }
        });

        page.on("request", (req) => {
            requestCount++;
            try {
                const rUrl = req.url();
                if (rUrl.match(/\.m3u8(\?|$)/i)) registerStream(rUrl);
                if (rUrl.match(/\.(?:vtt|srt|ttml|dfxp)(?:\?|$)/i)) registerSub(rUrl, { source: "request" });
            } catch (e) { }
        });

        console.log(`[NAVIGATING] ${url}`);
        await page.goto(url, {
            waitUntil: "domcontentloaded", // Changed from networkidle2
            timeout: 60000
        });

        // WAIT FOR PAGE TO FULLY LOAD
        await sleep(3000);

        console.log(`[NAVIGATION COMPLETE] Responses: ${responseCount}, Requests: ${requestCount}`);

        // TAKE SCREENSHOT FOR DEBUGGING
        try {
            const screenshot = await page.screenshot({ encoding: 'base64', fullPage: false });
            console.log('[SCREENSHOT] Page screenshot (base64):', screenshot.substring(0, 100) + '...');
            // You can decode this base64 to see what the page looks like
        } catch (e) {
            console.error('[SCREENSHOT ERROR]', e.message);
        }

        // GET PAGE CONTENT FOR DEBUGGING
        const pageContent = await page.content();
        console.log('[PAGE CONTENT LENGTH]', pageContent.length);
        console.log('[PAGE CONTENT SAMPLE]', pageContent.substring(0, 500));

        const domScan = await page.evaluate(() => {
            const results = {
                tracks: [],
                htmlSubs: [],
                sources: [],
                playerCandidates: [],
                iframes: [],
                bodyText: document.body ? document.body.innerText.substring(0, 500) : '',
                title: document.title
            };

            try {
                // Check for iframes
                const iframeEls = Array.from(document.querySelectorAll('iframe'));
                results.iframes = iframeEls.map(f => ({ src: f.src, id: f.id, className: f.className }));

                const trackEls = Array.from(document.querySelectorAll('track[kind="subtitles"], track[kind="captions"], track'));
                trackEls.forEach(t => results.tracks.push({
                    src: t.src,
                    srclang: t.srclang || null,
                    label: t.label || null,
                    kind: t.kind || null
                }));

                const srcMatches = (document.documentElement.innerHTML || '').match(/https?:\/\/[^"'\\\s]+?\.(?:vtt|srt|ttml|dfxp|m3u8)[^"'\\\s]*/ig) || [];
                results.htmlSubs = srcMatches.slice(0, 200);

                const videoSources = Array.from(document.querySelectorAll('video source')).map(s => s.src).filter(Boolean);
                results.sources = videoSources;

                const playerCandidates = [];
                try {
                    for (const k of Object.keys(window)) {
                        if (k.toLowerCase().includes('player') || k.toLowerCase().includes('video')) {
                            try {
                                playerCandidates.push(String(window[k]));
                            } catch (e) { }
                        }
                    }
                } catch (e) { }
                results.playerCandidates = playerCandidates.slice(0, 20);
            } catch (e) {
                results.error = e.message;
            }
            return results;
        });

        console.log(`[DOM SCAN] Tracks: ${domScan.tracks.length}, HTML matches: ${domScan.htmlSubs.length}, Sources: ${domScan.sources.length}, Player candidates: ${domScan.playerCandidates.length}, iframes: ${domScan.iframes.length}`);
        console.log(`[PAGE TITLE] ${domScan.title}`);
        console.log(`[BODY TEXT] ${domScan.bodyText}`);
        console.log(`[IFRAMES]`, JSON.stringify(domScan.iframes));

        domScan.tracks.forEach(t => {
            if (t.src) registerSub(t.src, { label: t.label, lang: t.srclang, source: "dom-track" });
        });
        domScan.htmlSubs.forEach(s => registerSub(s, { source: "dom-scan" }));
        domScan.sources.forEach(s => {
            if (s.match(/\.m3u8(\?|$)/i)) registerStream(s);
        });

        for (const candidate of domScan.playerCandidates) {
            const matches = (candidate || '').match(/https?:\/\/[^"'\\\s]+?\.(?:vtt|srt|ttml|dfxp|m3u8)[^"'\\\s]*/ig) || [];
            matches.forEach(m => {
                if (m.match(/\.m3u8(\?|$)/i)) registerStream(m);
                else registerSub(m, { source: "player-config" });
            });
        }

        const playSelectors = [
            'button[aria-label*="play"]',
            '.vjs-play-control',
            '.plyr__control--play',
            '.jw-icon-play',
            '.play',
            '.btn-play',
            'button.play'
        ];

        for (const sel of playSelectors) {
            try {
                const exists = await page.$(sel);
                if (exists) {
                    console.log(`[CLICKING] ${sel}`);
                    await Promise.all([
                        page.click(sel).catch(() => { }),
                        sleep(300)
                    ]);
                }
            } catch (e) { }
        }

        try {
            const videoHandle = await page.$('video');
            if (videoHandle) {
                console.log('[CLICKING] video element');
                await videoHandle.click().catch(() => { });
            }
        } catch (e) { }

        console.log('[WAITING] Monitoring for streams...');
        const start = Date.now();
        let lastLog = start;
        while ((Date.now() - start) < timeoutMs) {
            try {
                const perfEntries = await page.evaluate(() =>
                    performance.getEntries().map(e => e.name).filter(Boolean)
                );
                (perfEntries || []).forEach(n => {
                    if (n.match(/\.m3u8(\?|$)/i)) registerStream(n);
                    if (n.match(/\.(?:vtt|srt|ttml|dfxp)(?:\?|$)/i)) registerSub(n, { source: "performance" });
                });

                if (Date.now() - lastLog > 5000) {
                    console.log(`[PROGRESS] Elapsed: ${Math.floor((Date.now() - start) / 1000)}s, Streams: ${streamSet.size}, Subs: ${subsMap.size}`);
                    lastLog = Date.now();
                }
            } catch (e) { }
            if (foundStream && subsMap.size) break;
            await sleep(800);
        }

        const finalStream = foundStream || (streamSet.size ? Array.from(streamSet)[0] : null);
        const subtitles = Array.from(subsMap.values()).map(s => ({
            url: s.url,
            label: s.label || null,
            lang: s.lang || null,
            source: s.source || null
        }));

        console.log(`[FINAL RESULT] Stream: ${finalStream ? 'YES' : 'NO'}, Subtitles: ${subtitles.length}`);

        return { stream: finalStream, subtitles };

    } catch (err) {
        console.error('[EXTRACTION ERROR]', err.message);
        console.error('[STACK]', err.stack);
        throw err;
    } finally {
        try {
            if (page) await page.close();
        } catch (e) {
            console.error('Error closing page:', e.message);
        }

        try {
            if (browser) {
                activeBrowsers.delete(browser);
                await browser.close();
            }
        } catch (e) {
            console.error('Error closing browser:', e.message);
        }
    }
}

// ========== STREAM PROXY ENDPOINT ==========
app.get("/proxy/stream", async (req, res) => {
    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ error: "URL parameter required" });
    }

    try {
        console.log('Proxying stream:', url);

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': '*/*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://vidsrc.cc/',
                'Origin': 'https://vidsrc.cc',
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'cross-site',
            },
            redirect: 'follow',
            timeout: 30000
        });

        if (!response.ok) {
            console.error('Stream fetch failed:', response.status, response.statusText);
            return res.status(response.status).json({
                error: `Failed to fetch stream: ${response.status} ${response.statusText}`
            });
        }

        const contentType = response.headers.get('content-type') || 'application/vnd.apple.mpegurl';

        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', '*');
        res.setHeader('Content-Type', contentType);

        // For m3u8 playlists, rewrite URLs to point back to our proxy
        if (url.includes('.m3u8')) {
            const text = await response.text();
            console.log('M3U8 playlist length:', text.length);

            // Get base URL for relative paths
            const baseUrl = url.substring(0, url.lastIndexOf('/') + 1);

            // Rewrite the playlist to proxy all URLs through our server
            const modifiedText = text.split('\n').map(line => {
                const trimmed = line.trim();

                // Skip comments and empty lines
                if (!trimmed || trimmed.startsWith('#')) {
                    return line;
                }

                // If it's already absolute, proxy it
                if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
                    return `/proxy/stream?url=${encodeURIComponent(trimmed)}`;
                }

                // Make relative URLs absolute and proxy them
                const absoluteUrl = baseUrl + trimmed;
                return `/proxy/stream?url=${encodeURIComponent(absoluteUrl)}`;
            }).join('\n');

            res.send(modifiedText);
        } else {
            // For video segments, just pipe through
            const contentLength = response.headers.get('content-length');
            if (contentLength) {
                res.setHeader('Content-Length', contentLength);
            }

            response.body.pipe(res);
        }

    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).json({
            error: 'Failed to proxy stream',
            details: error.message
        });
    }
});

// Handle OPTIONS for CORS preflight
app.options("/proxy/stream", (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.sendStatus(200);
});

// ========== MOVIE ENDPOINT ==========
app.get("/api/movie/:tmdbId", async (req, res) => {
    try {
        const tmdbId = req.params.tmdbId;
        if (!tmdbId) return res.status(400).json({ success: false, error: "Missing TMDb ID" });

        const embedUrl = `https://vidsrc.cc/v2/embed/movie/${tmdbId}`;
        const result = await extractStreamAndSubs(embedUrl, { timeoutMs: 25000 });

        if (!result || (!result.stream && !result.subtitles.length)) {
            return res.json({ success: false, error: "No stream or subtitles found" });
        }

        return res.json({
            success: true,
            stream: result.stream || null,
            subtitles: result.subtitles
        });
    } catch (err) {
        console.error('Movie API error:', err.message);
        return res.status(500).json({ success: false, error: err.toString() });
    }
});

// ========== TV SEASON ENDPOINT ==========
app.get("/api/tv/:tmdbId/:season", async (req, res) => {
    try {
        const { tmdbId, season } = req.params;
        if (!tmdbId || !season) {
            return res.status(400).json({ success: false, error: "Missing params" });
        }

        const embedUrl = `https://vidsrc.cc/v2/embed/tv/${tmdbId}/${season}`;
        const result = await extractStreamAndSubs(embedUrl, { timeoutMs: 25000 });

        if (!result || (!result.stream && !result.subtitles.length)) {
            return res.json({ success: false, error: "No stream or subtitles found" });
        }

        return res.json({
            success: true,
            stream: result.stream || null,
            subtitles: result.subtitles
        });
    } catch (err) {
        console.error('TV API error:', err.message);
        return res.status(500).json({ success: false, error: err.toString() });
    }
});

// ========== TV EPISODE ENDPOINT ==========
app.get("/api/tv/:tmdbId/:season/:episode", async (req, res) => {
    try {
        const { tmdbId, season, episode } = req.params;
        if (!tmdbId || !season || !episode) {
            return res.status(400).json({ success: false, error: "Missing params" });
        }

        const embedUrl = `https://vidsrc.cc/v2/embed/tv/${tmdbId}/${season}/${episode}`;
        const result = await extractStreamAndSubs(embedUrl, { timeoutMs: 25000 });

        if (!result || (!result.stream && !result.subtitles.length)) {
            return res.json({ success: false, error: "No stream or subtitles found" });
        }

        return res.json({
            success: true,
            stream: result.stream || null,
            subtitles: result.subtitles
        });
    } catch (err) {
        console.error('TV Episode API error:', err.message);
        return res.status(500).json({ success: false, error: err.toString() });
    }
});

// ========== HEALTH CHECK ==========
app.get("/health", (req, res) => {
    res.json({
        status: "OK",
        message: "API is running",
        activeBrowsers: activeBrowsers.size
    });
});

const PORT = 9000;
const server = app.listen(PORT, () => {
    console.log(`API running on http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`Stream proxy: http://localhost:${PORT}/proxy/stream`);
});

// Handle server shutdown
server.on('close', async () => {
    console.log('Server closing, cleaning up browsers...');
    for (const browser of activeBrowsers) {
        try {
            await browser.close();
        } catch (e) { }
    }
});
