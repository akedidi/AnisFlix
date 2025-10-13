export default async function handler(req, res) {
  // CORS headers
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
    const { url } = req.body;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL Vidzy requise' });
    }

    if (!url.includes('vidzy.org') && !url.includes('test')) {
      return res.status(400).json({ error: 'URL Vidzy invalide' });
    }

    // Pour les URLs de test, retourner un lien de test
    if (url.includes('test')) {
      return res.status(200).json({ 
        m3u8Url: `https://test-stream.m3u8?t=${Date.now()}`,
        test: true
      });
    }

    // Désactiver la simulation pour forcer l'extraction réelle
    // if (url.includes('vidzy.org') && url.includes('embed-')) {
    //   return res.status(200).json({ 
    //     m3u8Url: `https://demo-stream.m3u8?vidzy=${Date.now()}`,
    //     simulated: true
    //   });
    // }

    // Extraction réelle avec fetch (simulation navigateur complet)
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9,fr;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0',
        'Referer': 'https://vidzy.org/'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    
    // Recherche du lien m3u8 dans le HTML
    let m3u8Link = null;
    
    // Méthode 1: Recherche spécifique pour master.m3u8 Vidzy v4 (priorité haute)
    const masterPattern = /https:\/\/v4\.vidzy\.org\/hls2\/[^"'\s]*master\.m3u8[^"'\s]*/gi;
    const masterMatch = html.match(masterPattern);
    if (masterMatch) {
      m3u8Link = masterMatch[0];
    }

    // Méthode 1b: Recherche générale pour Vidzy v4 (si pas de master trouvé)
    if (!m3u8Link) {
      const vidzyV4Pattern = /https:\/\/v4\.vidzy\.org\/hls2\/[^"'\s]+\.m3u8[^"'\s]*/gi;
      const vidzyV4Match = html.match(vidzyV4Pattern);
      if (vidzyV4Match) {
        // Si on trouve un lien index ou autre, construire le lien master
        const foundUrl = vidzyV4Match[0];
        if (foundUrl.includes('index-') || foundUrl.includes('iframes-')) {
          // Remplacer index-v1-a1.m3u8 par master.m3u8
          m3u8Link = foundUrl.replace(/index-[^/]*\.m3u8/, 'master.m3u8').replace(/iframes-[^/]*\.m3u8/, 'master.m3u8');
        } else {
          m3u8Link = foundUrl;
        }
      }
    }

    // Méthode 2: Recherche dans les scripts (plus approfondie)
    if (!m3u8Link) {
      const scriptMatches = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi);
      if (scriptMatches) {
        for (const script of scriptMatches) {
          const scriptContent = script;
          
          // Recherche de patterns Vidzy spécifiques
          const vidzyPatterns = [
            /file:\s*["']([^"']*\.m3u8[^"']*)["']/gi,
            /source:\s*["']([^"']*\.m3u8[^"']*)["']/gi,
            /url:\s*["']([^"']*\.m3u8[^"']*)["']/gi,
            /src:\s*["']([^"']*\.m3u8[^"']*)["']/gi,
            /https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/gi
          ];
          
          for (const pattern of vidzyPatterns) {
            const match = scriptContent.match(pattern);
            if (match) {
              m3u8Link = match[1] || match[0];
              break;
            }
          }
          
          if (m3u8Link) break;
        }
      }
    }

    // Méthode 2: Recherche dans les variables JavaScript
    if (!m3u8Link) {
      const jsPatterns = [
        /var\s+\w+\s*=\s*["']([^"']*\.m3u8[^"']*)["']/gi,
        /let\s+\w+\s*=\s*["']([^"']*\.m3u8[^"']*)["']/gi,
        /const\s+\w+\s*=\s*["']([^"']*\.m3u8[^"']*)["']/gi
      ];
      
      for (const pattern of jsPatterns) {
        const match = html.match(pattern);
        if (match) {
          m3u8Link = match[1];
          break;
        }
      }
    }

    // Méthode 3: Recherche directe dans le HTML
    if (!m3u8Link) {
      const directMatch = html.match(/https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/);
      if (directMatch) {
        m3u8Link = directMatch[0];
      }
    }

    // Méthode 4: Recherche dans les attributs data
    if (!m3u8Link) {
      const dataPatterns = [
        /data-src="([^"]*\.m3u8[^"]*)"/gi,
        /data-url="([^"]*\.m3u8[^"]*)"/gi,
        /data-file="([^"]*\.m3u8[^"]*)"/gi
      ];
      
      for (const pattern of dataPatterns) {
        const match = html.match(pattern);
        if (match) {
          m3u8Link = match[1];
          break;
        }
      }
    }

    // Méthode 5: Recherche d'APIs ou endpoints cachés
    if (!m3u8Link) {
      const apiPatterns = [
        /\/api\/[^"'\s]*\.m3u8[^"'\s]*/gi,
        /\/stream\/[^"'\s]*\.m3u8[^"'\s]*/gi,
        /\/play\/[^"'\s]*\.m3u8[^"'\s]*/gi,
        /\/video\/[^"'\s]*\.m3u8[^"'\s]*/gi
      ];
      
      for (const pattern of apiPatterns) {
        const match = html.match(pattern);
        if (match) {
          m3u8Link = 'https://vidzy.org' + match[0];
          break;
        }
      }
    }

    // Méthode 6: Recherche de patterns HLS spécifiques
    if (!m3u8Link) {
      const hlsPatterns = [
        /#EXTM3U[\s\S]*?https:\/\/[^"'\s]+\.m3u8[^"'\s]*/gi,
        /master\.m3u8[^"'\s]*/gi,
        /index-[^"'\s]*\.m3u8[^"'\s]*/gi
      ];
      
      for (const pattern of hlsPatterns) {
        const match = html.match(pattern);
        if (match) {
          // Extraire l'URL complète du match
          const urlMatch = match[0].match(/https:\/\/[^"'\s]+\.m3u8[^"'\s]*/);
          if (urlMatch) {
            m3u8Link = urlMatch[0];
            break;
          }
        }
      }
    }

    // Méthode 7: Recherche de base64 ou encodage
    if (!m3u8Link) {
      const base64Patterns = [
        /atob\(["']([A-Za-z0-9+/=]+)["']\)/gi,
        /decodeURIComponent\(["']([^"']+)["']\)/gi
      ];
      
      for (const pattern of base64Patterns) {
        const match = html.match(pattern);
        if (match) {
          try {
            const decoded = Buffer.from(match[1], 'base64').toString();
            const m3u8Match = decoded.match(/https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/);
            if (m3u8Match) {
              m3u8Link = m3u8Match[0];
              break;
            }
          } catch (e) {
            // Ignore decoding errors
          }
        }
      }
    }

    if (!m3u8Link) {
      // Debug: retourner des informations sur le contenu reçu
      const debugInfo = {
        error: 'Impossible d\'extraire le lien m3u8',
        htmlLength: html.length,
        hasScripts: html.includes('<script'),
        htmlPreview: html.substring(0, 500) + '...',
        url: url,
        // Ajouter des informations de debug supplémentaires
        hasVidzyV4: html.includes('v4.vidzy.org'),
        hasHls: html.includes('hls2'),
        hasM3u8: html.includes('.m3u8'),
        scriptCount: (html.match(/<script/gi) || []).length
      };
      
      console.log('Debug Vidzy extraction:', debugInfo);
      return res.status(404).json(debugInfo);
    }

    return res.status(200).json({ m3u8Url: m3u8Link });

  } catch (error) {
    console.error('Erreur lors de l\'extraction Vidzy:', error);
    return res.status(500).json({ 
      error: 'Erreur serveur lors de l\'extraction',
      details: error.message,
      url: req.body?.url
    });
  }
}
