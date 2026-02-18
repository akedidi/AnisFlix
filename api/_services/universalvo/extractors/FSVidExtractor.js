// import fetch from 'node-fetch'; // Use native fetch in Node 20
import { isPacked, unpack } from './utils/packer.js';

/**
 * FSVid Extractor using Static Analysis (No Puppeteer)
 * Bypasses anti-hotlinking protection by using proper Referer header and manual unpacking
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
        try {
            console.log(`🚀 [FSVid] Extracting (Static): ${url}`);

            const headers = {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://french-stream.one/',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5'
            };

            const response = await fetch(url, { headers });

            if (!response.ok) {
                throw new Error(`FSVid fetch failed: ${response.status}`);
            }

            const html = await response.text();
            let m3u8Url = null;

            // 1. Check for direct M3U8 links in HTML
            const directMatch = html.match(/(https:\/\/[^"']+\.m3u8[^"']*)/) ||
                html.match(/file:\s*["']([^"']+\.m3u8[^"']*)["']/) ||
                html.match(/source:\s*["']([^"']+\.m3u8[^"']*)["']/);

            if (directMatch && directMatch[1]) {
                m3u8Url = directMatch[1];
                console.log(`✅ [FSVid] Found M3U8 directly: ${m3u8Url.substring(0, 50)}...`);
            }

            // 2. Check for packed code
            if (!m3u8Url && isPacked(html)) {
                console.log(`📦 [FSVid] Packed code detected, unpacking...`);
                const unpacked = unpack(html);
                if (unpacked) {
                    const unpackedMatch = unpacked.match(/(https:\/\/[^"']+\.m3u8[^"']*)/) ||
                        unpacked.match(/file:\s*["']([^"']+\.m3u8[^"']*)["']/) ||
                        unpacked.match(/source:\s*["']([^"']+\.m3u8[^"']*)["']/);

                    if (unpackedMatch && unpackedMatch[1]) {
                        m3u8Url = unpackedMatch[1];
                        console.log(`✅ [FSVid] Found M3U8 in unpacked code: ${m3u8Url.substring(0, 50)}...`);
                    } else {
                        console.log(`⚠️ [FSVid] Unpacked code did not contain M3U8`);
                    }
                } else {
                    console.log(`❌ [FSVid] Failed to unpack code`);
                }
            }

            // 3. Fallback: Check for generic URL pattern
            if (!m3u8Url) {
                const globalMatch = html.match(/https:\/\/[a-zA-Z0-9\-_./]+\.m3u8[a-zA-Z0-9\-_./?=]*/);
                if (globalMatch) {
                    m3u8Url = globalMatch[0];
                    console.log(`✅ [FSVid] Found M3U8 via global regex: ${m3u8Url.substring(0, 50)}...`);
                }
            }

            if (m3u8Url) {
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

            throw new Error('No M3U8 URL found in FSVid embed (Static)');

        } catch (error) {
            console.error(`❌ [FSVid] Error:`, error.message);
            throw error;
        }
    }
}
