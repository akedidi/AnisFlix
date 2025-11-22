const https = require('https');
const http = require('http');

/**
 * Serverless function to proxy and convert SRT subtitles to VTT
 * This avoids CORS issues and ensures Chromecast compatibility
 */
module.exports = async (req, res) => {
    // Handle OPTIONS for CORS preflight
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        return res.status(200).end();
    }

    try {
        const { url } = req.query;

        if (!url || typeof url !== 'string') {
            return res.status(400).json({ error: 'URL parameter is required' });
        }

        console.log(`[SUBTITLE PROXY] Fetching: ${url}`);

        // Fetch subtitle using Node.js https/http
        const subtitleContent = await fetchSubtitle(url);

        console.log(`[SUBTITLE PROXY] Fetched ${subtitleContent.length} bytes`);

        // Convert SRT to VTT if needed
        let finalContent = subtitleContent;
        if (!subtitleContent.trim().startsWith('WEBVTT')) {
            console.log('[SUBTITLE PROXY] Converting SRT to VTT');
            finalContent = srtToVtt(subtitleContent);
        }

        // Set proper headers for VTT with CORS
        res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.setHeader('Cache-Control', 'public, max-age=3600');

        return res.status(200).send(finalContent);

    } catch (error) {
        console.error('[SUBTITLE PROXY] Error:', error.message);

        res.setHeader('Access-Control-Allow-Origin', '*');
        return res.status(500).json({
            error: 'Failed to fetch or convert subtitle',
            message: error.message
        });
    }
};

/**
 * Fetch content from URL using Node.js http/https
 */
function fetchSubtitle(url) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https:') ? https : http;

        const request = protocol.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 10000
        }, (response) => {
            // Handle redirects
            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                return fetchSubtitle(response.headers.location)
                    .then(resolve)
                    .catch(reject);
            }

            if (response.statusCode !== 200) {
                reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
                return;
            }

            let data = '';
            response.setEncoding('utf8');
            response.on('data', chunk => data += chunk);
            response.on('end', () => resolve(data));
            response.on('error', reject);
        });

        request.on('error', reject);
        request.on('timeout', () => {
            request.destroy();
            reject(new Error('Request timeout'));
        });
    });
}

/**
 * Convert SRT format to WebVTT format
 */
function srtToVtt(srtContent) {
    let vtt = "WEBVTT\n\n" + srtContent
        .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2")
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n");

    return vtt;
}
