// import chromium from '@sparticuz/chromium';
// import puppeteer from 'puppeteer-core';
import { DarkiboxExtractor } from './_services/universalvo/extractors/DarkiboxExtractor.js';
import { VidmolyExtractor } from './_services/universalvo/extractors/VidmolyExtractor.js';
import { extract_voe } from './_services/universalvo/extractors/voe.js';
import { FSVidExtractor } from './_services/universalvo/extractors/FSVidExtractor.js';
import { BysebuhoExtractor } from './_services/universalvo/extractors/BysebuhoExtractor.js';
import { VSEmbedExtractor } from './_services/universalvo/extractors/VSEmbedExtractor.js';
import { unpack, isPacked } from './_services/universalvo/extractors/utils/packer.js';

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method === 'GET' && req.query.type === 'diagnose') {
        req.body = { type: 'diagnose', url: 'test' }; // Mock body for GET
    } else if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { type, url } = req.body || {};

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

            case 'luluvid':
                try {
                    console.log(`🚀 [Luluvid] Extracting: ${url}`);
                    const refererBase = url.includes('lulustream') ? 'https://lulustream.com/' : 'https://luluvid.com/';
                    const originBase = refererBase.replace(/\/$/, '');
                    const response = await fetch(url, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                            'Referer': refererBase
                        }
                    });

                    const html = await response.text();
                    let searchText = html;
                    if (isPacked(html)) {
                        const unpacked = unpack(html);
                        if (unpacked) {
                            console.log(`📦 [Luluvid] Unpacked JS (${unpacked.length} chars)`);
                            searchText = html + '\n' + unpacked;
                        }
                    }

                    const sourceMatch = searchText.match(/sources:\s*\[\s*{\s*file:\s*["']([^"']+\.m3u8[^"']*)["']/);
                    const fileMatch = searchText.match(/file:\s*["']([^"']+\.m3u8[^"']*)["']/);
                    const globalMatch = searchText.match(/(https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*)/);

                    let m3u8 = null;
                    if (sourceMatch?.[1]) m3u8 = sourceMatch[1];
                    else if (fileMatch?.[1]) m3u8 = fileMatch[1];
                    else if (globalMatch?.[1]) m3u8 = globalMatch[1];

                    if (m3u8) {
                        console.log(`✅ [Luluvid] Found M3U8: ${m3u8.substring(0, 50)}...`);
                        result = {
                            success: true,
                            m3u8Url: m3u8,
                            type: 'hls',
                            headers: {
                                'Referer': refererBase,
                                'Origin': originBase,
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                            }
                        };
                    } else {
                        throw new Error("No M3U8 found in Luluvid HTML");
                    }
                } catch (e) {
                    console.error(`❌ [Luluvid] Extraction failed: ${e.message}`);
                    throw e;
                }
                break;

            case 'voe':
                result = await extract_voe(url);
                break;

            case 'fsvid':
                const fsvidExtractor = new FSVidExtractor();
                result = await fsvidExtractor.extract(url);
                break;

            case 'bysebuho':
                const bysebuhoExtractor = new BysebuhoExtractor();
                result = await bysebuhoExtractor.extract(url);
                break;

            case 'vsembed':
                const vsEmbedExtractor = new VSEmbedExtractor();
                result = await vsEmbedExtractor.extract(url);
                break;

            case 'diagnose':
                result = { status: 'DISABLED', message: "Puppeteer disabled on serverless" };
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

        if (result.success === false || result.error || (result.message && !result.m3u8Url)) {
            const status = result.responseCode || 502;
            return res.status(status).json({
                success: false,
                error: result.message || result.error || 'Extraction failed',
            });
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
