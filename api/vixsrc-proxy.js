// Vixsrc Proxy - Serverless Function (v7 - Stable)
// Reverted from Edge Function due to 403 issues

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range, Authorization, *');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, HEAD, OPTIONS');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Content-Type, Accept-Ranges');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const { url } = req.query;
        if (!url || typeof url !== 'string') return res.status(400).json({ error: 'URL Missing' });

        let decodedUrl = url;
        if (decodedUrl.includes('/api/vixsrc-proxy')) {
            const match = decodedUrl.match(/[?&]url=([^&]+)/);
            if (match) decodedUrl = decodeURIComponent(match[1]);
        }

        console.log(`[VIXSRC PROXY] Request: ${decodedUrl.substring(0, 80)}...`);

        const isPlaylist = decodedUrl.includes('.m3u8') || decodedUrl.includes('playlist');

        // Browser-like headers
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://vixsrc.to/',
            'Origin': 'https://vixsrc.to',
            'Accept': '*/*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'identity',
        };

        // Forward Range for segments only
        if (!isPlaylist && req.headers.range) {
            headers['Range'] = req.headers.range;
        }

        const response = await fetch(decodedUrl, {
            method: req.method,
            headers
        });

        console.log(`[VIXSRC PROXY] Upstream: ${response.status}`);

        if (!response.ok) {
            return res.status(response.status).send(`Upstream Error: ${response.statusText}`);
        }

        // Forward Content-Type
        const contentType = response.headers.get('content-type');
        if (contentType) res.setHeader('Content-Type', contentType);

        // Forward safe headers
        ['accept-ranges', 'content-range'].forEach(h => {
            const val = response.headers.get(h);
            if (val) res.setHeader(h.replace(/(^|-)(\w)/g, c => c.toUpperCase()), val);
        });

        if (isPlaylist) {
            // --- PLAYLIST MODE ---
            // Keep proxying headers/content for the manifest
            const buffer = await response.arrayBuffer();
            const text = Buffer.from(buffer).toString('utf-8');

            const baseUrl = new URL(decodedUrl);
            const protocol = req.headers['x-forwarded-proto'] || 'https';
            const host = req.headers.host;
            const origin = `${protocol}://${host}`;

            const rewritten = text.split(/\r?\n/).map(line => {
                if (!line.trim().startsWith('#') && line.trim().length > 0) {
                    try {
                        const abs = new URL(line, baseUrl).toString();
                        return `${origin}/api/vixsrc-proxy?url=${encodeURIComponent(abs)}`;
                    } catch { return line; }
                }
                if (line.includes('URI="')) {
                    return line.replace(/URI="([^"]+)"/g, (_, uri) => {
                        try {
                            const abs = new URL(uri, baseUrl).toString();
                            return `URI="${origin}/api/vixsrc-proxy?url=${encodeURIComponent(abs)}"`;
                        } catch { return _; }
                    });
                }
                return line;
            }).join('\n');

            res.setHeader('Content-Length', Buffer.byteLength(rewritten));
            res.status(response.status).send(rewritten);

        } else {
            // --- BINARY SEGMENT MODE ---
            // STRATEGY CHANGE: REDIRECT TO AVOID TIMEOUT
            // Instead of streaming (which times out after 10s on Vercel Hobby),
            // we redirect the client to the direct Vixsrc URL.
            // Since the URL is signed (token=...), it usually doesn't need Referer.

            console.log(`[VIXSRC PROXY] Redirecting segment to: ${decodedUrl.substring(0, 50)}...`);
            res.redirect(302, decodedUrl);
        }

    } catch (error) {
        console.error('[VIXSRC PROXY] Error:', error);
        if (!res.headersSent) res.status(500).json({ error: error.message });
    }
}
