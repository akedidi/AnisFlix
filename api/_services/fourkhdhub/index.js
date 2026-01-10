
import axios from 'axios';
import * as cheerio from 'cheerio';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

// ==========================================
// HELPERS
// ==========================================

// ROT13 Implementation
function rot13(str) {
    return str.replace(/[a-zA-Z]/g, function (c) {
        return String.fromCharCode((c <= 'Z' ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26);
    });
}

// Levenshtein Distance Implementation (for title matching)
function levenshtein(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix = [];

    // increment along the first column of each row
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    // increment each column in the first row
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    // Fill in the rest of the matrix
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    Math.min(
                        matrix[i][j - 1] + 1, // insertion
                        matrix[i - 1][j] + 1 // deletion
                    )
                );
            }
        }
    }

    return matrix[b.length][a.length];
}

// Bytes Parser (Simple regex based)
// Returns matches like "1.2 GB"
function parseBytes(text) {
    const match = text.match(/([\d.]+ ?[GM]B)/i);
    return match ? match[1].toUpperCase() : null;
}

// Country Code Finder (Simple detection from flags/text)
function findCountryCodes(html) {
    const codes = [];
    if (html.includes('🇮🇳') || html.includes('Hindi')) codes.push('hi');
    if (html.includes('🇺🇸') || html.includes('English') || html.includes('Eng')) codes.push('en');
    // Default to multi if mixed or unclear
    if (codes.length === 0) codes.push('multi');
    return codes;
}


// ==========================================
// SCRAPER CLASS
// ==========================================

export class FourKHDHubScraper {
    constructor() {
        this.baseUrl = 'https://4khdhub.dad';
        this.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

        // Initialize Cookie Jar and Axios Client
        this.jar = new CookieJar();
        this.client = wrapper(axios.create({
            jar: this.jar,
            headers: {
                'User-Agent': this.userAgent,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5'
            }
        }));

        // Cache for Base URL resolution
        this.finalBaseUrl = null;
        this.lastBaseUrlCheck = 0;
    }

    async getBrowser() {
        let executablePath = await chromium.executablePath();
        if (!executablePath) {
            // Local fallback for macOS (User's OS)
            executablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
        }

        return await puppeteer.launch({
            args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox'],
            defaultViewport: chromium.defaultViewport,
            executablePath: executablePath,
            headless: chromium.headless === false ? false : 'new', // Handle local vs prod headless
            ignoreHTTPSErrors: true
        });
    }

    async fetchWithBrowser(url, browser, referer) {
        let page = null;
        try {
            page = await browser.newPage();
            await page.setUserAgent(this.userAgent);
            if (referer) {
                await page.setExtraHTTPHeaders({ 'Referer': referer });
            }

            // Block images/fonts to speed up
            await page.setRequestInterception(true);
            page.on('request', (req) => {
                if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
                    req.abort();
                } else {
                    req.continue();
                }
            });

            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });

            // Get final URL after redirects
            const finalUrl = page.url();
            const content = await page.content();

            await page.close();
            return { content, finalUrl };
        } catch (error) {
            if (page) await page.close().catch(() => { });
            throw error;
        }
    }

    async getBaseUrl(logs = []) {
        const log = (msg) => { logs.push(msg); console.log(msg); };
        const now = Date.now();
        if (this.finalBaseUrl && (now - this.lastBaseUrlCheck < 3600000)) { // 1 hour TTL
            return this.finalBaseUrl;
        }

        try {
            log(`📡 [4KHDHub] Resolving Base URL...`);
            const response = await this.client.get(this.baseUrl, {
                maxRedirects: 5,
                validateStatus: status => status < 400
            });

            if (response.request && response.request.res && response.request.res.responseUrl) {
                this.finalBaseUrl = new URL(response.request.res.responseUrl).origin;
            } else {
                this.finalBaseUrl = this.baseUrl;
            }

            this.lastBaseUrlCheck = now;
            log(`📡 [4KHDHub] Resolved Base URL: ${this.finalBaseUrl}`);
            return this.finalBaseUrl;
        } catch (error) {
            log(`⚠️ [4KHDHub] Failed to resolve base URL, using default: ${error.message}`);
            return this.baseUrl;
        }
    }

    async fetchPageUrl(name, year, isSeries, season, logs = []) {
        const log = (msg) => { logs.push(msg); console.log(msg); };
        const baseUrl = await this.getBaseUrl(logs);
        const query = `${name} ${year}`;
        const searchUrl = `${baseUrl}/?s=${encodeURIComponent(query)}`;

        log(`🔍 [4KHDHub] Searching: ${searchUrl}`);

        try {
            const response = await this.client.get(searchUrl, {
                headers: {
                    'Referer': this.baseUrl
                }
            });

            const $ = cheerio.load(response.data);

            // Filter valid cards
            const candidates = $('.movie-card').filter((i, el) => {
                const formatText = $(el).find('.movie-card-format').text();

                // Format check: "Series" for TV, "Movies" for Movie
                const targetFormat = isSeries ? 'Series' : 'Movies';
                if (!formatText.includes(targetFormat)) return false;

                // Year check
                const cardYear = parseInt($(el).find('.movie-card-meta').text()) || 0;
                if (year && Math.abs(cardYear - parseInt(year)) > 1) return false;

                return true;
            }).get();

            // Find best match by title Levenshtein distance
            let bestMatch = null;
            let bestDist = 100; // High initial distance

            const normalizedSearchName = name.toLowerCase().replace(/[^a-z0-9]/g, '');

            for (const el of candidates) {
                const $el = $(el);
                let title = $el.find('.movie-card-title').text().replace(/\[.*?]/g, '').trim();
                const normalizedTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '');

                const dist = levenshtein(normalizedTitle, normalizedSearchName);

                // Allow exact match or very close match
                if (dist < 5 && dist < bestDist) {
                    bestDist = dist;
                    bestMatch = $el.attr('href');
                }
            }

            if (bestMatch) {
                if (bestMatch.startsWith('/')) {
                    bestMatch = `${baseUrl}${bestMatch}`;
                }
                log(`✅ [4KHDHub] Found Page: ${bestMatch}`);
                return bestMatch;
            }

            log('⚠️ [4KHDHub] No matching page found');
            return null;

        } catch (error) {
            log(`❌ [4KHDHub] Search failed: ${error.message}`);
            return null;
        }
    }

    // Resolve HubCloud Redirect URL (rot13 or var url = ...)
    async resolveRedirectUrl(redirectUrl, logs = []) {
        const log = (msg) => { logs.push(msg); console.log(msg); };
        try {
            const response = await this.client.get(redirectUrl); // Headers inherited from client default
            const html = response.data;

            // Pattern 1: Rot13 ('o','...')
            const redirectDataMatch = html.match(/'o','(.*?)'/);
            if (redirectDataMatch) {
                try {
                    const step1 = Buffer.from(redirectDataMatch[1], 'base64').toString('binary');
                    const step2 = Buffer.from(step1, 'base64').toString('binary');
                    const step3 = rot13(step2);
                    const step4 = Buffer.from(step3, 'base64').toString('binary');
                    const json = JSON.parse(step4);
                    if (json && json.o) {
                        const finalUrl = Buffer.from(json.o, 'base64').toString('binary');
                        return finalUrl;
                    }
                } catch (e) {
                    // silent failure or log check
                }
            }

            // Pattern 2: HubDrive s('o','...')
            const hubDriveMatch = html.match(/s\('o','(.*?)'/);
            if (hubDriveMatch) {
                try {
                    const input = hubDriveMatch[1];
                    const step1 = Buffer.from(input, 'base64').toString('binary');
                    const step2 = Buffer.from(step1, 'base64').toString('binary');
                    const step3 = rot13(step2);
                    const step4 = Buffer.from(step3, 'base64').toString('binary');
                    const json = JSON.parse(step4);
                    if (json && json.o) {
                        return Buffer.from(json.o, 'base64').toString('binary');
                    }
                } catch (e) {
                    // silent
                }
            }

            // Pattern 3: Simple redirect
            const simpleMatch = html.match(/var url ?= ?'(.*?)'/);
            if (simpleMatch) {
                return simpleMatch[1];
            }

            return null;
        } catch (error) {
            log(`❌ [4KHDHub] Redirect resolution failed: ${error.message}`);
            return null;
        }
    }

    async extractSourceResults($, el, referer, type, browser, logs = []) {
        const log = (msg) => { logs.push(msg); console.log(msg); };
        const $el = $(el);
        const localHtml = $el.html();

        const size = parseBytes(localHtml) || "Unknown Size";
        const heightMatch = localHtml.match(/\d{3,}p/);
        const quality = heightMatch ? heightMatch[0] : "HD";

        // 1. Try finding HubCloud link directly
        let startLink = null;
        $el.find('a').each((i, a) => {
            if ($(a).text().includes('HubCloud')) {
                startLink = $(a).attr('href');
            }
        });

        // 2. If no HubCloud, look for HubDrive
        if (!startLink) {
            $el.find('a').each((i, a) => {
                if ($(a).text().includes('HubDrive') || $(a).text().includes('Drive')) {
                    startLink = $(a).attr('href');
                }
            });
        }

        if (!startLink) return null;

        try {
            // Step 1: Resolve the initial link (HubDrive -> HubCloud OR HubCloud -> Landing)
            // Use Axios first for speed, fallback to browser if needed? 
            // Actually, HubCloud IS the problem, so use Browser directly if available

            let resolvedUrl = null;
            let finalPageUrl = null;
            let pageContent = null;

            log(`🚀 [4KHDHub] Using Puppeteer for: ${startLink}`);

            // Fetch the start link with Puppeteer to handle all redirects and JS
            const { content, finalUrl } = await this.fetchWithBrowser(startLink, browser, referer);
            pageContent = content;
            resolvedUrl = finalUrl;

            log(`✅ [4KHDHub] Browser landed on: ${resolvedUrl}`);

            // Check if we are on the landing page with "var url ="
            const redirectMatch = pageContent.match(/var url ?= ?'(.*?)'/);
            if (redirectMatch) {
                finalPageUrl = redirectMatch[1];
                log(`✅ [4KHDHub] Found JS redirect: ${finalPageUrl}`);

                // One more hop
                const res2 = await this.fetchWithBrowser(finalPageUrl, browser, resolvedUrl);
                pageContent = res2.content;
                finalPageUrl = res2.finalUrl;
            } else {
                finalPageUrl = resolvedUrl;
            }

            log(`⬇️ [4KHDHub] Parsing Final Page: ${finalPageUrl}`);
            const $hub = cheerio.load(pageContent);

            const results = [];

            // FSL Links
            $hub('a').each((i, a) => {
                const text = $hub(a).text();
                const href = $hub(a).attr('href');

                if ((href && text.includes('FSL') && !text.includes('FSLv2')) || (href && text.includes('[HubCloud Server]'))) {
                    results.push({
                        url: href,
                        quality: quality,
                        provider: 'FourKHDHub',
                        label: `HubCloud - ${quality}`,
                        size: size,
                        type: 'mkv'
                    });
                }

                if (href && text.includes('PixelServer')) {
                    const dlUrl = href.replace('/u/', '/api/file/');
                    results.push({
                        url: dlUrl,
                        quality: quality,
                        provider: 'FourKHDHub',
                        label: `HubCloud (Pixel) - ${quality}`,
                        size: size,
                        type: 'mkv'
                    });
                }
            });

            return results;

        } catch (error) {
            log(`⚠️ [4KHDHub] Extraction failed: ${error.message}`);
            return null;
        }
    }

    async getStreams(tmdbId, type = 'movie', season = null, episode = null, tmdbInfo = null, logs = []) {
        const log = (msg) => { logs.push(msg); console.log(msg); };
        if (!tmdbInfo) throw new Error("TMDB Info required (Title/Year)");

        const { title, year } = tmdbInfo;
        const isSeries = type === 'tv';

        const pageUrl = await this.fetchPageUrl(title, year, isSeries, season, logs);
        if (!pageUrl) return [];

        let browser = null;
        try {
            // Launch Browser ONCE
            log("🌐 [4KHDHub] Launching Browser...");
            browser = await this.getBrowser();

            const response = await this.client.get(pageUrl, {
                headers: {
                    'Referer': this.baseUrl
                }
            });

            const $ = cheerio.load(response.data);
            const promises = [];

            if (isSeries) {
                const seasonStr = `S${String(season).padStart(2, '0')}`;
                const epiStr = `Episode-${String(episode).padStart(2, '0')}`;
                const episodeItems = $('.episode-item').filter((i, el) => {
                    return $(el).find('.episode-title').text().includes(seasonStr);
                });

                episodeItems.each((i, el) => {
                    const dlItem = $(el).find('.episode-download-item').filter((j, item) => {
                        return $(item).text().includes(epiStr);
                    });
                    if (dlItem.length > 0) promises.push(this.extractSourceResults($, dlItem, pageUrl, type, browser, logs));
                });
            } else {
                $('.download-item').each((i, el) => {
                    promises.push(this.extractSourceResults($, el, pageUrl, type, browser, logs));
                });
            }

            const resultsNested = await Promise.all(promises);
            const allStreams = resultsNested.flat().filter(r => r !== null);

            log(`🎬 [4KHDHub] Found ${allStreams.length} streams`);
            return allStreams;

        } catch (error) {
            log(`❌ [4KHDHub] Stream extraction failed: ${error.message}`);
            return [];
        } finally {
            if (browser) {
                await browser.close().catch(() => { });
                log("🌐 [4KHDHub] Browser Closed.");
            }
        }
    }
}
