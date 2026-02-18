import { createDecipheriv } from 'crypto';

/**
 * Bysebuho Extractor (Static - AES-256-GCM)
 * 
 * Flow:
 * 1. Extract video code from embed URL (e.g. /e/4m0a4it8eu6q -> 4m0a4it8eu6q)
 * 2. Fetch /api/videos/{code} to get encrypted playback data
 * 3. Decrypt AES-256-GCM payload using key_parts[0]+key_parts[1] as key
 * 4. Parse decrypted JSON to get M3U8 sources
 */
export class BysebuhoExtractor {
    constructor() {
        this.name = 'Bysebuho';
    }

    /**
     * Decode base64url string to Buffer
     */
    _b64urlDecode(str) {
        const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
        const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
        return Buffer.from(padded, 'base64');
    }

    /**
     * Decrypt AES-256-GCM payload
     */
    _decrypt(keyBuf, ivBuf, payloadBuf) {
        // Last 16 bytes = GCM auth tag
        const authTag = payloadBuf.slice(-16);
        const ciphertext = payloadBuf.slice(0, -16);
        const decipher = createDecipheriv('aes-256-gcm', keyBuf, ivBuf);
        decipher.setAuthTag(authTag);
        return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf-8');
    }

    /**
     * Extract M3U8 URL from Bysebuho embed
     * @param {string} url - Bysebuho embed URL (e.g. https://bysebuho.com/e/4m0a4it8eu6q)
     * @returns {Promise<{success: boolean, m3u8Url: string, type: string, headers: object}>}
     */
    async extract(url) {
        try {
            console.log(`🚀 [Bysebuho] Extracting: ${url}`);

            // 1. Extract video code from URL
            const codeMatch = url.match(/\/e\/([a-z0-9]+)/i);
            if (!codeMatch) {
                throw new Error('Could not extract video code from URL');
            }
            const code = codeMatch[1];
            console.log(`📋 [Bysebuho] Video code: ${code}`);

            // 2. Fetch video info from API
            const apiUrl = `https://bysebuho.com/api/videos/${code}`;
            const response = await fetch(apiUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': `https://bysebuho.com/e/${code}`,
                    'Origin': 'https://bysebuho.com',
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`API request failed: ${response.status}`);
            }

            const videoInfo = await response.json();
            const playback = videoInfo.playback;

            if (!playback) {
                throw new Error('No playback data in API response');
            }

            console.log(`🔐 [Bysebuho] Decrypting playback data (algorithm: ${playback.algorithm})...`);

            // 3. Decrypt: key = key_parts[0] + key_parts[1] (32 bytes for AES-256)
            const kp1 = this._b64urlDecode(playback.key_parts[0]);
            const kp2 = this._b64urlDecode(playback.key_parts[1]);
            const keyBuf = Buffer.concat([kp1, kp2]);
            const ivBuf = this._b64urlDecode(playback.iv);
            const payloadBuf = this._b64urlDecode(playback.payload);

            let decrypted;
            try {
                decrypted = this._decrypt(keyBuf, ivBuf, payloadBuf);
            } catch (e) {
                // Fallback: try edge1+edge2 with iv2+payload2
                console.log(`⚡ [Bysebuho] Primary decryption failed, trying fallback...`);
                const edge1 = this._b64urlDecode(playback.decrypt_keys.edge_1);
                const edge2 = this._b64urlDecode(playback.decrypt_keys.edge_2);
                const fallbackKey = Buffer.concat([edge1, edge2]);
                const iv2Buf = this._b64urlDecode(playback.iv2);
                const payload2Buf = this._b64urlDecode(playback.payload2);
                decrypted = this._decrypt(fallbackKey, iv2Buf, payload2Buf);
            }

            // 4. Parse decrypted JSON
            const sources = JSON.parse(decrypted);
            console.log(`✅ [Bysebuho] Decrypted ${sources.sources?.length || 0} sources`);

            // 5. Find best M3U8 source (prefer highest quality)
            const hlsSources = (sources.sources || []).filter(s =>
                s.mime_type === 'application/vnd.apple.mpegurl' ||
                s.url?.includes('.m3u8')
            );

            if (hlsSources.length === 0) {
                throw new Error('No HLS sources found in decrypted data');
            }

            // Pick best quality (h = high, l = low, etc.)
            const best = hlsSources.find(s => s.quality === 'h') || hlsSources[0];
            const m3u8Url = best.url;

            console.log(`✅ [Bysebuho] M3U8 extracted: ${m3u8Url}`);

            return {
                success: true,
                m3u8Url,
                type: 'hls',
                title: videoInfo.title,
                sources: hlsSources.map(s => ({ quality: s.label || s.quality, url: s.url })),
                headers: {
                    'Referer': 'https://bysebuho.com/',
                    'Origin': 'https://bysebuho.com',
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            };

        } catch (error) {
            console.error(`❌ [Bysebuho] Error:`, error.message);
            throw error;
        }
    }
}
