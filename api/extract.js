import axios from 'axios';

// Fonction de désobfuscation Vidzy (version JavaScript)
function deobfuscate(packedCode) {
    const matches = packedCode.match(/eval\(function\(p,a,c,k,e,d\)\{[\s\S]*return p\}\('(.*)',(\d+),(\d+),'(.*)'\.split\('\|'\)\)\)/);

    if (!matches) {
        throw new Error("Le format du code obfusqué n'a pas pu être reconnu.");
    }

    let p = matches[1];
    const a = parseInt(matches[2], 10);
    const c = parseInt(matches[3], 10);
    const k = matches[4].split('|');

    const getIdentifier = (index) => {
        return index.toString(a);
    };

    for (let i = c - 1; i >= 0; i--) {
        if (k[i]) {
            const regex = new RegExp('\\b' + getIdentifier(i) + '\\b', 'g');
            p = p.replace(regex, k[i]);
        }
    }

    return p;
}

async function getVidzyM3u8Link(url) {
    try {
        console.log(`[VIDZY SCRAPER] Récupération du HTML depuis Vidzy : ${url}`);
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Referer': 'https://vidzy.org/'
            },
            timeout: 15000
        });
        
        const htmlContent = response.data;
        
        // Cherche le script contenant le code obfusqué
        const scriptRegex = /<script[^>]*>[\s\S]*?eval\(function\(p,a,c,k,e,d\)\{[\s\S]*?return p\}[\s\S]*?\)[\s\S]*?<\/script>/;
        const scriptMatch = htmlContent.match(scriptRegex);
        
        if (!scriptMatch) {
            throw new Error('Aucun code obfusqué trouvé sur la page');
        }
        
        console.log('[VIDZY SCRAPER] Code obfusqué trouvé, désobfuscation...');
        const deobfuscatedCode = deobfuscate(scriptMatch[0]);
        
        // Extrait le lien m3u8 du code désobfusqué
        const m3u8Match = deobfuscatedCode.match(/['"](https?:\/\/[^'"]*\.m3u8[^'"]*)['"]/);
        
        if (m3u8Match) {
            const m3u8Url = m3u8Match[1];
            console.log(`[VIDZY SCRAPER] Lien m3u8 extrait: ${m3u8Url}`);
            return m3u8Url;
        } else {
            console.log('[VIDZY SCRAPER] Code désobfusqué:', deobfuscatedCode.substring(0, 500) + '...');
            throw new Error('Aucun lien m3u8 trouvé dans le code désobfusqué');
        }
        
    } catch (error) {
        console.error('[VIDZY SCRAPER] Erreur lors de l\'extraction Vidzy:', error.message);
        return null;
    }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { type, url } = req.body;

    if (!type || !url) {
      return res.status(400).json({ error: 'Type and URL are required' });
    }

    console.log(`[EXTRACT] Type: ${type}, URL: ${url}`);

    // Configuration selon le type d'extraction
    switch (type) {
      case 'vidzy':
        console.log(`[EXTRACT VIDZY] Début extraction pour: ${url}`);
        const m3u8Url = await getVidzyM3u8Link(url);
        
        if (m3u8Url) {
          console.log(`[EXTRACT VIDZY] M3U8 extrait: ${m3u8Url}`);
          res.json({
            success: true,
            extractedUrl: m3u8Url,
            message: 'Vidzy M3U8 extracted successfully'
          });
        } else {
          console.log(`[EXTRACT VIDZY] Échec extraction pour: ${url}`);
          res.json({
            success: false,
            extractedUrl: url,
            message: 'Failed to extract Vidzy M3U8'
          });
        }
        break;
        
      case 'vidsrc':
        // Pour VidSrc, retourner l'URL directement
        res.json({
          success: true,
          extractedUrl: url,
          message: 'VidSrc URL processed'
        });
        break;
        
      default:
        return res.status(400).json({ error: 'Invalid extraction type' });
    }

  } catch (error) {
    console.error(`[EXTRACT ERROR] Type: ${req.body?.type}, Error:`, error.message);
    res.status(500).json({ 
      error: `Failed to extract ${req.body?.type || 'unknown'}`,
      details: error.message 
    });
  }
}
