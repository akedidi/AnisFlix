import axios from 'axios';
import crypto from 'crypto';

export class CineproScraper {
    constructor() {
        this.DOMAINS = {
            base: 'https://player.vidsrc.co/',
            api: 'https://test.autoembed.cc/api/server'
        };
        this.HEADERS = {
            Referer: this.DOMAINS.base,
            Origin: this.DOMAINS.base,
            'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.6787.65 Safari/537.36 Edg/132.0.2855.99',
            Accept: '*/*'
        };
    }

    async getStreams(tmdbId, season = null, episode = null) {
        const type = (season && episode) ? 'tv' : 'movie';
        const url = type === 'tv'
            ? `${this.DOMAINS.api}?id=${tmdbId}&ss=${season}&ep=${episode}`
            : `${this.DOMAINS.api}?id=${tmdbId}`;

        console.log(`🔍 [Cinepro] Fetching for ${type} ${tmdbId}...`);

        let streams = [];
        // Checking servers 1 to 15 as per original implementation
        const serversToCheck = 15;

        // Use Promise.all for parallel fetching to speed it up
        const promises = [];

        for (let i = 1; i <= serversToCheck; i++) {
            promises.push(this.checkServer(url, i));
        }

        const results = await Promise.all(promises);

        // Flatten and filter nulls
        results.forEach(res => {
            if (res) streams.push(res);
        });

        // Valid unique streams
        const uniqueStreams = [];
        const seenUrls = new Set();

        for (const s of streams) {
            if (!seenUrls.has(s.link)) {
                seenUrls.add(s.link);
                uniqueStreams.push(s);
            }
        }

        return uniqueStreams;
    }

    async checkServer(baseUrl, index) {
        try {
            const serverUrl = `${baseUrl}&sr=${index}`;
            const response = await axios.get(serverUrl, {
                headers: this.HEADERS,
                validateStatus: () => true,
                timeout: 5000 // 5s timeout
            });

            if (response.status !== 200 || !response.data || !response.data.data) {
                return null;
            }

            const data = this.decryptData(response.data.data);
            if (!data || !data.url) return null;

            let directUrl = data.url;

            // Unwrap proxy if needed
            if (directUrl.includes('embed-proxy')) {
                const urlMatch = directUrl.match(/[?&]url=([^&]+)/);
                if (urlMatch) {
                    directUrl = decodeURIComponent(urlMatch[1]);
                }
            }

            const lowerUrl = directUrl.toLowerCase();
            const isMega = lowerUrl.includes('megacdn');
            const isMilky = lowerUrl.includes('premilkyway');

            if (isMega || isMilky) {
                return {
                    server: isMega ? 'MegaCDN' : 'PreMilkyWay',
                    link: directUrl,
                    type: lowerUrl.includes('.mp4') ? 'mp4' : 'hls',
                    quality: 'Auto',
                    lang: 'VO' // User specified these are VO only
                };
            }
        } catch (err) {
            // console.error(`[Cinepro] Server ${index} error:`, err.message);
        }
        return null;
    }

    // --- Decryption Logic from AutoEmbed ---

    decryptData(encryptedObjectB64) {
        try {
            const encryptedObject = JSON.parse(
                Buffer.from(encryptedObjectB64, 'base64').toString('utf8')
            );

            const { algorithm, key, iv, salt, iterations, encryptedData } = encryptedObject;

            // Derive the actual AES key using PBKDF2
            const derivedKey = crypto.pbkdf2Sync(
                key, // password
                Buffer.from(salt, 'hex'), // salt
                iterations, // iterations
                32, // key length = 32 bytes (AES-256)
                'sha256' // hash
            );

            const ivBuffer = Buffer.from(iv, 'hex');
            const decipher = crypto.createDecipheriv(algorithm, derivedKey, ivBuffer);

            let decrypted =
                decipher.update(encryptedData, 'base64', 'utf8') +
                decipher.final('utf8');

            return JSON.parse(decrypted);
        } catch (e) {
            console.error('[Cinepro] Decryption error:', e.message);
            return null;
        }
    }
}
