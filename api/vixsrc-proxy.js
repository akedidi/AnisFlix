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

        // Determine if content is playlist based on URL OR Content-Type
        const isHlsContent = isPlaylist ||
            (contentType && (
                contentType.includes('application/vnd.apple.mpegurl') ||
                contentType.includes('application/x-mpegURL') ||
                contentType.includes('audio/mpegurl')
            ));

        if (true) {
            // --- PROXY MODE (Everything) ---
            // We now proxy segments too to avoid CORS/Referer issues on web.
            // Vercel 10s timeout is a risk but segments are usually small.

            const buffer = await response.arrayBuffer();

            // Rewrite playlists ONLY
            let content = Buffer.from(buffer);
            if (isHlsContent) {
                const text = content.toString('utf-8');
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

                content = Buffer.from(rewritten);
                res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
            } else {
                // For keys and segments, forward original content type or default to binary
                const ct = response.headers.get('content-type');
                if (ct) res.setHeader('Content-Type', ct);
            }

            res.setHeader('Content-Length', content.length);
            res.status(response.status).send(content);

        } else {
            // Dead code removed
        }

    } catch (error) {
        console.error('[VIXSRC PROXY] Error:', error);
        if (!res.headersSent) res.status(500).json({ error: error.message });
    }
}
