import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { ErrorObject } from '../helpers/ErrorObject.js';

const USER_AGENT =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36';

/**
 * Extract m3u8 URL from VOE embed pages
 * Uses puppeteer-core + @sparticuz/chromium for serverless compatibility
 */
export async function extract_voe(url, referer = '') {
    let browser;
    try {
        console.log('[VOE] Launching browser for:', url);

        // Use serverless-compatible chromium
        browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
        });

        const page = await browser.newPage();
        await page.setUserAgent(USER_AGENT);

        if (referer) {
            await page.setExtraHTTPHeaders({ 'Referer': referer });
        }

        const m3u8Urls = [];

        // Intercept network requests
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            const reqUrl = req.url();
            if (reqUrl.includes('.m3u8')) {
                m3u8Urls.push(reqUrl);
                console.log('[VOE] Intercepted m3u8:', reqUrl);
            }
            req.continue();
        });

        // Navigate to page
        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        // Wait for potential redirects
        await new Promise(r => setTimeout(r, 2000));

        // Try to click play button
        try {
            const playButton = await page.$('button.vjs-big-play-button, .play-btn, #player, [aria-label*="play"]');
            if (playButton) {
                console.log('[VOE] Clicking play button...');
                await playButton.click();
                await new Promise(r => setTimeout(r, 3000));
            }
        } catch (e) {
            console.log('[VOE] No play button found');
        }

        // Also try clicking the main video container
        try {
            await page.click('#player, .jw-video, video');
            await new Promise(r => setTimeout(r, 2000));
        } catch (e) {
            // Video element not found or not clickable
        }

        // Check if we got any m3u8 URLs
        if (m3u8Urls.length > 0) {
            // Prefer master.m3u8 if available
            const masterUrl = m3u8Urls.find(u => u.includes('master.m3u8'));
            const result = masterUrl || m3u8Urls[0];
            console.log('[VOE] Found m3u8:', result);
            await browser.close();
            return result;
        }

        // If no network request, try to extract from page
        const pageData = await page.evaluate(() => {
            const sources = [];

            // JWPlayer
            if (typeof jwplayer !== 'undefined') {
                try {
                    const playlist = jwplayer().getPlaylist();
                    if (playlist && playlist[0] && playlist[0].sources) {
                        playlist[0].sources.forEach(s => {
                            if (s.file) sources.push(s.file);
                        });
                    }
                } catch (e) { }
            }

            // HTML5 video
            const videos = document.querySelectorAll('video source, video');
            videos.forEach(v => {
                if (v.src) sources.push(v.src);
            });

            // Check for inline scripts with HLS URLs
            const scripts = document.querySelectorAll('script');
            scripts.forEach(script => {
                const text = script.textContent || '';
                const m3u8Match = text.match(/(https?:\/\/[^'"]+\.m3u8[^'"]*)/);
                if (m3u8Match) {
                    sources.push(m3u8Match[1]);
                }
            });

            return { sources };
        });

        if (pageData.sources.length > 0) {
            const m3u8Source = pageData.sources.find(s => s.includes('.m3u8')) || pageData.sources[0];
            console.log('[VOE] Found source from page:', m3u8Source);
            await browser.close();
            return m3u8Source;
        }

        await browser.close();
        return new ErrorObject(
            'Could not extract VOE source',
            'voe',
            500,
            'No m3u8 URL found',
            true,
            true
        );

    } catch (error) {
        console.error('[VOE] Extraction error:', error.message);
        if (browser) await browser.close();
        return new ErrorObject(
            `VOE extraction error: ${error.message}`,
            'voe',
            500,
            'Check implementation or server status.',
            true,
            true
        );
    }
}
