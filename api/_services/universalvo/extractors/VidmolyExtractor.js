import axios from 'axios';
import { ErrorObject } from '../helpers/ErrorObject.js';

export class VidmolyExtractor {
    async extract(url) {
        try {
            console.log(`[VidmolyExtractor] Extracting ${url}`);

            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': 'https://vidmoly.to/'
                }
            });

            const html = response.data;
            let m3u8Url = null;

            // Robust Heuristic Search
            const candidates = [];

            // Regex to capture key-value pairs for file/src/download
            const patterns = [
                /download\s*:\s*["']([^"']+)["']/gi,
                /file\s*:\s*["']([^"']+)["']/gi,
                /src\s*:\s*["']([^"']+)["']/gi,
                /sources\s*:\s*\[\s*\{\s*file\s*:\s*["']([^"']+)["']/gi // sources: [{file: '...'}]
            ];

            patterns.forEach(regex => {
                let match;
                // Need to copy regex or reset lastIndex if global?
                // Actually using new RegExp inside loop or ensuring reset.
                // Simpler: iterate matches on html string
                while ((match = regex.exec(html)) !== null) {
                    const url = match[1];
                    if (!url.startsWith('http') && !url.startsWith('//')) return;

                    let score = 0;
                    if (url.includes('.mp4') || url.includes('.mkv')) score += 10;
                    if (match[0].toLowerCase().includes('download')) score += 5;
                    if (url.includes('.m3u8')) score -= 5;

                    candidates.push({ url, score });
                }
            });

            // specific check for sources array if not caught above due to formatting
            // ... (above regex handles basic sources: [{file:}])

            // Sort by score descending
            candidates.sort((a, b) => b.score - a.score);

            if (candidates.length > 0) {
                m3u8Url = candidates[0].url;
                const type = m3u8Url.includes('.m3u8') ? 'HLS' : 'MP4/Video';
                console.log(`[VidmolyExtractor] Selected best candidate (${type}):`, m3u8Url);
            }

            if (!m3u8Url) {
                return new ErrorObject('No video URL found', 'Vidmoly', 404, 'Could not extract video URL', false, true);
            }

            return {
                success: true,
                m3u8Url: m3u8Url,
                originalUrl: url
            };

        } catch (error) {
            console.error('[VidmolyExtractor] Error:', error.message);
            return new ErrorObject(error.message, 'Vidmoly', 500, 'Extraction failed', true, true);
        }
    }
}
