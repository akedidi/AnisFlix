export default async function handler(req, res) {
    // Vixsrc Proxy (v6 - Fix Content-Length & Stream)
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

        console.log(`[VIXSRC PROXY] Request: ${decodedUrl}`);

        // Helper to detect playlist
        const isPlaylist = decodedUrl.includes('.m3u8') || decodedUrl.includes('playlist');

        const headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://vixsrc.to/',
            'Origin': 'https://vixsrc.to'
        };

        // ONLY forward Range for binary segments to avoid 206 on playlists
        if (!isPlaylist && req.headers.range) {
            headers['Range'] = req.headers.range;
        }

        // Use standard fetch with method forwarding
        const response = await fetch(decodedUrl, {
            method: req.method,
            headers
        });

        console.log(`[VIXSRC PROXY] Upstream Status: ${response.status}`);

        if (!response.ok) {
            return res.status(response.status).send(`Upstream Error: ${response.statusText}`);
        }

        // Prepare headers
        const contentType = response.headers.get('content-type');
        if (contentType) res.setHeader('Content-Type', contentType);

        // Forward headers safely
        // REMOVED 'content-length' from forwarding list to avoid mismatch with decompressed streams
        const safeHeaders = ['accept-ranges', 'content-range'];
        safeHeaders.forEach(h => {
            const val = response.headers.get(h);
            if (val) res.setHeader(h.replace(/(^|-)(\w)/g, c => c.toUpperCase()), val);
        });

        if (isPlaylist) {
            // --- TEXT MODE (Rewrite) ---
            const buffer = await response.arrayBuffer();
            const originalText = Buffer.from(buffer).toString('utf-8');

            const baseUrl = new URL(decodedUrl);
            const protocol = req.headers['x-forwarded-proto'] || 'https';
            const host = req.headers.host;
            const origin = `${protocol}://${host}`;

            // Simple rewrite
            const rewritten = originalText.split(/\r?\n/).map(line => {
                if (!line.trim().startsWith('#') && line.trim().length > 0) {
                    try {
                        const abs = new URL(line, baseUrl).toString();
                        return `${origin}/api/vixsrc-proxy?url=${encodeURIComponent(abs)}`;
                    } catch (e) { return line; }
                }
                if (line.includes('URI="')) {
                    return line.replace(/URI="([^"]+)"/g, (_, uri) => {
                        try {
                            const abs = new URL(uri, baseUrl).toString();
                            return `URI="${origin}/api/vixsrc-proxy?url=${encodeURIComponent(abs)}"`;
                        } catch (e) { return _; }
                    });
                }
                return line;
            }).join('\n');

            // Explicitly set correct Content-Length for the new body
            res.setHeader('Content-Length', Buffer.byteLength(rewritten));
            res.status(response.status).send(rewritten);

        } else {
            // --- BINARY STREAM MODE ---
            // DO NOT forward Content-Length. Fetch might decompress gzip, making upstream CL invalid.
            // Let Node/Vercel handle Transfer-Encoding: chunked automatically.

            // FORCE Content-Type for .ts segments (Chromecast is strict)
            // Regex to match .ts extension, case insensitive, allowing query params
            if (/\.ts(\?|$)/i.test(decodedUrl)) {
                console.log('[VIXSRC PROXY] Forcing Content-Type: video/mp2t for segment');
                res.setHeader('Content-Type', 'video/mp2t');
            }

            res.status(response.status);

            // Manual Pipe
            if (response.body) {
                const reader = response.body.getReader();
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        res.write(value);
                    }
                } catch (e) {
                    console.error('[VIXSRC PROXY] Stream Break:', e);
                } finally {
                    res.end();
                }
            } else {
                res.end();
            }
        }

    } catch (error) {
        console.error('[VIXSRC PROXY] Crash:', error);
        if (!res.headersSent) res.status(500).json({ error: error.message });
    }
}
