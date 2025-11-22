/**
 * Serverless function to proxy and convert SRT subtitles to VTT
 * This avoids CORS issues and ensures Chromecast compatibility
 */
module.exports = async (req, res) => {
    try {
        const { url } = req.query;

        if (!url || typeof url !== 'string') {
            return res.status(400).json({ error: 'URL parameter is required' });
        }

        console.log(`[SUBTITLE PROXY] Fetching and converting: ${url}`);

        // Fetch the subtitle file using native fetch
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Failed to fetch subtitle: ${response.status} ${response.statusText}`);
        }

        let subtitleContent = await response.text();

        // Convert SRT to VTT if needed
        if (!subtitleContent.startsWith('WEBVTT')) {
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
        console.error('[SUBTITLE PROXY] Error:', error.message);

        return res.status(500).json({
            error: 'Failed to fetch or convert subtitle',
            details: error.message
        });
    }
};

/**
 * Convert SRT format to WebVTT format
 * @param {string} srtContent - SRT subtitle content
 * @returns {string} - WebVTT subtitle content
 */
function srtToVtt(srtContent) {
    // Replace commas with dots in timestamps (SRT uses 00:00:00,000, VTT uses 00:00:00.000)
    let vtt = "WEBVTT\n\n" + srtContent
        .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2")
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n");

    return vtt;
}
