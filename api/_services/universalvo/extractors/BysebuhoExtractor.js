import { isPacked, unpack } from './utils/packer.js';

/**
 * Bysebuho Extractor (Static)
 */
export class BysebuhoExtractor {
    constructor() {
        this.name = 'Bysebuho';
    }

    /**
     * Extract M3U8 URL from Bysebuho embed
     * @param {string} url - Bysebuho embed URL
     * @returns {Promise<{success: boolean, m3u8Url: string, type: string, headers: object}>}
     */
    async extract(url) {
        try {
            console.log(`🚀 [Bysebuho] Extracting: ${url}`);

            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': 'https://bysebuho.com/'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch Bysebuho page: ${response.status}`);
            }

            const html = await response.text();
            let m3u8Url = null;

            // 1. Try simple regex match
            const m3u8Match = html.match(/(https:\/\/[^"']+\.m3u8[^"']*)/) ||
                html.match(/file:\s*["']([^"']+\.m3u8[^"']*)["']/) ||
                html.match(/source:\s*["']([^"']+\.m3u8[^"']*)["']/);

            if (m3u8Match) {
                m3u8Url = m3u8Match[1];
                console.log(`✅ [Bysebuho] Static regex extraction successful: ${m3u8Url}`);
            }

            // 2. Try unpacking if no match found
            if (!m3u8Url && isPacked(html)) {
                console.log(`⚡ [Bysebuho] Packed code detected, attempting retrieval...`);
                // Extract the packed string
                const packedCode = html.match(/eval\(function\(p,a,c,k,e,d\).*?\.split\('\|'\)\)\)/s);
                if (packedCode) {
                    const unpacked = unpack(packedCode[0]);
                    if (unpacked) {
                        const unpackedMatch = unpacked.match(/(https:\/\/[^"']+\.m3u8[^"']*)/) ||
                            unpacked.match(/file:\s*["']([^"']+\.m3u8[^"']*)["']/) ||
                            unpacked.match(/source:\s*["']([^"']+\.m3u8[^"']*)["']/);
                        if (unpackedMatch) {
                            m3u8Url = unpackedMatch[1];
                            console.log(`✅ [Bysebuho] Unpacked extraction successful: ${m3u8Url}`);
                        }
                    }
                }
            }

            if (m3u8Url) {
                return {
                    success: true,
                    m3u8Url: m3u8Url,
                    type: 'hls',
                    headers: {
                        'Referer': 'https://bysebuho.com/',
                        'Origin': 'https://bysebuho.com',
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    }
                };
            }

            throw new Error('No M3U8 URL found in Bysebuho embed (Static)');

        } catch (error) {
            console.error(`❌ [Bysebuho] Error:`, error.message);
            throw error;
        }
    }
}
