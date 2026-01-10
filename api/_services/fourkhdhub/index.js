
import axios from 'axios';
import * as cheerio from 'cheerio';

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

        // Cache for Base URL resolution
        this.finalBaseUrl = null;
        this.lastBaseUrlCheck = 0;
    }

    async getBaseUrl() {
        const now = Date.now();
        if (this.finalBaseUrl && (now - this.lastBaseUrlCheck < 3600000)) { // 1 hour TTL
            return this.finalBaseUrl;
        }

        try {
            const response = await axios.get(this.baseUrl, {
                headers: {
                    'User-Agent': this.userAgent,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5'
                },
                maxRedirects: 5,
                validateStatus: status => status < 400
            });

            if (response.request && response.request.res && response.request.res.responseUrl) {
                this.finalBaseUrl = new URL(response.request.res.responseUrl).origin;
            } else {
                this.finalBaseUrl = this.baseUrl;
            }

            this.lastBaseUrlCheck = now;
            console.log(`📡 [4KHDHub] Resolved Base URL: ${this.finalBaseUrl}`);
            return this.finalBaseUrl;
        } catch (error) {
            console.warn(`⚠️ [4KHDHub] Failed to resolve base URL, using default: ${error.message}`);
            return this.baseUrl;
        }
    }

    async fetchPageUrl(name, year, isSeries, season) {
        const baseUrl = await this.getBaseUrl();
        const query = `${name} ${year}`;
        const searchUrl = `${baseUrl}/?s=${encodeURIComponent(query)}`;

        console.log(`🔍 [4KHDHub] Searching: ${searchUrl}`);

        try {
            const response = await axios.get(searchUrl, {
                headers: {
                    'User-Agent': this.userAgent,
                    'Referer': this.baseUrl,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5'
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
                console.log(`✅ [4KHDHub] Found Page: ${bestMatch}`);
                return bestMatch;
            }

            console.log('⚠️ [4KHDHub] No matching page found');
            return null;

        } catch (error) {
            console.error(`❌ [4KHDHub] Search failed: ${error.message}`);
            return null;
        }
    }

    // Resolve HubCloud Redirect URL (rot13 or var url = ...)
    async resolveRedirectUrl(redirectUrl) {
        try {
            const response = await axios.get(redirectUrl, {
                headers: {
                    'User-Agent': this.userAgent,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5'
                }
            });
            const html = response.data;

            // Pattern 1: Rot13 ('o','...') - seen in HubCloud.ts (actually FourKHDHub.ts private resolveRedirectUrl)
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
                } catch (e) { console.warn("Rot13 decode failed", e); }
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
                    console.warn("HubDrive decode failed", e);
                }
            }

            // Pattern 3: Simple redirect (HubCloud extractor logic)
            const simpleMatch = html.match(/var url ?= ?'(.*?)'/);
            if (simpleMatch) {
                return simpleMatch[1];
            }

            return null;
        } catch (error) {
            console.error(`❌ [4KHDHub] Redirect resolution failed: ${error.message}`);
            return null;
        }
    }

    async extractSourceResults($, el, referer, type) {
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
            let resolvedUrl = await this.resolveRedirectUrl(startLink);

            // Fallback: If resolution failed (it's not a redirect page) but matches known domains, use it directly
            if (!resolvedUrl && (startLink.includes('hubdrive') || startLink.includes('hubcloud'))) {
                console.log("⚠️ [4KHDHub] Resolution fallback used.");
                resolvedUrl = startLink;
            }

            if (!resolvedUrl) {
                console.log("❌ [4KHDHub] resolvedUrl is null");
                return null;
            }
            console.log(`✅ [4KHDHub] Resolved URL: ${resolvedUrl}`);

            let finalPageUrl = null;

            // Check if resolvedUrl needs another hop (the var url= pattern)
            // Fetch it
            const landingRes = await axios.get(resolvedUrl, {
                headers: { 'User-Agent': this.userAgent, 'Referer': referer }
            });
            const landingHtml = landingRes.data;
            const redirectMatch = landingHtml.match(/var url ?= ?'(.*?)'/);

            if (redirectMatch) {
                finalPageUrl = redirectMatch[1];
                console.log(`✅ [4KHDHub] Found secondary redirect: ${finalPageUrl}`);
            } else {
                // If resolveRedirectUrl returns a URL, it means it successfully decoded 'o'.
                // If it returned null, it failed.
                // If resolvedUrl is valid, use it.
                finalPageUrl = resolvedUrl;
                console.log(`ℹ️ [4KHDHub] No secondary redirect found, using resolvedURL as final.`);
            }

            console.log(`⬇️ [4KHDHub] Fetching Final Page: ${finalPageUrl}`);

            // Perform the "HubCloud Extractor" logic on the final page
            const linksRes = await axios.get(finalPageUrl, {
                headers: { 'User-Agent': this.userAgent, 'Referer': startLink } // Referer chain?
            });
            const $hub = cheerio.load(linksRes.data);

            // console.log(`📄 [4KHDHub] Final Page HTML (first 500): ${linksRes.data.substring(0, 500)}`);
            const allLinks = [];
            $hub('a').each((i, el) => allLinks.push($hub(el).text()));
            // console.log(`🔗 [4KHDHub] Links found on page: ${allLinks.length}`);
            // console.log(`🔗 [4KHDHub] Link texts: ${allLinks.join(', ')}`);

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
            // console.warn(`⚠️ [4KHDHub] Extraction failed: ${error.message}`);
            return null;
        }
    }

    async getStreams(tmdbId, type = 'movie', season = null, episode = null, tmdbInfo = null) {
        if (!tmdbInfo) throw new Error("TMDB Info required (Title/Year)");

        const { title, year } = tmdbInfo;
        const isSeries = type === 'tv';

        const pageUrl = await this.fetchPageUrl(title, year, isSeries, season);
        if (!pageUrl) return [];

        try {
            const response = await axios.get(pageUrl, {
                headers: {
                    'User-Agent': this.userAgent,
                    'Referer': this.baseUrl,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5'
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
                    if (dlItem.length > 0) promises.push(this.extractSourceResults($, dlItem, pageUrl, type));
                });
            } else {
                $('.download-item').each((i, el) => {
                    promises.push(this.extractSourceResults($, el, pageUrl, type));
                });
            }

            const resultsNested = await Promise.all(promises);
            const allStreams = resultsNested.flat().filter(r => r !== null);

            console.log(`🎬 [4KHDHub] Found ${allStreams.length} streams`);
            return allStreams;

        } catch (error) {
            console.error(`❌ [4KHDHub] Stream extraction failed: ${error.message}`);
            return [];
        }
    }
}
