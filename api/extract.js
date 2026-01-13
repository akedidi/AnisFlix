import { DarkiboxExtractor } from './_services/universalvo/extractors/DarkiboxExtractor.js';
import { VidmolyExtractor } from './_services/universalvo/extractors/VidmolyExtractor.js';
import { extract_voe } from './_services/universalvo/extractors/voe.js';

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { type, url } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    console.log(`[EXTRACT API] Request type=${type}, url=${url}`);

    try {
        let result;

        switch (type) {
            case 'darkibox':
            case 'vidzy': // Darkibox extractor often handles vidzy/vidhide variants or detailed logic
                const darkiExtractor = new DarkiboxExtractor();
                // Check if extractor supports 'vidzy' explicitly or just generic extraction
                // Assuming extract(url) returns { m3u8Url } or similar
                result = await darkiExtractor.extract(url);
                break;

            case 'vidmoly':
            case 'flaswish':
                const vidmolyExtractor = new VidmolyExtractor();
                result = await vidmolyExtractor.extract(url);
                break;

            case 'voe':
                result = await extract_voe(url);
                break;

            default:
                // Try to infer from URL if type is missing or generic
                if (url.includes('darkibox') || url.includes('vidzy') || url.includes('vidhide')) {
                    const ext = new DarkiboxExtractor();
                    result = await ext.extract(url);
                } else if (url.includes('vidmoly') || url.includes('flaswish')) {
                    const ext = new VidmolyExtractor();
                    result = await ext.extract(url);
                } else {
                    return res.status(400).json({ error: `Unknown or unsupported type: ${type}` });
                }
        }

        if (!result) {
            return res.status(500).json({ error: 'Extraction returned empty result' });
        }

        return res.status(200).json(result);

    } catch (error) {
        console.error(`[EXTRACT API] Error extracting ${url}:`, error);
        return res.status(500).json({
            error: error.message || 'Extraction failed',
            details: error.toString()
        });
    }
}
