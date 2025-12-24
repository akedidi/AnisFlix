import axios from 'axios';
import { ErrorObject } from '../helpers/ErrorObject.js';

const USER_AGENT =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36';

/**
 * Known VOE domain patterns - these domains all redirect to the actual player
 */
const VOE_DOMAINS = [
    'voe.sx', 'vocancellario.com', 'ralphysuccessfull.org',
    'walterprettytheir.com', 'primevideos.net', 'highmountainstream.xyz'
];

/**
 * Extract m3u8 URL from VOE embed pages
 * 
 * VOE uses multiple redirections and obfuscation:
 * 1. Initial domain (e.g., voe.sx) -> redirects via JS to actual player domain
 * 2. Player page contains obfuscated HLS URL
 */
export async function extract_voe(url, referer = '') {
    try {
        console.log('[VOE] Extracting from:', url);

        let finalUrl = url;
        let html = '';

        // Step 1: Fetch initial page and follow JS redirects
        const response1 = await axios.get(url, {
            headers: {
                'User-Agent': USER_AGENT,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Referer': referer || 'https://voe.sx/',
            },
            timeout: 15000,
            maxRedirects: 5
        });

        html = response1.data;
        console.log('[VOE] Initial page length:', html.length);

        // Check for JS redirect pattern
        const jsRedirect = html.match(/window\.location\.href\s*=\s*['"]([^'"]+)['"]/);
        if (jsRedirect) {
            finalUrl = jsRedirect[1];
            console.log('[VOE] Following JS redirect to:', finalUrl);

            const response2 = await axios.get(finalUrl, {
                headers: {
                    'User-Agent': USER_AGENT,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Referer': url,
                },
                timeout: 15000,
                maxRedirects: 5
            });
            html = response2.data;
            console.log('[VOE] Final page length:', html.length);
        }

        let m3u8Url = null;

        // Method 1: Look for direct m3u8 URLs in the page
        const directM3u8 = html.match(/(https?:\/\/[^\s'"<>]+\.m3u8[^\s'"<>]*)/i);
        if (directM3u8) {
            m3u8Url = directM3u8[1];
            console.log('[VOE] Found direct m3u8:', m3u8Url);
            return m3u8Url;
        }

        // Method 2: Look for 'sources' JSON pattern
        const sourcesMatch = html.match(/sources\s*:\s*\[\s*\{[^}]*file\s*:\s*['"]([^'"]+)['"]/i);
        if (sourcesMatch) {
            m3u8Url = sourcesMatch[1];
            console.log('[VOE] Found sources pattern:', m3u8Url);
            return m3u8Url;
        }

        // Method 3: Look for 'hls' or 'mp4' patterns
        const hlsMatch = html.match(/'hls'\s*:\s*['"]([^'"]+)['"]/i) ||
            html.match(/"hls"\s*:\s*"([^"]+)"/i);
        if (hlsMatch) {
            m3u8Url = hlsMatch[1];
            console.log('[VOE] Found hls pattern:', m3u8Url);
            return m3u8Url;
        }

        // Method 4: Look for video source tags
        const videoSrcMatch = html.match(/<video[^>]*src=['"]([^'"]+)['"]/i) ||
            html.match(/<source[^>]*src=['"]([^'"]+)['"]/i);
        if (videoSrcMatch && videoSrcMatch[1].match(/\.(m3u8|mp4|webm)/)) {
            m3u8Url = videoSrcMatch[1];
            console.log('[VOE] Found video src:', m3u8Url);
            return m3u8Url;
        }

        // Method 5: Look for Base64 encoded URLs
        const base64Matches = html.matchAll(/(?:atob|decode)\s*\(\s*['"]([A-Za-z0-9+/=]{30,})['"]\s*\)/g);
        for (const match of base64Matches) {
            try {
                const decoded = Buffer.from(match[1], 'base64').toString('utf-8');
                if (decoded.includes('.m3u8') || decoded.includes('http')) {
                    const extractedUrl = decoded.match(/(https?:\/\/[^\s'"<>]+)/);
                    if (extractedUrl) {
                        m3u8Url = extractedUrl[1];
                        console.log('[VOE] Found base64 decoded URL:', m3u8Url);
                        return m3u8Url;
                    }
                }
            } catch (e) {
                // Continue to next match
            }
        }

        // Method 6: Look for MP4 fallback
        const mp4Match = html.match(/(https?:\/\/[^\s'"<>]+\.mp4[^\s'"<>]*)/i);
        if (mp4Match) {
            m3u8Url = mp4Match[1];
            console.log('[VOE] Found MP4 fallback:', m3u8Url);
            return m3u8Url;
        }

        // No extraction possible - return error
        console.log('[VOE] Could not extract stream URL');
        return new ErrorObject(
            'VOE extraction requires JavaScript execution',
            'voe',
            501,
            'This VOE link uses obfuscation that requires a browser. Please use the WebView player.',
            true,
            true
        );

    } catch (error) {
        console.error('[VOE] Extraction error:', error.message);
        return new ErrorObject(
            `VOE extraction error: ${error.message}`,
            'voe',
            500,
            'Request failed. The URL may be invalid or expired.',
            true,
            true
        );
    }
}
