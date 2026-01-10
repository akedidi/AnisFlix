
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
        this.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

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
                headers: { 'User-Agent': this.userAgent },
                maxRedirects: 5,
                validateStatus: status => status < 400
            });
            // Axios follows redirects by default. The final URL is in response.request.res.responseUrl (Node) or response.config.url
            // In axios response object: response.request.res.responseUrl is reliable for Node
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
                headers: { 'User-Agent': this.userAgent }
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

    async resolveRedirectUrl(redirectUrl) {
        try {
            const response = await axios.get(redirectUrl, {
                headers: { 'User-Agent': this.userAgent }
            });
            const html = response.data;

            // Match: var url = '...' OR 'o','...' pattern for rot13
            // Code from TS: const redirectDataMatch = redirectHtml.match(/'o','(.*?)'/) as string[];

            const redirectDataMatch = html.match(/'o','(.*?)'/);
            if (redirectDataMatch) {
                // Logic: JSON.parse(atob(rot13Cipher(atob(atob(match)))))
                const step1 = Buffer.from(redirectDataMatch[1], 'base64').toString('binary'); // atob
                const step2 = Buffer.from(step1, 'base64').toString('binary'); // atob
                const step3 = rot13(step2); // rot13
                const step4 = Buffer.from(step3, 'base64').toString('binary'); // atob

                const json = JSON.parse(step4);
                if (json && json.o) {
                    const finalUrl = Buffer.from(json.o, 'base64').toString('binary'); // atob
                    return finalUrl;
                }
            }

            // Alternative HubCloud regex? 
            // HubCloud.ts uses: const redirectUrlMatch = redirectHtml.match(/var url ?= ?'(.*?)'/);
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
        // Logic ported from extractSourceResults in TS
        // Find "HubCloud" links inside the element
        const $el = $(el);

        const fileTitle = $el.find('.file-title, .episode-file-title').text().trim();
        const localHtml = $el.html();

        const size = parseBytes(localHtml) || "Unknown Size";
        const heightMatch = localHtml.match(/\d{3,}p/);
        const quality = heightMatch ? heightMatch[0] : "HD";
        const countryCodes = findCountryCodes(localHtml);

        // We look for direct HubCloud link first
        let hubCloudLink = null;

        $el.find('a').each((i, a) => {
            if ($(a).text().includes('HubCloud')) {
                hubCloudLink = $(a).attr('href');
            }
        });

        // If not, look for HubDrive and follow redirect
        if (!hubCloudLink) {
            // Logic for HubDrive -> HubCloud (skipped for simplicity/speed unless necessary)
            // TS implementation does 2 hops for HubDrive. 
            // Let's implement if HubCloud direct is missing.
            // ...
            // For now, let's focus on HubCloud direct links which seem common.
        }

        if (!hubCloudLink) return null;

        try {
            // Resolve the HubCloud landing page
            const resolvedHubCloudUrl = await this.resolveRedirectUrl(hubCloudLink);
            if (!resolvedHubCloudUrl) return null;

            // Now fetch HubCloud page to get the FSL/PixelServer links
            // Headers: Referer should be the pageUrl
            const hubPageRes = await axios.get(resolvedHubCloudUrl, {
                headers: {
                    'User-Agent': this.userAgent,
                    'Referer': referer
                }
            });

            const $hub = cheerio.load(hubPageRes.data);
            const results = [];

            // FSL Links
            $hub('a').each((i, a) => {
                const text = $hub(a).text();
                const href = $hub(a).attr('href');

                if (href && text.includes('FSL') && !text.includes('FSLv2')) {
                    results.push({
                        url: href,
                        quality: quality, // Use the quality from the parent container
                        provider: 'FourKHDHub', // Source provider
                        label: `HubCloud (FSL) - ${quality}`,
                        size: size,
                        type: 'mkv' // As requested
                    });
                }

                if (href && text.includes('PixelServer')) {
                    // PixelServer URL often needs rewriting /u/ -> /api/file/
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
            console.warn(`⚠️ [4KHDHub] Extraction failed for item: ${error.message}`);
            return null;
        }
    }

    async getStreams(tmdbId, type = 'movie', season = null, episode = null, tmdbInfo = null) {
        if (!tmdbInfo) {
            // Should fetch if not provided, but caller (proxy) usually provides names
            // We need Title + Year
            throw new Error("TMDB Info required (Title/Year)");
        }

        const { title, year } = tmdbInfo;
        const isSeries = type === 'tv';

        const pageUrl = await this.fetchPageUrl(title, year, isSeries, season);
        if (!pageUrl) return [];

        try {
            const response = await axios.get(pageUrl, {
                headers: { 'User-Agent': this.userAgent }
            });

            const $ = cheerio.load(response.data);
            const promises = [];

            if (isSeries) {
                // SERIES LOGIC
                // Find episode container
                const seasonStr = `S${String(season).padStart(2, '0')}`;
                const epiStr = `Episode-${String(episode).padStart(2, '0')}`;

                // Find season block/element
                // The structure in TS: .episode-item -> filter title Sxx
                // Then find .episode-download-item -> filter Ep-xx

                // We iterate over all episode items to find the right season
                const episodeItems = $('.episode-item').filter((i, el) => {
                    return $(el).find('.episode-title').text().includes(seasonStr);
                });

                episodeItems.each((i, el) => {
                    // In this season block, find the episode download item
                    const dlItem = $(el).find('.episode-download-item').filter((j, item) => {
                        return $(item).text().includes(epiStr);
                    });

                    if (dlItem.length > 0) {
                        promises.push(this.extractSourceResults($, dlItem, pageUrl, type));
                    }
                });

            } else {
                // MOVIE LOGIC
                // Iterate over .download-item
                $('.download-item').each((i, el) => {
                    promises.push(this.extractSourceResults($, el, pageUrl, type));
                });
            }

            const resultsNested = await Promise.all(promises);
            // Flatten results
            const allStreams = resultsNested.flat().filter(r => r !== null);

            console.log(`🎬 [4KHDHub] Found ${allStreams.length} streams`);
            return allStreams;

        } catch (error) {
            console.error(`❌ [4KHDHub] Stream extraction failed: ${error.message}`);
            return [];
        }
    }
}
