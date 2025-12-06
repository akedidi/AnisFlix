export const config = {
    runtime: 'edge',
};

export default async function handler(request: Request) {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');

    // CORS headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Range, Authorization',
        'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Content-Type, Accept-Ranges',
    };

    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    if (!targetUrl) {
        return new Response(JSON.stringify({ error: 'URL Missing' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    let decodedUrl = targetUrl;
    // Handle double encoding
    if (decodedUrl.includes('/api/vixsrc-proxy')) {
        const match = decodedUrl.match(/[?&]url=([^&]+)/);
        if (match) decodedUrl = decodeURIComponent(match[1]);
    }

    console.log(`[VIXSRC EDGE] Request: ${decodedUrl.substring(0, 80)}...`);

    const isPlaylist = decodedUrl.includes('.m3u8') || decodedUrl.includes('playlist');

    const headers: HeadersInit = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://vixsrc.to/',
        'Origin': 'https://vixsrc.to',
    };

    // Forward Range header only for segments
    const rangeHeader = request.headers.get('range');
    if (!isPlaylist && rangeHeader) {
        headers['Range'] = rangeHeader;
    }

    try {
        const response = await fetch(decodedUrl, {
            method: request.method,
            headers,
        });

        console.log(`[VIXSRC EDGE] Upstream: ${response.status}`);

        if (!response.ok) {
            return new Response(`Upstream Error: ${response.status}`, {
                status: response.status,
                headers: corsHeaders,
            });
        }

        if (isPlaylist) {
            // --- PLAYLIST MODE: Buffer, rewrite, send ---
            const text = await response.text();
            const baseUrl = new URL(decodedUrl);
            const origin = url.origin;

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

            return new Response(rewritten, {
                status: response.status,
                headers: {
                    ...corsHeaders,
                    'Content-Type': response.headers.get('content-type') || 'application/vnd.apple.mpegurl',
                },
            });
        } else {
            // --- STREAM MODE: Pass through response body ---
            const responseHeaders = new Headers(corsHeaders);

            // Forward relevant headers
            const ct = response.headers.get('content-type');
            if (/\.ts(\?|$)/i.test(decodedUrl)) {
                responseHeaders.set('Content-Type', 'video/mp2t');
            } else if (ct) {
                responseHeaders.set('Content-Type', ct);
            }

            const cl = response.headers.get('content-length');
            if (cl) responseHeaders.set('Content-Length', cl);

            const cr = response.headers.get('content-range');
            if (cr) responseHeaders.set('Content-Range', cr);

            const ar = response.headers.get('accept-ranges');
            if (ar) responseHeaders.set('Accept-Ranges', ar);

            // Edge Functions can directly pass the ReadableStream body
            return new Response(response.body, {
                status: response.status,
                headers: responseHeaders,
            });
        }
    } catch (error: any) {
        console.error('[VIXSRC EDGE] Error:', error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
}
