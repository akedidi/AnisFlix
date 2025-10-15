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

    if (!url.includes('vidmoly.net') && !url.includes('vidmoly.to')) {
      return res.status(400).json({ error: 'URL VidMoly invalide' });
    }

    console.log(`🚀 Extraction du lien VidMoly pour : ${url}`);

    // Essayer d'abord avec un service de proxy externe
    try {
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
      const proxyResponse = await axios.get(proxyUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        timeout: 30000
      });
      
      const html = proxyResponse.data.contents;
      console.log(`📄 Réponse VidMoly via proxy (${html.length} caractères):`, html.substring(0, 500) + '...');
      
      if (html.includes('Disable ADBlock') || html.includes('AdBlock')) {
        console.log('❌ VidMoly détecte AdBlock même via proxy externe.');
        throw new Error('VidMoly détecte un bloqueur de publicités via proxy externe');
      }
      
      // Essayer plusieurs patterns pour trouver le lien m3u8
      let playerSetupMatch = html.match(/player\.setup\s*\(\s*\{[^}]*sources:\s*\[\s*\{\s*file:\s*["']([^"']+)["']/);
      
      if (!playerSetupMatch) {
        // Essayer un pattern plus large
        playerSetupMatch = html.match(/sources:\s*\[\s*\{\s*file:\s*["']([^"']+)["']/);
      }
      
      if (!playerSetupMatch) {
        // Essayer de chercher directement les URLs m3u8
        playerSetupMatch = html.match(/https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/);
        if (playerSetupMatch) {
          playerSetupMatch[1] = playerSetupMatch[0];
        }
      }
      
      if (!playerSetupMatch) {
        console.log('❌ Aucun lien m3u8 trouvé dans le HTML:', html.substring(0, 1000));
        throw new Error('Impossible de trouver le lien m3u8 via proxy externe');
      }
      
      const brokenUrl = playerSetupMatch[1];
      const masterM3u8Url = brokenUrl.replace(/,/g, '');
      
      console.log(`✅ Lien master.m3u8 trouvé via proxy externe : ${masterM3u8Url}`);
      
      return res.status(200).json({ 
        success: true,
        m3u8Url: masterM3u8Url,
        source: 'vidmoly',
        originalUrl: url,
        method: 'proxy'
      });
      
    } catch (proxyError) {
      console.log('❌ Proxy externe échoué, tentative directe...');
    }

    // Fallback: Utiliser axios avec headers ultra-avancés pour contourner la détection VidMoly
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0',
        'Pragma': 'no-cache',
        'Referer': 'https://vidmoly.net/',
        'Origin': 'https://vidmoly.net',
        'X-Forwarded-For': '127.0.0.1',
        'X-Real-IP': '127.0.0.1',
        'X-Forwarded-Proto': 'https',
        'X-Forwarded-Host': 'vidmoly.net',
        'X-Forwarded-Port': '443',
        'CF-Connecting-IP': '127.0.0.1',
        'CF-Ray': '1234567890abcdef',
        'CF-Visitor': '{"scheme":"https"}',
        'CF-Country': 'FR',
        'CF-IPCountry': 'FR',
        'True-Client-IP': '127.0.0.1',
        'X-Cluster-Client-IP': '127.0.0.1',
        'X-Client-IP': '127.0.0.1',
        'X-Remote-IP': '127.0.0.1',
        'X-Remote-Addr': '127.0.0.1',
        'X-Originating-IP': '127.0.0.1',
        'X-Host': 'vidmoly.net',
        'X-Forwarded-Server': 'vidmoly.net',
        'X-HTTP-Host-Override': 'vidmoly.net',
        'Forwarded': 'for=127.0.0.1;proto=https;host=vidmoly.net',
        'Via': '1.1 vidmoly.net',
        'X-Request-ID': '12345678-1234-1234-1234-123456789012',
        'X-Correlation-ID': '12345678-1234-1234-1234-123456789012',
        'X-Trace-ID': '12345678-1234-1234-1234-123456789012',
        'X-Session-ID': '12345678-1234-1234-1234-123456789012',
        'X-Device-ID': '12345678-1234-1234-1234-123456789012',
        'X-User-ID': '12345678-1234-1234-1234-123456789012',
        'X-API-Key': 'none',
        'X-Auth-Token': 'none',
        'Authorization': 'Bearer none',
        'Cookie': 'session=12345678-1234-1234-1234-123456789012; _ga=GA1.1.123456789.1234567890; _gid=GA1.1.123456789.1234567890; _fbp=fb.1.1234567890123.1234567890123',
        'DNT': '0',
        'Sec-GPC': '0',
        'Viewport-Width': '1920',
        'Device-Memory': '8',
        'RTT': '50',
        'Downlink': '10',
        'ECT': '4g',
        'Save-Data': 'off',
        'Sec-CH-UA': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'Sec-CH-UA-Mobile': '?0',
        'Sec-CH-UA-Platform': '"Windows"',
        'Sec-CH-UA-Platform-Version': '"15.0.0"',
        'Sec-CH-UA-Arch': '"x86"',
        'Sec-CH-UA-Bitness': '"64"',
        'Sec-CH-UA-Model': '""',
        'Sec-CH-UA-Full-Version': '"120.0.6099.109"',
        'Sec-CH-UA-Full-Version-List': '"Not_A Brand";v="8.0.0.0", "Chromium";v="120.0.6099.109", "Google Chrome";v="120.0.6099.109"',
        'Sec-CH-Prefers-Color-Scheme': 'dark',
        'Sec-CH-Prefers-Reduced-Motion': 'no-preference',
        'Sec-CH-Viewport-Width': '1920',
        'Sec-CH-Viewport-Height': '1080',
        'Sec-CH-DPR': '1',
        'Sec-CH-Width': '1920',
        'Sec-CH-Height': '1080',
      },
      timeout: 30000,
      maxRedirects: 10,
      validateStatus: function (status) {
        return status >= 200 && status < 400;
      }
    });

    const html = response.data;
    
    console.log(`📄 Réponse VidMoly (${html.length} caractères):`, html.substring(0, 500) + '...');

    // Vérifier si on a le message d'erreur AdBlock
    if (html.includes('Disable ADBlock') || html.includes('AdBlock')) {
      console.log('❌ VidMoly détecte AdBlock, tentative de contournement...');
      return res.status(403).json({ 
        error: 'VidMoly détecte un bloqueur de publicités. Impossible d\'extraire le lien.',
        details: 'Le site VidMoly bloque les requêtes automatisées.'
      });
    }

    // Extraire le lien m3u8 avec une regex
    const playerSetupMatch = html.match(/player\.setup\s*\(\s*\{[^}]*sources:\s*\[\s*\{\s*file:\s*["']([^"']+)["']/);
    
    if (!playerSetupMatch) {
      return res.status(404).json({ 
        error: 'Impossible de trouver le lien m3u8 sur la page VidMoly.' 
      });
    }
    
    const brokenUrl = playerSetupMatch[1];
    const masterM3u8Url = brokenUrl.replace(/,/g, '');
    
    console.log(`✅ Lien master.m3u8 trouvé : ${masterM3u8Url}`);

    return res.status(200).json({ 
      success: true,
      m3u8Url: masterM3u8Url,
      source: 'vidmoly',
      originalUrl: url
    });

  } catch (error) {
    console.error(`❌ Erreur lors de l'extraction VidMoly : ${error.message}`);
    return res.status(500).json({ 
      error: 'Erreur serveur lors de l\'extraction VidMoly',
      details: error.message 
    });
  }
}
