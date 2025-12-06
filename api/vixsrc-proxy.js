```javascript
import axios from 'axios';

export default async function handler(req, res) {
    // Vixsrc Proxy with Streaming Optimization (v5 - Robust Axios)
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

        // Debug basic
        console.log(`[VIXSRC PROXY]Requesting: ${ decodedUrl.substring(0, 100) }...`);

        if (decodedUrl.includes('/api/vixsrc-proxy')) {
            const urlMatch = decodedUrl.match(/[?&]url=([^&]+)/);
            if (urlMatch) decodedUrl = decodeURIComponent(urlMatch[1]);
        }

        const headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://vixsrc.to/',
            'Origin': 'https://vixsrc.to',
            'Accept': '*/*',
            'Cache-Control': 'no-cache'
        };

        if (req.headers.range) {
            headers['Range'] = req.headers.range;
        }

        // 1. Détecter si c'est probablement une playlist (M3U8) ou un segment
        // On fait une requête HEAD d'abord ou on devine par l'extension
        const isLikelyPlaylist = decodedUrl.includes('.m3u8') || decodedUrl.includes('playlist');

        // Configuration Axios
        const axiosConfig = {
            headers: headers,
            timeout: 15000,
            validateStatus: () => true, // Ne pas lancer d'exception sur 4xx/5xx
            responseType: isLikelyPlaylist ? 'arraybuffer' : 'stream'
        };

        if (isLikelyPlaylist) {
            // --- MODE PLAYLIST (M3U8) ---
            console.log(`[VIXSRC PROXY]Mode: PLAYLIST(Buffer)`);
            const response = await axios.get(decodedUrl, axiosConfig);

            // Log status
            console.log(`[VIXSRC PROXY]Status: ${ response.status } `);
            
            if (response.status >= 400) {
                console.error(`[VIXSRC PROXY] Upstream Error: ${ response.status } `);
                return res.status(response.status).send(response.data);
            }

            // Forward headers
            const contentType = response.headers['content-type'];
            if (contentType) res.setHeader('Content-Type', contentType);

            // Rewrite M3U8
            const buffer = response.data;
            const content = buffer.toString('utf-8');
            
            // Vérifier si c'est vraiment un M3U8
            if (content.includes('#EXTM3U')) {
                const baseUrl = new URL(decodedUrl);
                const protocol = req.headers['x-forwarded-proto'] || 'https';
                const host = req.headers.host;
                const origin = `${ protocol }://${host}`;

const rewritten = content.split(/\r?\n/).map(line => {
    if (line && !line.trim().startsWith('#')) {
        try {
            const absoluteUrl = new URL(line, baseUrl).toString();
            return `${origin}/api/vixsrc-proxy?url=${encodeURIComponent(absoluteUrl)}`;
        } catch (e) { return line; }
    }
    if (line && line.trim().startsWith('#') && line.includes('URI="')) {
        return line.replace(/URI="([^"]+)"/g, (match, uri) => {
            try {
                const absoluteUrl = new URL(uri, baseUrl).toString();
                return `URI="${origin}/api/vixsrc-proxy?url=${encodeURIComponent(absoluteUrl)}"`;
            } catch (e) { return match; }
        });
    }
    return line;
}).join('\n');

res.send(rewritten);
            } else {
    // Pas une playlist ? Renvoyer tel quel
    res.send(buffer);
}

        } else {
    // --- MODE STREAM (Segments, Binaires) ---
    console.log(`[VIXSRC PROXY] Mode: STREAM (Binary)`);
    const response = await axios.get(decodedUrl, axiosConfig);

    console.log(`[VIXSRC PROXY] Stream Status: ${response.status}`);

    // Forward Headers importants uniquement
    const headersToForward = ['content-type', 'content-length', 'content-range', 'accept-ranges'];
    headersToForward.forEach(key => {
        if (response.headers[key]) res.setHeader(key.replace(/(^|-)(\w)/g, c => c.toUpperCase()), response.headers[key]);
    });

    res.status(response.status);

    // Pipe stream
    response.data.pipe(res);

    // Gérer les erreurs de stream
    response.data.on('error', (err) => {
        console.error('[VIXSRC PROXY] Stream Error:', err);
        if (!res.headersSent) res.status(500).end();
    });
}

    } catch (error) {
    console.error(`[VIXSRC PROXY] Critical Error:`, error.message);
    if (!res.headersSent) {
        res.status(500).json({ error: 'Proxy Error', details: error.message });
    }
}
}
```
