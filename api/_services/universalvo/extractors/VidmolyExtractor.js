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

            let html = response.data;

            // Handle "Click to Play" / "Please wait" gating
            if (html.includes('startLoading') && html.includes('?g=')) {
                console.log('[VidmolyExtractor] Detected Click-to-Play gating, extracting token...');
                const tokenMatch = html.match(/url\s*\+=\s*['"]\?g=([^'"]+)['"]/);

                if (tokenMatch) {
                    const token = tokenMatch[1];
                    const newUrl = `${url}?g=${token}`;
                    console.log(`[VidmolyExtractor] Refetching with token: ${newUrl}`);

                    const response2 = await axios.get(newUrl, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                            'Referer': 'https://vidmoly.to/'
                        }
                    });
                    html = response2.data;
                }
            }

            let m3u8Url = null;

            // Priority 1: Check for mp4/mkv match first (Direct file)
            let fileMatch = html.match(/file\s*:\s*["']([^"']+\.(?:mp4|mkv)[^"']*)["']/i);

            if (fileMatch) {
                m3u8Url = fileMatch[1];
                console.log('[VidmolyExtractor] Found MP4/MKV URL');
            } else {
                // Priority 2: Check for m3u8 match (Direct file)
                fileMatch = html.match(/file\s*:\s*["']([^"']+\.m3u8[^"']*)["']/i);
                if (fileMatch) {
                    m3u8Url = fileMatch[1];
                    console.log('[VidmolyExtractor] Found M3U8 URL');
                }
            }

            if (!m3u8Url) {
                // Priority 3: Check for MP4 in sources array
                const sourcesMatchMp4 = html.match(/sources\s*:\s*\[\s*\{\s*file\s*:\s*["']([^"']+\.(?:mp4|mkv)[^"']*)["']/i);
                if (sourcesMatchMp4) {
                    m3u8Url = sourcesMatchMp4[1];
                    console.log('[VidmolyExtractor] Found video (MP4) in sources array');
                } else {
                    // Priority 4: Fallback to any file in sources
                    const sourcesMatch = html.match(/sources\s*:\s*\[\s*\{\s*file\s*:\s*["']([^"']+)["']/i);
                    if (sourcesMatch) {
                        m3u8Url = sourcesMatch[1];
                        console.log('[VidmolyExtractor] Found video (fallback) in sources array');
                    }
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
