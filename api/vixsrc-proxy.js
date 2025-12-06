// Vixsrc Proxy with Streaming Optimization (v4 - Revert to Fetch with Manual Stream)
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

    let decodedUrl = url;

    // Debug intensif pour Chromecast
    console.log('[Vixsrc Proxy] Incoming Request:', {
        originalUrl: url,
        decodedUrl: decodedUrl,
        method: req.method,
        range: req.headers.range
    });

    if (decodedUrl.includes('/api/vixsrc-proxy')) {
        const urlMatch = decodedUrl.match(/[?&]url=([^&]+)/);
        if (urlMatch) {
            decodedUrl = decodeURIComponent(urlMatch[1]);
        }
    }

    console.log(`[VIXSRC PROXY] Requesting URL: ${decodedUrl}`);

    const headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://vixsrc.to/',
        'Origin': 'https://vixsrc.to',
        'Accept': '*/*, application/x-mpegURL',
        'Accept-Language': 'en-US,en;q=0.9',
        // Pas d'encoding identity forcé ici avec fetch, laisser le natif
        'Cache-Control': 'no-cache'
    };

    if (req.headers.range) {
        console.log(`[VIXSRC PROXY] Forwarding Range: ${req.headers.range}`);
        headers['Range'] = req.headers.range;
    }

    // Utilisation de fetch natif (plus robuste sur Vercel Edge/Serverless pour le streaming basique)
    const response = await fetch(decodedUrl, {
        headers: headers
    });

    console.log('[Vixsrc Proxy] Vixsrc Response:', {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type'),
        contentLength: response.headers.get('content-length')
    });

    if (!response.ok) {
        console.error(`[Vixsrc Proxy] Vixsrc Error Response: ${response.status} ${response.statusText}`);
        throw new Error(`Vixsrc responded with ${response.status}: ${response.statusText}`);
    }

    // Copier les headers pertinents
    const contentType = response.headers.get('content-type');
    if (contentType) res.setHeader('Content-Type', contentType);

    const headersToForward = ['content-length', 'content-range', 'accept-ranges'];
    headersToForward.forEach(header => {
        const value = response.headers.get(header);
        if (value) {
            const headerName = header.replace(/(^|-)(\w)/g, c => c.toUpperCase());
            res.setHeader(headerName, value);
        }
    });

    // Gérer les playlists M3U8
    const isM3U8 = (contentType && contentType.includes('mpegurl')) || decodedUrl.includes('.m3u8');

    if (isM3U8) {
        console.log(`[VIXSRC PROXY] Processing M3U8 playlist`);
        const buffer = await response.arrayBuffer();
        const playlist = Buffer.from(buffer).toString('utf-8');

        const baseUrl = new URL(decodedUrl);
        const protocol = req.headers['x-forwarded-proto'] || 'https';
        const host = req.headers.host;
        const origin = `${protocol}://${host}`;

        const lines = playlist.split(/\r?\n/);
        const rewritten = lines.map((line) => {
            if (line && !line.trim().startsWith('#')) {
                try {
                    const absoluteUrl = new URL(line, baseUrl).toString();
                    return `${origin}/api/vixsrc-proxy?url=${encodeURIComponent(absoluteUrl)}`;
                } catch (e) {
                    return line;
                }
            }
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

        res.status(response.status).send(rewritten);
    } else {
        // Streaming binaire manuel avec ReadableStream
        console.log(`[VIXSRC PROXY] Proxying binary data (STREAMING)`);
        res.status(response.status);

        if (response.body) {
            // Utiliser un reader pour streamer manuellement
            // C'est la méthode la plus sûre sur Vercel Node Runtime
            // si on ne veut pas charger tout le fichier en mémoire
            const reader = response.body.getReader();

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    res.write(value);
                }
                res.end();
            } catch (streamError) {
                console.error('[VIXSRC PROXY] Stream error:', streamError);
                res.end(); // Terminer la réponse même en cas d'erreur
            }
        } else {
            console.log('[VIXSRC PROXY] No body in response');
            res.end();
        }
    }

} catch (error) {
    console.error(`[VIXSRC PROXY] Exception:`, error.message);
    if (!res.headersSent) {
        res.status(500).json({ error: 'Erreur proxy Vixsrc', details: error.message });
    }
}
