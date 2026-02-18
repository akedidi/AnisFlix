import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

/**
 * FSVid Extractor using Puppeteer
 * Bypasses anti-hotlinking protection by using proper Referer header
 */
export class FSVidExtractor {
    constructor() {
        this.name = 'FSVid';
    }

    /**
     * Extract M3U8 URL from FSVid embed
     * @param {string} url - FSVid embed URL
     * @returns {Promise<{success: boolean, m3u8Url: string, type: string, headers: object}>}
     */
    async extract(url) {
        let browser;

        try {
            console.log(`🚀 [FSVid] Extracting: ${url}`);

            browser = await puppeteer.launch({
                args: chromium.args,
                defaultViewport: chromium.defaultViewport,
                executablePath: await chromium.executablePath(),
                headless: chromium.headless,
            });

            const page = await browser.newPage();

            // Array to capture M3U8 URLs from network requests
            const m3u8Urls = [];

            // Intercept network requests
            await page.setRequestInterception(true);
            page.on('request', (request) => {
                const requestUrl = request.url();
                if (requestUrl.includes('.m3u8')) {
                    console.log(`🎯 [FSVid] Found M3U8 request: ${requestUrl}`);
                    m3u8Urls.push(requestUrl);
                }
                request.continue();
            });

            // Set proper referer to bypass anti-hotlinking
            await page.setExtraHTTPHeaders({
                'Referer': 'https://french-stream.one/',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            });

            console.log(`📡 [FSVid] Navigating to embed...`);
            await page.goto(url, {
                waitUntil: 'networkidle2',
                timeout: 30000
            });

            // Wait a bit for player to initialize
            console.log(`⏳ [FSVid] Waiting for player...`);
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Try to find M3U8 URL in page scripts or variables
            const m3u8FromPage = await page.evaluate(() => {
                // Check common player variable names
                const sources = [
                    window.jwplayer && window.jwplayer().getPlaylistItem()?.file,
                    window.player && window.player.src,
                    window.videoUrl,
                    window.hlsUrl,
                ];

                // Also check for Clappr player
                if (window.playerInstance) {
                    sources.push(window.playerInstance.options?.source);
                }

                // Look in all script tags for m3u8 URLs
                const scripts = Array.from(document.querySelectorAll('script'));
                for (const script of scripts) {
                    const match = script.textContent.match(/(https:\/\/[^"']+\.m3u8[^"']*)/);
                    if (match) {
                        sources.push(match[1]);
                    }
                }

                return sources.filter(Boolean)[0];
            });

            if (m3u8FromPage) {
                console.log(`✅ [FSVid] Found M3U8 in page: ${m3u8FromPage}`);
                m3u8Urls.push(m3u8FromPage);
            }

            // Return the first valid M3U8 URL found
            if (m3u8Urls.length > 0) {
                const m3u8Url = m3u8Urls[0];
                console.log(`✅ [FSVid] Extraction successful (Puppeteer): ${m3u8Url.substring(0, 80)}...`);

                return {
                    success: true,
                    m3u8Url: m3u8Url,
                    type: 'hls',
                    headers: {
                        'Referer': 'https://fsvid.lol/',
                        'Origin': 'https://fsvid.lol',
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    }
                };
            }

            throw new Error('No M3U8 URL found in FSVid embed');

        } catch (error) {
            console.error(`❌ [FSVid] Error:`, error.message);
            throw error;
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    }
}
