import axios from 'axios';

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({ error: 'Missing url parameter' });
        }

        // Validate URL is from MovieBox CDN
        if (!url.startsWith('https://bcdnw.hakunaymatata.com/') &&
            !url.startsWith('https://bcdnxw.hakunaymatata.com/') &&
            !url.startsWith('https://valiw.hakunaymatata.com/')) {
            return res.status(400).json({ error: 'Invalid CDN URL' });
        }

        console.log(`📦 [MovieBox Stream] Proxying: ${url.substring(0, 80)}...`);

        // Check for range request (seeking support)
        const range = req.headers.range;

        // Request configuration with proper CDN headers
        const config = {
            method: 'GET',
            url,
            headers: {
                'User-Agent': 'okhttp/4.12.0',
                'Referer': 'https://fmoviesunblocked.net/',
                'Origin': 'https://fmoviesunblocked.net',
                'Accept': '*/*',
                'Accept-Language': 'en-US,en;q=0.5',
                'Connection': 'keep-alive'
            },
            responseType: 'stream',
            timeout: 0, // No timeout for large files
            validateStatus: (status) => status < 500
        };

        // Add range header if present (for seeking)
        if (range) {
            config.headers['Range'] = range;
            console.log(`📦 [MovieBox Stream] Range request: ${range}`);
        }

        const response = await axios(config);

        // Forward status code
        res.status(response.status);

        // Forward important headers
        const headersToForward = [
            'content-type',
            'content-length',
            'content-range',
            'accept-ranges',
            'cache-control',
            'etag',
            'last-modified'
        ];

        headersToForward.forEach(header => {
            if (response.headers[header]) {
                res.setHeader(header, response.headers[header]);
            }
        });

        // Ensure CORS on response
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');

        // Pipe the video stream
        response.data.on('error', (error) => {
            console.error('📦 [MovieBox Stream] Stream error:', error.message);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Stream failed', details: error.message });
            }
        });

        res.on('close', () => {
            console.log('📦 [MovieBox Stream] Client closed connection');
            if (response.data && response.data.destroy) {
                response.data.destroy();
            }
        });

        response.data.pipe(res);

    } catch (error) {
        console.error('📦 [MovieBox Stream] Proxy error:', error.message);

        if (!res.headersSent) {
            res.status(502).json({
                error: 'Proxy failed',
                details: error.message
            });
        }
    }
}
