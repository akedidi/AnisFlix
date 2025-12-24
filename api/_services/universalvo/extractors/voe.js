import axios from 'axios';
import { ErrorObject } from '../helpers/ErrorObject.js';

const USER_AGENT =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36';

/**
 * Extract m3u8 URL from VOE embed pages
 * Uses pure HTTP requests without Puppeteer for Vercel compatibility
 * 
 * VOE URLs are typically encoded in the page source or in a base64/obfuscated format
 */
export async function extract_voe(url, referer = '') {
    try {
        console.log('[VOE] Extracting from:', url);

        // Normalize VOE URL domains
        const normalizedUrl = url
            .replace('voe.sx', 'voe.sx')
            .replace('vocancellario.com', 'voe.sx')
            .replace('ralphysuccessfull.org', 'voe.sx');

        const response = await axios.get(normalizedUrl, {
            headers: {
                'User-Agent': USER_AGENT,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Referer': referer || 'https://voe.sx/',
            },
            timeout: 15000,
            maxRedirects: 5
        });

        const html = response.data;
        console.log('[VOE] Fetched page, length:', html.length);

        let m3u8Url = null;

        // Method 1: Look for direct m3u8 URLs
        const directM3u8 = html.match(/(https?:\/\/[^\s'"]+\.m3u8[^\s'"]*)/i);
        if (directM3u8) {
            m3u8Url = directM3u8[1];
            console.log('[VOE] Found direct m3u8:', m3u8Url);
            return m3u8Url;
        }

        // Method 2: Look for 'sources' JSON pattern (common in JWPlayer)
        const sourcesMatch = html.match(/sources\s*:\s*\[\s*\{[^}]*file\s*:\s*['"]([^'"]+)['"]/i);
        if (sourcesMatch) {
            m3u8Url = sourcesMatch[1];
            console.log('[VOE] Found sources pattern:', m3u8Url);
            return m3u8Url;
        }

        // Method 3: Look for 'hls' or 'mp4' in JSON
        const hlsMatch = html.match(/'hls'\s*:\s*['"]([^'"]+)['"]/i) ||
            html.match(/"hls"\s*:\s*"([^"]+)"/i);
        if (hlsMatch) {
            m3u8Url = hlsMatch[1];
            console.log('[VOE] Found hls pattern:', m3u8Url);
            return m3u8Url;
        }

        // Method 4: Look for base64 encoded data that might contain URLs
        const base64Match = html.match(/atob\s*\(\s*['"]([A-Za-z0-9+/=]+)['"]\s*\)/);
        if (base64Match) {
            try {
                const decoded = Buffer.from(base64Match[1], 'base64').toString('utf-8');
                const m3u8InDecoded = decoded.match(/(https?:\/\/[^\s'"]+\.m3u8[^\s'"]*)/i);
                if (m3u8InDecoded) {
                    m3u8Url = m3u8InDecoded[1];
                    console.log('[VOE] Found base64 decoded m3u8:', m3u8Url);
                    return m3u8Url;
                }
            } catch (e) {
                console.log('[VOE] Base64 decode failed:', e.message);
            }
        }

        // Method 5: Look for MP4 fallback
        const mp4Match = html.match(/(https?:\/\/[^\s'"]+\.mp4[^\s'"]*)/i);
        if (mp4Match) {
            m3u8Url = mp4Match[1];
            console.log('[VOE] Found MP4 fallback:', m3u8Url);
            return m3u8Url;
        }

        // Method 6: Look for video source tag
        const videoSrcMatch = html.match(/<video[^>]*src=['"]([^'"]+)['"]/i) ||
            html.match(/<source[^>]*src=['"]([^'"]+)['"]/i);
        if (videoSrcMatch) {
            m3u8Url = videoSrcMatch[1];
            console.log('[VOE] Found video src:', m3u8Url);
            return m3u8Url;
        }

        // Method 7: Look for window.sources or similar
        const windowSourcesMatch = html.match(/window\.sources\s*=\s*['"]([^'"]+)['"]/i) ||
            html.match(/var\s+sources\s*=\s*['"]([^'"]+)['"]/i);
        if (windowSourcesMatch) {
            m3u8Url = windowSourcesMatch[1];
            console.log('[VOE] Found window.sources:', m3u8Url);
            return m3u8Url;
        }

        // Method 8: Look for common VOE patterns (protocol-relative URLs)
        const protocolRelative = html.match(/['"]\/\/[^\s'"]+\.m3u8[^\s'"]*['"]/i);
        if (protocolRelative) {
            m3u8Url = 'https:' + protocolRelative[0].replace(/['"]/g, '');
            console.log('[VOE] Found protocol-relative m3u8:', m3u8Url);
            return m3u8Url;
        }

        console.log('[VOE] No m3u8 found, returning error');
        return new ErrorObject(
            'Could not extract VOE source',
            'voe',
            500,
            'No m3u8 URL found in page. The video may be protected or the page structure has changed.',
            true,
            true
        );

    } catch (error) {
        console.error('[VOE] Extraction error:', error.message);
        return new ErrorObject(
            `VOE extraction error: ${error.message}`,
            'voe',
            500,
            'Request failed. Check URL or network.',
            true,
            true
        );
    }
}
