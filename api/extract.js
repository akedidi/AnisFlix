import axios from 'axios';
import { extract_voe } from './_services/universalvo/extractors/voe.js';
import { ErrorObject } from './_services/universalvo/helpers/ErrorObject.js';

/**
 * Unified Extractor Endpoint
 * 
 * Supports: vidzy, vidmoly, voe, darkibox, vixsrc
 * 
 * Usage: POST /api/extract
 * Body: { type: "vidzy"|"vidmoly"|"voe"|"darkibox"|"vixsrc", url: "...", tmdbId?: number, mediaType?: string, season?: number, episode?: number }
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
  const packedScriptRegex = /<script type='text\/javascript'>\s*(eval\(function\(p,a,c,k,e,d\)\{.*?\}\(.*?\)\))\s*<\/script>/s;
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
  console.log(`[VIDMOLY] Normalized URL: ${normalizedUrl}`);

  try {
    const response = await axios.get(normalizedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36',
        'Referer': 'https://vidmoly.net/',
        'Sec-Fetch-Dest': 'iframe'
      },
      timeout: 15000
    });

    const html = response.data;

    // Primary pattern: file:"..."
    const fileMatch = html.match(/file:"([^"]+)"/);
    if (fileMatch && fileMatch[1]) {
      let m3u8Url = fileMatch[1].trim();
      
      // VidMoly URLs use comma-separated quality format like "_,l,n,.urlset"
      // Do NOT remove commas - they are required for proper streaming
      console.log("[VIDMOLY] Found m3u8:", m3u8Url);
      return m3u8Url;
    }

    console.log("[VIDMOLY] Primary pattern failed, trying fallback patterns...");

    // Fallback patterns
    const fallbackPatterns = [
      /sources:\s*\[\s*\{\s*file:\s*"([^"]+)"\s*\}/,
      /player\.setup\s*\(\s*\{[^}]*sources:\s*\[\s*\{\s*file:\s*"([^"]+)"/
    ];

    for (const pattern of fallbackPatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        let m3u8Url = match[1].trim();
        // Do NOT strip commas - they are part of the quality selector format
        console.log("[VIDMOLY] Found via fallback:", m3u8Url);
        return m3u8Url;
      }
    }

    throw new Error('Could not find m3u8 URL in VidMoly page');


  } catch (error) {
    console.error("[VIDMOLY] Extraction failed:", error.message);
    if (error.response) {
      console.error("[VIDMOLY] Response status:", error.response.status);
      console.error("[VIDMOLY] Response data:", error.response.data?.substring(0, 200));
    }
    throw new Error(`VidMoly extraction failed: ${error.message}`);
  }
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

// ==================== VIXSRC EXTRACTOR ====================

async function extractVixsrc(tmdbId, mediaType = 'movie', season = null, episode = null) {
  console.log(`[VIXSRC] Extracting TMDB ID: ${tmdbId}, Type: ${mediaType}`);

  const baseUrl = 'https://vixsrc.to';
  let vixsrcUrl;

  if (mediaType === 'movie') {
    vixsrcUrl = `${baseUrl}/movie/${tmdbId}`;
  } else {
    if (!season || !episode) {
      throw new Error('Season and episode required for TV shows');
    }
    vixsrcUrl = `${baseUrl}/tv/${tmdbId}/${season}/${episode}`;
  }

  console.log(`[VIXSRC] Fetching: ${vixsrcUrl}`);

  const response = await axios.get(vixsrcUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    },
    timeout: 15000
  });

  const html = response.data;
  let masterPlaylistUrl = null;

  // Method 1: Look for window.masterPlaylist
  if (html.includes('window.masterPlaylist')) {
    const urlMatch = html.match(/url:\s*['"]([^'"]+)['"]/);
    const tokenMatch = html.match(/['"]?token['"]?\s*:\s*['"]([^'"]+)['"]/);
    const expiresMatch = html.match(/['"]?expires['"]?\s*:\s*['"]([^'"]+)['"]/);

    if (urlMatch && tokenMatch && expiresMatch) {
      const baseStreamUrl = urlMatch[1];
      const token = tokenMatch[1];
      const expires = expiresMatch[1];

      if (baseStreamUrl.includes('?b=1')) {
        masterPlaylistUrl = `${baseStreamUrl}&token=${token}&expires=${expires}&h=1&lang=en`;
      } else {
        masterPlaylistUrl = `${baseStreamUrl}?token=${token}&expires=${expires}&h=1&lang=en`;
      }
      console.log(`[VIXSRC] Constructed master playlist URL`);
    }
  }

  // Method 2: Look for direct .m3u8 URLs
  if (!masterPlaylistUrl) {
    const m3u8Match = html.match(/(https?:\/\/[^'"\s]+\.m3u8[^'"\s]*)/);
    if (m3u8Match) {
      masterPlaylistUrl = m3u8Match[1];
      console.log(`[VIXSRC] Found direct m3u8:`, masterPlaylistUrl);
    }
  }

  if (!masterPlaylistUrl) {
    throw new Error('No master playlist URL found in Vixsrc page');
  }

  return masterPlaylistUrl;
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
    const { type, url, tmdbId, mediaType, season, episode } = req.body;

    if (!type) {
      return res.status(400).json({
        success: false,
        error: 'Parameter "type" is required',
        supported: ['vidzy', 'vidmoly', 'voe', 'darkibox', 'vixsrc']
      });
    }

    console.log(`🎬 [EXTRACT] Type: ${type}, URL: ${url || 'N/A'}, TMDB: ${tmdbId || 'N/A'}`);

    let m3u8Url;

    switch (type.toLowerCase()) {
      case 'vidzy':
        if (!url) throw new Error('URL required for vidzy');
        m3u8Url = await extractVidzy(url);
        break;

      case 'vidmoly':
        if (!url) throw new Error('URL required for vidmoly');
        m3u8Url = await extractVidMoly(url);
        break;

      case 'voe':
        if (!url) throw new Error('URL required for voe');
        const voeResult = await extract_voe(url);
        if (voeResult instanceof ErrorObject) {
          throw new Error(voeResult.message);
        }
        m3u8Url = voeResult;
        break;

      case 'darkibox':
        if (!url) throw new Error('URL required for darkibox');
        m3u8Url = await extractDarkibox(url);
        break;

      case 'vixsrc':
        if (!tmdbId || !mediaType) {
          throw new Error('tmdbId and mediaType required for vixsrc');
        }
        m3u8Url = await extractVixsrc(tmdbId, mediaType, season, episode);
        break;

      default:
        return res.status(400).json({
          success: false,
          error: `Unknown extractor type: ${type}`,
          supported: ['vidzy', 'vidmoly', 'voe', 'darkibox', 'vixsrc']
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

