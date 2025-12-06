import axios from 'axios';

// Vixsrc Proxy with Streaming Optimization (v3 - Axios)
// CORS headers - IMPORTANT pour Chromecast
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range, Authorization, *');
res.setHeader('Access-Control-Allow-Methods', 'GET, POST, HEAD, OPTIONS');
res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Content-Type, Accept-Ranges');

if (req.method === 'OPTIONS') {
    return res.status(200).end();
}

try {
    const { url } = req.query;

    if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'URL Vixsrc requise' });
    }

    // Ne PAS décoder l'URL ici, req.query le fait déjà automatiquement
    let decodedUrl = url;

    // Debug intensif pour Chromecast
    console.log('[Vixsrc Proxy] Incoming Request:', {
        originalUrl: url,
        decodedUrl: decodedUrl,
        method: req.method,
        range: req.headers.range
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
        // Ne PAS forcer identity avec axios, laisser axios gérer
        'Cache-Control': 'no-cache'
    };

    // Forward Range header if present
    if (req.headers.range) {
        console.log(`[VIXSRC PROXY] Forwarding Range: ${req.headers.range}`);
        headers['Range'] = req.headers.range;
    }

    // Utiliser AXIOS avec responseType: 'stream'
    const response = await axios.get(decodedUrl, {
        responseType: 'stream',
        headers: headers,
        timeout: 15000,
        validateStatus: () => true // Accepter tous les status codes pour les gérer nous-mêmes
    });

    console.log('[Vixsrc Proxy] Vixsrc Response:', {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers['content-type'],
        contentLength: response.headers['content-length']
    });

    // Copier les headers pertinents
    const headersToForward = ['content-type', 'content-length', 'content-range', 'accept-ranges'];
    headersToForward.forEach(header => {
        const value = response.headers[header];
        if (value) {
            // Formater le header (Content-Type au lieu de content-type)
            const headerName = header.replace(/(^|-)(\w)/g, c => c.toUpperCase());
            res.setHeader(headerName, value);
        }
    });

    if (response.status >= 400) {
        console.error(`[Vixsrc Proxy] Error from upstream: ${response.status}`);
        return res.status(response.status).send(response.data); // data est un stream, pipe possible
    }

    const contentType = response.headers['content-type'];
    const isM3U8 = (contentType && contentType.includes('mpegurl')) || decodedUrl.includes('.m3u8');
    console.log(`[VIXSRC PROXY] isM3U8 detected: ${isM3U8}`);

    if (isM3U8) {
        console.log(`[VIXSRC PROXY] Processing M3U8 playlist`);

        // Pour M3U8, on doit lire le stream en mémoire pour le modifier
        const stream = response.data;
        const chunks = [];

        stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        stream.on('end', () => {
            const buffer = Buffer.concat(chunks);
            const playlist = buffer.toString('utf-8');

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

                // 2. Gérer les attributs URI="..." dans les tags
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

            // Envoyer la playlist modifiée
            res.status(response.status).send(rewritten);
        });

        stream.on('error', (err) => {
            console.error('[VIXSRC PROXY] Error reading stream:', err);
            res.status(500).json({ error: 'Error processing playlist', details: err.message });
        });

    } else {
        // Pour les segments binaires, piper directement
        console.log(`[VIXSRC PROXY] Proxying binary data (STREAMING)`);
        res.status(response.status);
        response.data.pipe(res);
    }

} catch (error) {
    console.error(`[VIXSRC PROXY] Exception:`, error.message);
    if (!res.headersSent) {
        res.status(500).json({ error: 'Erreur proxy Vixsrc', details: error.message });
    }
}
