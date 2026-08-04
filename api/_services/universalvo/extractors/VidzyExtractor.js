import axios from 'axios';
import JsUnpacker from '../utils/JsUnpacker.js';
import { ErrorObject } from '../helpers/ErrorObject.js';

export class VidzyExtractor {
    async extract(url) {
        try {
            console.log(`[VidzyExtractor] Extracting ${url}`);

            const origin = new URL(url).origin;
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': `${origin}/`
                },
                timeout: 15000
            });

            const html = response.data;
            let m3u8Url = null;

            // Strategy 1: Look for packed JS and IIFE decoder function or unpacked m3u8
            const packedRegex = /eval\(function\(p,a,c,k,e,d\)[\s\S]*?split\('\|'\)\)\)/;
            const packedMatch = html.match(packedRegex);

            if (packedMatch) {
                console.log('[VidzyExtractor] Packed JS found, attempting unpack...');
                const unpacker = new JsUnpacker(packedMatch[0]);
                if (unpacker.detect()) {
                    const unpacked = unpacker.unpack();
                    if (unpacked) {
                        // 1. Try to find IIFE decoder: (function(s){...})("encoded_string")
                        const iifeMatch = unpacked.match(/\((function\(s\)[\s\S]+?)\)\s*\(\s*["']([^"']+)["']\s*\)/);
                        if (iifeMatch) {
                            try {
                                const fnCode = iifeMatch[1];
                                const argStr = iifeMatch[2];
                                const fn = new Function('atob', `return (${fnCode});`);
                                const decodeFn = fn(atob);
                                const decoded = decodeFn(argStr);
                                if (decoded && (decoded.includes('.m3u8') || decoded.includes('.mp4') || decoded.startsWith('http'))) {
                                    m3u8Url = decoded;
                                    console.log('[VidzyExtractor] Successfully decoded M3U8 URL via IIFE:', m3u8Url);
                                }
                            } catch (e) {
                                console.warn('[VidzyExtractor] IIFE decoding error:', e.message);
                            }
                        }

                        // 2. Priority 1: MP4/MKV in unpacked JS
                        if (!m3u8Url) {
                            const fileMatch = unpacked.match(/file\s*:\s*["']([^"']+\.(?:mp4|mkv)[^"']*)["']/i) ||
                                unpacked.match(/src\s*:\s*["']([^"']+\.(?:mp4|mkv)[^"']*)["']/i);
                            if (fileMatch) {
                                m3u8Url = fileMatch[1];
                                console.log('[VidzyExtractor] Found MP4/MKV URL in unpacked JS:', m3u8Url);
                            }
                        }

                        // 3. Priority 2: Look for M3U8 (excluding troll/fake URLs)
                        if (!m3u8Url) {
                            const m3u8Matches = unpacked.matchAll(/(?:file|src)\s*:\s*["']([^"']+\.m3u8[^"']*)["']/gi);
                            for (const match of m3u8Matches) {
                                if (!match[1].includes('/troll/') && !match[1].includes('fake')) {
                                    m3u8Url = match[1];
                                    console.log('[VidzyExtractor] Found M3U8 in unpacked JS:', m3u8Url);
                                    break;
                                }
                            }
                        }
                    }
                }
            }

            // Strategy 2: Direct match in raw HTML (excluding troll/fake URLs)
            if (!m3u8Url) {
                const directMatches = html.matchAll(/(?:file|src)\s*:\s*["']([^"']+\.(?:m3u8|mp4|mkv)[^"']*)["']/gi);
                for (const match of directMatches) {
                    if (!match[1].includes('/troll/') && !match[1].includes('fake')) {
                        m3u8Url = match[1];
                        console.log('[VidzyExtractor] Found video URL directly in HTML:', m3u8Url);
                        break;
                    }
                }
            }

            if (!m3u8Url) {
                return new ErrorObject('No m3u8 found', 'Vidzy', 404, 'Could not extract m3u8 URL', false, true);
            }

            return {
                success: true,
                m3u8Url: m3u8Url,
                originalUrl: url,
                headers: {
                    'Referer': `${origin}/`,
                    'Origin': origin,
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            };

        } catch (error) {
            console.error('[VidzyExtractor] Error:', error.message);
            return new ErrorObject(error.message, 'Vidzy', 500, 'Extraction failed', true, true);
        }
    }
}
