import axios from 'axios';
import JsUnpacker from '../utils/JsUnpacker.js';
import { ErrorObject } from '../helpers/ErrorObject.js';

export class DarkiboxExtractor {
    async extract(url) {
        try {
            console.log(`[DarkiboxExtractor] Extracting ${url}`);

            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': 'https://darkibox.com/'
                }
            });

            const html = response.data;
            let m3u8Url = null;

            // Strategy 1: Look for "file": "..." inside packed JS
            const packedRegex = /eval\(function\(p,a,c,k,e,d\).*?split\('\|'\)\)\)/;
            const packedMatch = html.match(packedRegex);

            if (packedMatch) {
                console.log('[DarkiboxExtractor] Packed JS found, attempting unpack...');
                const unpacker = new JsUnpacker(packedMatch[0]);
                if (unpacker.detect()) {
                    const unpacked = unpacker.unpack();
                    if (unpacked) {
                        // Look for file:"..." or "file":"..."
                        const fileMatch = unpacked.match(/file\s*:\s*["']([^"']+\.m3u8[^"']*)["']/i) ||
                            unpacked.match(/src\s*:\s*["']([^"']+\.m3u8[^"']*)["']/i);

                        if (fileMatch) {
                            m3u8Url = fileMatch[1];
                            console.log('[DarkiboxExtractor] Found m3u8 in unpacked JS');
                        }
                    }
                }
            }

            // Strategy 2: Look for file pattern directly in HTML (sometimes not packed)
            if (!m3u8Url) {
                const directMatch = html.match(/file\s*:\s*["']([^"']+\.m3u8[^"']*)["']/i);
                if (directMatch) {
                    m3u8Url = directMatch[1];
                    console.log('[DarkiboxExtractor] Found m3u8 directly in HTML');
                }
            }

            if (!m3u8Url) {
                return new ErrorObject('No m3u8 found', 'Darkibox', 404, 'Could not extract m3u8 URL', false, true);
            }

            return {
                success: true,
                m3u8Url: m3u8Url,
                originalUrl: url
            };

        } catch (error) {
            console.error('[DarkiboxExtractor] Error:', error.message);
            return new ErrorObject(error.message, 'Darkibox', 500, 'Extraction failed', true, true);
        }
    }
}
