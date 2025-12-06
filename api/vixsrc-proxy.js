import axios from 'axios';

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, HEAD, OPTIONS');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const { url } = req.query;

        if (!url || typeof url !== 'string') {
            return res.status(400).json({ error: 'URL Vixsrc requise' });
        }

        // Ne PAS décoder l'URL ici, req.query le fait déjà automatiquement
        // Si on décode une deuxième fois, on casse les caractères spéciaux (ex: %2B -> + -> ' ')
        let decodedUrl = url;

        console.log('[Vixsrc Proxy] Incoming Request:', {
            originalUrl: url,
            decodedUrl: decodedUrl,
            headers: req.headers,
            method: req.method
        });

        // Vérifier si l'URL contient déjà le chemin du proxy (double encodage)
        if (decodedUrl.includes('/api/vixsrc-proxy')) {
            const urlMatch = decodedUrl.match(/[?&]url=([^&]+)/);
            if (urlMatch) {
                decodedUrl = decodeURIComponent(urlMatch[1]);
            }
        }

        console.log(`[VIXSRC PROXY] Requesting URL: ${decodedUrl}`);

        // Préparer les headers
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://vixsrc.to/',
            'Origin': 'https://vixsrc.to',
            'Accept': '*/*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'identity', // Force uncompressed response for arraybuffer
            'Cache-Control': 'no-cache'
        };

        // Forward Range header if present
        if (req.headers.range) {
            headers['Range'] = req.headers.range;
        }

        const response = await fetch(decodedUrl, {
            headers: headers
        });

        console.log('[Vixsrc Proxy] Vixsrc Response:', {
            status: response.status,
            statusText: response.statusText,
            contentType: response.headers.get('content-type')
        });

        if (!response.ok) {
            console.error('[Vixsrc Proxy] Vixsrc Error Response:', await response.text());
            throw new Error(`Vixsrc responded with ${response.status}: ${response.statusText}`);
        }

        // Copier les headers pertinents
        const contentType = response.headers.get('content-type');
        console.log(`[VIXSRC PROXY] Upstream Content-Type: ${contentType}`);

        if (contentType) res.setHeader('Content-Type', contentType);

        if (response.headers['content-length']) {
            res.setHeader('Content-Length', response.headers['content-length']);
        }
        if (response.headers['content-range']) {
            res.setHeader('Content-Range', response.headers['content-range']);
        }
        if (response.headers['accept-ranges']) {
            res.setHeader('Accept-Ranges', response.headers['accept-ranges']);
        }

        // Gérer les playlists M3U8
        const isM3U8 = (contentType && contentType.includes('mpegurl')) || decodedUrl.includes('.m3u8');
        console.log(`[VIXSRC PROXY] isM3U8 detected: ${isM3U8}`);

        if (isM3U8) {
            console.log(`[VIXSRC PROXY] Processing M3U8 playlist`);
            let playlist = response.data.toString('utf-8');

            // Log preview of original playlist
            console.log(`[VIXSRC PROXY] Original playlist start: ${playlist.substring(0, 50).replace(/\n/g, '\\n')}`);

            const baseUrl = new URL(decodedUrl);

            // Déterminer l'origine pour les URLs réécrites
            const protocol = req.headers['x-forwarded-proto'] || 'https';
            const host = req.headers.host;
            const origin = `${protocol}://${host}`;

            console.log(`[VIXSRC PROXY] Using origin: ${origin}`);

            // Réécrire les URLs
            const lines = playlist.split(/\r?\n/);
            const rewritten = lines.map((line) => {
                // 1. Gérer les lignes qui sont des URLs directes (segments, playlists variantes)
                if (line && !line.trim().startsWith('#')) {
                    try {
                        const absoluteUrl = new URL(line, baseUrl).toString();
                        return `${origin}/api/vixsrc-proxy?url=${encodeURIComponent(absoluteUrl)}`;
                    } catch (e) {
                        return line;
                    }
                }

                // 2. Gérer les attributs URI="..." dans les tags (ex: #EXT-X-MEDIA:...,URI="...")
                if (line && line.trim().startsWith('#') && line.includes('URI="')) {
                    return line.replace(/URI="([^"]+)"/g, (match, uri) => {
                        try {
                            const absoluteUrl = new URL(uri, baseUrl).toString();
                            return `URI="${origin}/api/vixsrc-proxy?url=${encodeURIComponent(absoluteUrl)}"`;
                        } catch (e) {
                            return match;
                        }
                    });
                }

                return line;
            }).join('\n');

            // Log preview of rewritten playlist
            console.log(`[VIXSRC PROXY] Rewritten playlist start: ${rewritten.substring(0, 50).replace(/\n/g, '\\n')}`);

            res.send(rewritten);
        } else if (contentType && (contentType.includes('text/') || contentType.includes('json') || contentType.includes('xml') || contentType.includes('vtt'))) {
            // Handle text-based content (Subtitles, JSON, etc.)
            console.log(`[VIXSRC PROXY] Proxying text data (${contentType})`);
            const textData = response.data.toString('utf-8');
            res.status(response.status).send(textData);
        } else {
            // Pour les segments TS ou autres, envoyer directement
            console.log(`[VIXSRC PROXY] Proxying binary data (${response.data.length} bytes)`);
            res.status(response.status).send(response.data);
        }

    } catch (error) {
        console.error(`[VIXSRC PROXY] Exception:`, error.message);
        res.status(500).json({ error: 'Erreur proxy Vixsrc', details: error.message });
    }
}
