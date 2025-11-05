import axios from 'axios';

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
      return res.status(400).json({ error: 'URL VidMoly requise' });
    }

    if (!url.includes('vidmoly.net')) {
      return res.status(400).json({ error: 'URL VidMoly invalide' });
    }

    console.log(`🚀 Bypass VidMoly pour : ${url}`);

    // Utiliser un service de proxy externe pour contourner la détection
    const proxyServices = [
      'https://api.allorigins.win/raw?url=',
      'https://cors-anywhere.herokuapp.com/',
      'https://api.codetabs.com/v1/proxy?quest=',
      'https://thingproxy.freeboard.io/fetch/'
    ];

    let html = null;
    let lastError = null;

    // Essayer chaque service de proxy
    for (const proxyUrl of proxyServices) {
      try {
        console.log(`🔄 Tentative avec proxy: ${proxyUrl}`);
        
        const response = await axios.get(proxyUrl + encodeURIComponent(url), {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
          },
          timeout: 15000,
          maxRedirects: 5,
          validateStatus: function (status) {
            return status >= 200 && status < 400;
          }
        });

        html = response.data;
        console.log(`✅ Proxy réussi: ${proxyUrl}`);
        break;

      } catch (error) {
        console.log(`❌ Proxy échoué: ${proxyUrl} - ${error.message}`);
        lastError = error;
        continue;
      }
    }

    if (!html) {
      console.log('❌ Tous les proxies ont échoué');
      return res.status(500).json({ 
        error: 'Impossible de contourner la détection VidMoly',
        details: lastError ? lastError.message : 'Tous les services de proxy ont échoué'
      });
    }

    console.log(`📄 HTML reçu (${html.length} caractères):`, html.substring(0, 200) + '...');

    // Vérifier si on a le message d'erreur AdBlock
    if (html.includes('Disable ADBlock') || html.includes('AdBlock')) {
      console.log('❌ VidMoly détecte toujours AdBlock même avec proxy');
      return res.status(403).json({ 
        error: 'VidMoly détecte un bloqueur de publicités. Impossible d\'extraire le lien.',
        details: 'Le site VidMoly bloque même les requêtes via proxy.'
      });
    }

    // Extraire le lien m3u8 avec une regex
    const playerSetupMatch = html.match(/player\.setup\s*\(\s*\{[^}]*sources:\s*\[\s*\{\s*file:\s*["']([^"']+)["']/);
    
    if (!playerSetupMatch) {
      console.log('❌ Impossible de trouver le lien m3u8 dans le HTML');
      return res.status(404).json({ 
        error: 'Impossible de trouver le lien m3u8 sur la page VidMoly.',
        details: 'Le HTML ne contient pas le script player.setup attendu'
      });
    }
    
    const brokenUrl = playerSetupMatch[1];
    const masterM3u8Url = brokenUrl.replace(/,/g, '');
    
    console.log(`✅ Lien master.m3u8 trouvé via proxy: ${masterM3u8Url}`);

    return res.status(200).json({ 
      success: true,
      m3u8Url: masterM3u8Url,
      source: 'vidmoly-bypass',
      originalUrl: url,
      method: 'proxy-bypass'
    });

  } catch (error) {
    console.error(`❌ Erreur lors du bypass VidMoly : ${error.message}`);
    return res.status(500).json({ 
      error: 'Erreur serveur lors du bypass VidMoly',
      details: error.message 
    });
  }
}
