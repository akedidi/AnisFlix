import axios from 'axios';
import { extract_voe } from './_services/universalvo/extractors/voe.js';
import { ErrorObject } from './_services/universalvo/helpers/ErrorObject.js';

/**
 * Unified Extractor Endpoint
 * 
 * Supports: vidzy, vidmoly, voe, darkibox
 * 
 * Usage: POST /api/extract
 * Body: { type: "vidzy"|"vidmoly"|"voe"|"darkibox", url: "..." }
 * 
 * Returns: { success: true, m3u8Url: "...", type: "hls" }
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.PUBLIC_SITE_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// ==================== VIDZY EXTRACTOR ====================

function deobfuscateVidzy(packedCode) {
  try {
    const matches = packedCode.match(/eval\(function\(p,a,c,k,e,d\)\{.*return p\}\('(.*)',(\d+),(\d+),'(.*)'.split\('\|'\)\)\)/s);
    if (!matches) throw new Error("Format du code obfusqué non reconnu");

    let p = matches[1];
    const a = parseInt(matches[2], 10);
    const c = parseInt(matches[3], 10);
    const k = matches[4].split('|');

    if (isNaN(a) || isNaN(c) || !Array.isArray(k)) {
      throw new Error("Paramètres de désobfuscation invalides");
    }

    const getIdentifier = (index) => index.toString(a);

    for (let i = c - 1; i >= 0; i--) {
      if (k[i]) {
        const identifier = getIdentifier(i);
        const regex = new RegExp('\\b' + identifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'g');
        p = p.replace(regex, k[i]);
      }
    }
    return p;
  } catch (error) {
    console.log("[VIDZY] Deobfuscation error:", error.message);
    throw error;
  }
}

async function extractVidzy(url) {
  console.log(`[VIDZY] Extracting from: ${url}`);

  const response = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://vidzy.org/'
    },
    timeout: 15000
  });

  const html = response.data;
  let m3u8Link = null;

  // Method 1: Deobfuscation
  const packedScriptRegex = /<script type='text\/javascript'>\s*(eval\(function\(p,a,c,k,e,d\){.*?}\(.*?\)))\s*<\/script>/s;
  const scriptMatch = html.match(packedScriptRegex);

  if (scriptMatch && scriptMatch[1]) {
    console.log("[VIDZY] Found obfuscated script, deobfuscating...");
    const deobfuscatedCode = deobfuscateVidzy(scriptMatch[1]);

    const m3u8Patterns = [
      /src:"(https?:\/\/[^"]+\.m3u8[^"]*)"/,
      /file:"(https?:\/\/[^"]+\.m3u8[^"]*)"/,
      /url:"(https?:\/\/[^"]+\.m3u8[^"]*)"/
    ];

    for (const pattern of m3u8Patterns) {
      const match = deobfuscatedCode.match(pattern);
      if (match) {
        m3u8Link = match[1];
        console.log("[VIDZY] Found via deobfuscation:", m3u8Link);
        return m3u8Link;
      }
    }
  }

  // Method 2: Direct patterns
  const directPatterns = [
    /https:\/\/v4\.vidzy\.org\/hls2\/[^"'\s]*master\.m3u8[^"'\s]*/gi,
    /https:\/\/v4\.vidzy\.org\/hls2\/[^"'\s]+\.m3u8[^"'\s]*/gi,
    /https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/
  ];

  for (const pattern of directPatterns) {
    const match = html.match(pattern);
    if (match) {
      m3u8Link = match[0];
      console.log("[VIDZY] Found via direct pattern:", m3u8Link);
      return m3u8Link;
    }
  }

  throw new Error('No m3u8 URL found in Vidzy page');
}

// ==================== VIDMOLY EXTRACTOR ====================

async function extractVidMoly(url) {
  console.log(`[VIDMOLY] Extracting from: ${url}`);

  const normalizedUrl = url.replace('vidmoly.to', 'vidmoly.net');

  // Try with CORS proxy first
  try {
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(normalizedUrl)}`;
    const response = await axios.get(proxyUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      timeout: 8000
    });

    const html = response.data.contents;

    const patterns = [
      /player\.setup\s*\(\s*\{[^}]*sources:\s*\[\s*\{\s*file:\s*["']([^"']+)["']/,
      /sources:\s*\[\s*\{\s*file:\s*"([^"]+)"\s*\}/,
      /https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        let rawUrl = (match[1] || match[0]).trim();
        if (rawUrl.includes(',') && rawUrl.includes('.urlset')) {
          rawUrl = rawUrl.replace(/,/g, '');
        }
        console.log("[VIDMOLY] Found:", rawUrl);
        return rawUrl;
      }
    }
  } catch (error) {
    console.log("[VIDMOLY] CORS proxy failed:", error.message);
  }

  // Fallback: Direct request
  try {
    const response = await axios.get(normalizedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://vidmoly.net/'
      },
      timeout: 5000
    });

    const html = response.data;
    const match = html.match(/player\.setup\s*\(\s*\{[^}]*sources:\s*\[\s*\{\s*file:\s*["']([^"']+)["']/);
    if (match) {
      let rawUrl = match[1].trim();
      if (rawUrl.includes(',') && rawUrl.includes('.urlset')) {
        rawUrl = rawUrl.replace(/,/g, '');
      }
      console.log("[VIDMOLY] Found via fallback:", rawUrl);
      return rawUrl;
    }
  } catch (error) {
    console.log("[VIDMOLY] Fallback failed:", error.message);
  }

  throw new Error('No m3u8 URL found in VidMoly page');
}

// ==================== DARKIBOX EXTRACTOR ====================

async function extractDarkibox(url) {
  console.log(`[DARKIBOX] Extracting from: ${url}`);

  // Try with CORS proxy
  try {
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    const response = await axios.get(proxyUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      timeout: 10000
    });

    const html = response.data.contents;

    const patterns = [
      /sources:\s*\[\s*\{\s*file:\s*["']([^"']+)["']/,
      /player\.setup\s*\(\s*\{[^}]*sources:\s*\[\s*\{\s*file:\s*["']([^"']+)["']/,
      /https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        const m3u8Url = (match[1] || match[0]).trim();
        console.log("[DARKIBOX] Found:", m3u8Url);
        return m3u8Url;
      }
    }
  } catch (error) {
    console.log("[DARKIBOX] CORS proxy failed:", error.message);
  }

  // Direct request fallback
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://darkibox.com/'
      },
      timeout: 8000
    });

    const html = response.data;
    const match = html.match(/sources:\s*\[\s*\{\s*file:\s*["']([^"']+)["']/);
    if (match) {
      console.log("[DARKIBOX] Found via fallback:", match[1]);
      return match[1];
    }
  } catch (error) {
    console.log("[DARKIBOX] Fallback failed:", error.message);
  }

  throw new Error('No m3u8 URL found in Darkibox page');
}

// ==================== MAIN HANDLER ====================

export default async function handler(req, res) {
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Use POST.' });
  }

  try {
    const { type, url } = req.body;

    if (!type || !url) {
      return res.status(400).json({
        success: false,
        error: 'Parameters "type" and "url" are required',
        supported: ['vidzy', 'vidmoly', 'voe', 'darkibox']
      });
    }

    console.log(`🎬 [EXTRACT] Type: ${type}, URL: ${url}`);

    let m3u8Url;

    switch (type.toLowerCase()) {
      case 'vidzy':
        m3u8Url = await extractVidzy(url);
        break;

      case 'vidmoly':
        m3u8Url = await extractVidMoly(url);
        break;

      case 'voe':
        const voeResult = await extract_voe(url);
        if (voeResult instanceof ErrorObject) {
          throw new Error(voeResult.message);
        }
        m3u8Url = voeResult;
        break;

      case 'darkibox':
        m3u8Url = await extractDarkibox(url);
        break;

      default:
        return res.status(400).json({
          success: false,
          error: `Unknown extractor type: ${type}`,
          supported: ['vidzy', 'vidmoly', 'voe', 'darkibox']
        });
    }

    console.log(`✅ [EXTRACT] Success: ${m3u8Url}`);
    return res.status(200).json({
      success: true,
      m3u8Url,
      type: 'hls',
      extractor: type
    });

  } catch (error) {
    console.error(`❌ [EXTRACT] Error:`, error.message);
    return res.status(500).json({
      success: false,
      error: error.message,
      extractor: req.body?.type || 'unknown'
    });
  }
}
