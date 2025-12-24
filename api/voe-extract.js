import { extract_voe } from './_services/universalvo/extractors/voe.js';
import { ErrorObject } from './_services/universalvo/helpers/ErrorObject.js';

// Configuration CORS
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': process.env.PUBLIC_SITE_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * VOE Extractor API Endpoint
 * 
 * Usage: /api/voe-extract?url=<encoded_voe_url>
 * 
 * Returns: { success: true, m3u8: "https://...m3u8", type: "hls" }
 * Or: { success: false, error: "message" }
 */
export default async function handler(req, res) {
    // Configuration CORS
    Object.entries(CORS_HEADERS).forEach(([key, value]) => {
        res.setHeader(key, value);
    });

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        const { url, referer } = req.query;

        if (!url) {
            return res.status(400).json({
                success: false,
                error: 'Parameter "url" is required'
            });
        }

        const decodedUrl = decodeURIComponent(url);
        const decodedReferer = referer ? decodeURIComponent(referer) : '';

        console.log(`🎬 [VOE Extract] Extracting from: ${decodedUrl}`);

        const result = await extract_voe(decodedUrl, decodedReferer);

        if (result instanceof ErrorObject) {
            console.error('❌ [VOE Extract] Extraction failed:', result.message);
            return res.status(result.status || 500).json({
                success: false,
                error: result.message,
                details: result.description
            });
        }

        console.log(`✅ [VOE Extract] Success: ${result}`);
        return res.status(200).json({
            success: true,
            m3u8: result,
            type: 'hls'
        });

    } catch (error) {
        console.error('❌ [VOE Extract] Server error:', error.message);
        return res.status(500).json({
            success: false,
            error: 'Server error during VOE extraction',
            details: error.message
        });
    }
}
