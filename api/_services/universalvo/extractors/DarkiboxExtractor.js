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
                        // Robust Heuristic Search
                        const candidates = [];

                        // Regex to capture key-value pairs for file/src/download
                        const patterns = [
                            /download\s*:\s*["']([^"']+)["']/gi,
                            /file\s*:\s*["']([^"']+)["']/gi,
                            /src\s*:\s*["']([^"']+)["']/gi
                        ];

                        patterns.forEach(regex => {
                            let match;
                            while ((match = regex.exec(unpacked)) !== null) {
                                const url = match[1];
                                // Basic cleanup
                                if (!url.startsWith('http') && !url.startsWith('//')) return;

                                let score = 0;
                                if (url.includes('.mp4') || url.includes('.mkv')) score += 10;
                                if (match[0].toLowerCase().includes('download')) score += 5;
                                if (url.includes('.m3u8')) score -= 5;

                                candidates.push({ url, score });
                            }
                        });

                        // Sort by score descending
                        candidates.sort((a, b) => b.score - a.score);

                        if (candidates.length > 0) {
                            // If highest score is > 0, it's likely an MP4 or Download link
                            // Even if it's 0 (unknown file), it might be MP4 without extension.
                            // If it's negative (m3u8), we take it if nothing else.
                            m3u8Url = candidates[0].url;
                            const type = m3u8Url.includes('.m3u8') ? 'HLS' : 'MP4/Video';
                            console.log(`[DarkiboxExtractor] Selected best candidate (${type}):`, m3u8Url);
                        }
                    }
                }
            }

            // Strategy 2: Look for file pattern directly in HTML (sometimes not packed)
            if (!m3u8Url) {
                const directMatch = html.match(/file\s*:\s*["']([^"']+\.(?:m3u8|mp4|mkv)[^"']*)["']/i);
                if (directMatch) {
                    m3u8Url = directMatch[1];
                    console.log('[DarkiboxExtractor] Found video URL directly in HTML:', m3u8Url);
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
