// import puppeteer from 'puppeteer-core';
// import chromium from '@sparticuz/chromium';

/**
 * Bysebuho Extractor using Puppeteer
 */
export class BysebuhoExtractor {
    constructor() {
        this.name = 'Bysebuho';
    }

    /**
     * Extract M3U8 URL from Bysebuho embed
     * @param {string} url - Bysebuho embed URL
     * @returns {Promise<{success: boolean, m3u8Url: string, type: string, headers: object}>}
     */
    async extract(url) {
        let browser;

        try {
            console.log(`🚀 [Bysebuho] Extracting: ${url}`);

            // 1. Try static extraction first (faster & lighter for Vercel)
            try {
                console.log(`⚡ [Bysebuho] Trying static extraction first...`);
                const response = await fetch(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Referer': 'https://bysebuho.com/'
                    }
                });

                if (response.ok) {
                    const html = await response.text();
                    // Regex to find m3u8 in scripts
                    // Look for patterns like source: "...", file: "...", or direct .m3u8 urls
                    const m3u8Match = html.match(/(https:\/\/[^"']+\.m3u8[^"']*)/) ||
                        html.match(/file:\s*["']([^"']+\.m3u8[^"']*)["']/) ||
                        html.match(/source:\s*["']([^"']+\.m3u8[^"']*)["']/);

                    if (m3u8Match) {
                        const m3u8Url = m3u8Match[1];
                        console.log(`✅ [Bysebuho] Static extraction successful: ${m3u8Url}`);
                        return {
                            success: true,
                            m3u8Url: m3u8Url,
                            type: 'hls',
                            headers: {
                                'Referer': 'https://bysebuho.com/',
                                'Origin': 'https://bysebuho.com',
                                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                            }
                        };
                    }
                }
            } catch (staticError) {
                console.warn(`⚠️ [Bysebuho] Static extraction failed, falling back to Puppeteer: ${staticError.message}`);
            }

            // 2. Fallback to Puppeteer (Disabled)
            console.warn(`🔄 [Bysebuho] Static failed. Puppeteer DISABLED on serverless.`);
            throw new Error("Puppeteer fallback disabled");
            /*
            browser = await puppeteer.launch({
                args: [
                    ...chromium.args,
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--disable-gpu',
                    '--no-zygote',
                    '--single-process',
                    '--disable-extensions'
                ],
                defaultViewport: chromium.defaultViewport,
                executablePath: await chromium.executablePath(),
                headless: chromium.headless,
                ignoreHTTPSErrors: true
            });
            
            const page = await browser.newPage();
            
            // Array to capture M3U8 URLs from network requests
            const m3u8Urls = [];
            
            // Intercept network requests
            await page.setRequestInterception(true);
            page.on('request', (request) => {
                const requestUrl = request.url();
                if (requestUrl.includes('.m3u8')) {
                    console.log(`🎯 [Bysebuho] Found M3U8 request: ${requestUrl}`);
                    m3u8Urls.push(requestUrl);
                }
                request.continue();
            });
            
            console.log(`📡 [Bysebuho] Navigating to embed...`);
            await page.goto(url, {
                waitUntil: 'networkidle2',
                timeout: 15000 // Reduced timeout for Vercel
            });
            
            // Wait for player to initialize
            console.log(`⏳ [Bysebuho] Waiting for player...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Try to find M3U8 URL in page scripts or variables
            const m3u8FromPage = await page.evaluate(() => {
                // Check common player variable names
                const sources = [
                    window.jwplayer && window.jwplayer().getPlaylistItem()?.file,
                    window.player && window.player.src,
                    window.videoUrl,
                    window.hlsUrl,
                ];
            
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
                console.log(`✅ [Bysebuho] Found M3U8 in page: ${m3u8FromPage}`);
                m3u8Urls.push(m3u8FromPage);
            }
            
            // Return the first valid M3U8 URL found
            if (m3u8Urls.length > 0) {
                const m3u8Url = m3u8Urls[0];
                console.log(`✅ [Bysebuho] Extraction successful (Puppeteer): ${m3u8Url.substring(0, 80)}...`);
            
                return {
                    success: true,
                    m3u8Url: m3u8Url,
                    type: 'hls',
                    headers: {
                        'Referer': 'https://bysebuho.com/',
                        'Origin': 'https://bysebuho.com',
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    }
                };
            }
            
            throw new Error('No M3U8 URL found in Bysebuho embed');
            */
        } catch (error) {
            console.error(`❌ [Bysebuho] Error:`, error.message);
            throw error;
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    }
}
