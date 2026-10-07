import axios from 'axios';
import JsUnpacker from '../utils/JsUnpacker.js';
import { ErrorObject } from '../helpers/ErrorObject.js';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function isTrollUrl(value) {
    if (!value || typeof value !== 'string') return true;
    const lower = value.toLowerCase();
    return lower.includes('/troll/') || lower.includes('fake') || lower.includes('s1.fsvid.lol/troll');
}

function isVideoUrl(value) {
    if (!value || typeof value !== 'string') return false;
    if (!/^https?:\/\//i.test(value) || isTrollUrl(value)) return false;
    return /\.(?:m3u8|mp4|mkv)(?:$|[?#])/i.test(value);
}

function hostnameHash(hostname) {
    let hash = 0;
    for (let i = 0; i < hostname.length; i++) {
        hash = (hash + hostname.charCodeAt(i)) & 255;
    }
    return hash;
}

/**
 * Native decoder for Vidzy/FSVid XOR IIFE:
 * atob → reverse → XOR with (0x3d + i*89 + hostnameHash)
 */
function decodeXorPayload(encoded, hostname, browserCalibration = 0) {
    const hash = hostnameHash(hostname || '');
    const binary = Buffer.from(encoded, 'base64').toString('binary');
    const reversed = binary.split('').reverse().join('');
    let decoded = '';
    for (let i = 0; i < reversed.length; i++) {
        const key = (0x3d + i * 89 + hash + browserCalibration) & 255;
        decoded += String.fromCharCode(reversed.charCodeAt(i) ^ key);
    }
    return decoded;
}

function browserCalibrationCandidates(fnCode) {
    const candidates = [];
    const add = value => {
        if (Number.isInteger(value) && value >= 0 && value <= 255 && !candidates.includes(value)) {
            candidates.push(value);
        }
    };

    // Current Vidzy pages bind the payload to a hidden element whose width is
    // `calc(1in + Npx)`. Browsers define 1 CSS inch as 96 CSS pixels.
    for (const match of fnCode.matchAll(/calc\(\s*1in\s*\+\s*(\d+)px\s*\)/gi)) {
        add(96 + Number(match[1]));
    }
    for (const match of fnCode.matchAll(/(?:BC|browserCalibration)\s*!==?\s*(0x[\da-f]+|\d+)/gi)) {
        add(Number(match[1]));
    }

    // Legacy pages did not include the browser calibration term.
    add(0);
    return candidates;
}

function tryExecuteIife(fnCode, encoded, hostname) {
    try {
        const fn = new Function('atob', 'location', `return (${fnCode});`);
        const decodeFn = fn(atob, { hostname: hostname || '' });
        return decodeFn(encoded);
    } catch {
        return null;
    }
}

/**
 * Vidzy now embeds the stream URL in a hostname-bound IIFE in the raw HTML
 * (no packed JS, no quoted file/src). The only plaintext m3u8 is a troll decoy.
 */
function extractFromIife(source, hostname) {
    if (!source) return null;

    const iifeRegex = /\(\s*(function\s*\(\s*s\s*\)\s*\{[\s\S]{20,4000}?\})\s*\)\s*\(\s*["']([^"']+)["']\s*\)/g;
    let match;
    while ((match = iifeRegex.exec(source)) !== null) {
        const fnCode = match[1];
        const encoded = match[2];
        if (!fnCode.includes('atob') || !fnCode.includes('charCodeAt')) continue;

        const candidates = [];
        if (fnCode.includes('location') || fnCode.includes('0x3d')) {
            for (const calibration of browserCalibrationCandidates(fnCode)) {
                try {
                    candidates.push(decodeXorPayload(encoded, hostname, calibration));
                } catch {
                    // ignore malformed payload
                }
            }

            // Keep extraction resilient if Vidzy changes the CSS measurement
            // while retaining the same byte-sized XOR scheme.
            if (fnCode.includes('+BC')) {
                for (let calibration = 0; calibration <= 255; calibration++) {
                    candidates.push(decodeXorPayload(encoded, hostname, calibration));
                }
            }
        }
        candidates.push(tryExecuteIife(fnCode, encoded, hostname));

        for (const decoded of candidates) {
            if (isVideoUrl(decoded)) return decoded;
        }
    }

    return null;
}

function extractQuotedVideoUrl(source, preferDirectFile = false) {
    if (!source) return null;

    if (preferDirectFile) {
        const fileMatch = source.match(/(?:file|src)\s*:\s*["']([^"']+\.(?:mp4|mkv)[^"']*)["']/i);
        if (fileMatch && isVideoUrl(fileMatch[1])) return fileMatch[1];
    }

    for (const match of source.matchAll(/(?:file|src)\s*:\s*["']([^"']+\.(?:m3u8|mp4|mkv)[^"']*)["']/gi)) {
        if (isVideoUrl(match[1])) return match[1];
    }

    return null;
}

export class VidzyExtractor {
    async extract(url) {
        try {
            console.log(`[VidzyExtractor] Extracting ${url}`);

            const parsed = new URL(url);
            const origin = parsed.origin;
            const hostname = parsed.hostname;
            const response = await axios.get(url, {
                // Vidzy signs the media URL for the IP that fetched the embed
                // page. Its media host is IPv4-only, so fetching the page over
                // IPv6 produces a token that immediately fails with 403.
                family: 4,
                headers: {
                    'User-Agent': UA,
                    'Referer': `${origin}/`
                },
                timeout: 15000
            });

            const html = typeof response.data === 'string' ? response.data : String(response.data || '');
            let videoUrl = null;

            // Strategy 1: hostname-bound IIFE in raw HTML (current Vidzy / FSVid player)
            videoUrl = extractFromIife(html, hostname);
            if (videoUrl) {
                console.log('[VidzyExtractor] Decoded video URL via HTML IIFE:', videoUrl);
            }

            // Strategy 2: packed JS (legacy Vidzy)
            if (!videoUrl) {
                const packedMatch = html.match(/eval\(function\(p,a,c,k,e,d\)[\s\S]*?split\('\|'\)\)\)/);
                if (packedMatch) {
                    console.log('[VidzyExtractor] Packed JS found, attempting unpack...');
                    const unpacker = new JsUnpacker(packedMatch[0]);
                    if (unpacker.detect()) {
                        const unpacked = unpacker.unpack();
                        if (unpacked) {
                            videoUrl = extractFromIife(unpacked, hostname)
                                || extractQuotedVideoUrl(unpacked, true);
                            if (videoUrl) {
                                console.log('[VidzyExtractor] Found video URL in unpacked JS:', videoUrl);
                            }
                        }
                    }
                }
            }

            // Strategy 3: quoted file/src in raw HTML
            if (!videoUrl) {
                videoUrl = extractQuotedVideoUrl(html, true);
                if (videoUrl) {
                    console.log('[VidzyExtractor] Found video URL directly in HTML:', videoUrl);
                }
            }

            if (!videoUrl) {
                return new ErrorObject('No m3u8 found', 'Vidzy', 404, 'Could not extract m3u8 URL', false, true);
            }

            const isDirectFile = /\.(?:mp4|mkv)(?:$|[?#])/i.test(videoUrl);

            return {
                success: true,
                m3u8Url: videoUrl,
                originalUrl: url,
                type: isDirectFile ? 'file' : 'hls',
                headers: {
                    'Referer': `${origin}/`,
                    'Origin': origin,
                    'User-Agent': UA
                }
            };

        } catch (error) {
            console.error('[VidzyExtractor] Error:', error.message);
            return new ErrorObject(error.message, 'Vidzy', 500, 'Extraction failed', true, true);
        }
    }
}
