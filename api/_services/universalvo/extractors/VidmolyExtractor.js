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

            // Vidmoly usually has file: "..." in script
            const fileMatch = html.match(/file\s*:\s*["']([^"']+\.(?:m3u8|mp4|mkv)[^"']*)["']/i);

            if (fileMatch) {
                m3u8Url = fileMatch[1];
                console.log('[VidmolyExtractor] Found video URL');
            } else {
                // Try looking for 'sources: [{file: ...}]'
                const sourcesMatch = html.match(/sources\s*:\s*\[\s*\{\s*file\s*:\s*["']([^"']+)["']/i);
                if (sourcesMatch) {
                    m3u8Url = sourcesMatch[1];
                    console.log('[VidmolyExtractor] Found video in sources array');
                }
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
