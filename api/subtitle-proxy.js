/**
 * Serverless function to proxy and convert SRT subtitles to VTT
 * Simplified version for maximum Vercel compatibility
 */
export default async function handler(req, res) {
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
            res.setHeader('Access-Control-Allow-Origin', '*');
            return res.status(400).json({ error: 'URL parameter is required' });
        }

        console.log(`[SUBTITLE PROXY] Fetching: ${url}`);

        // Fetch subtitle using fetch API
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        let subtitleContent = await response.text();
        console.log(`[SUBTITLE PROXY] Fetched ${subtitleContent.length} bytes`);

        // Apply offset if provided
        const { offset } = req.query;
        if (offset) {
            const offsetSeconds = parseFloat(offset);
            if (!isNaN(offsetSeconds) && offsetSeconds !== 0) {
                console.log(`[SUBTITLE PROXY] Applying offset: ${offsetSeconds}s`);
                subtitleContent = applyOffset(subtitleContent, offsetSeconds);
            }
        }

        // Convert SRT to VTT if needed (after offset, or before? Better before to standardize)
        if (!subtitleContent.trim().startsWith('WEBVTT')) {
            console.log('[SUBTITLE PROXY] Converting SRT to VTT');
            subtitleContent = srtToVtt(subtitleContent);
        }

        // Set proper headers for VTT with CORS
        res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.setHeader('Cache-Control', 'public, max-age=3600');

        return res.status(200).send(subtitleContent);

    } catch (error) {
        console.error('[SUBTITLE PROXY] Error:', error.message, error.stack);

        res.setHeader('Access-Control-Allow-Origin', '*');
        return res.status(500).json({
            error: 'Failed to fetch or convert subtitle',
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
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

/**
 * Apply time offset to VTT/SRT content
 */
function applyOffset(content, offsetSeconds) {
    // Regex to find timestamps: 00:00:00,000 or 00:00:00.000
    return content.replace(/(\d{2}):(\d{2}):(\d{2})[.,](\d{3})/g, (match, h, m, s, ms) => {
        const totalSeconds = parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s) + parseInt(ms) / 1000;
        const newTotalSeconds = Math.max(0, totalSeconds + offsetSeconds);

        const newH = Math.floor(newTotalSeconds / 3600);
        const newM = Math.floor((newTotalSeconds % 3600) / 60);
        const newS = Math.floor(newTotalSeconds % 60);
        const newMs = Math.round((newTotalSeconds % 1) * 1000);

        return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}:${String(newS).padStart(2, '0')}.${String(newMs).padStart(3, '0')}`;
    });
}
