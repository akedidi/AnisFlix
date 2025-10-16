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

    console.log(`🚀 Extraction VidMoly pour : ${url}`);

    // Normaliser l'URL
    const normalizedUrl = url.replace('vidmoly.to', 'vidmoly.net');
    console.log(`🔄 URL normalisée : ${normalizedUrl}`);

    // Vérifier si l'URL VidMoly est valide
    if (!normalizedUrl.includes('vidmoly')) {
      throw new Error('URL VidMoly invalide');
    }

    // Essayer plusieurs méthodes d'extraction
    const extractionMethods = [
      // Méthode 1: Proxy CORS
      async () => {
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(normalizedUrl)}`;
        const response = await axios.get(proxyUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
          timeout: 15000
        });
        return response.data.contents;
      },
      
      // Méthode 2: Proxy alternatif
      async () => {
        const proxyUrl = `https://cors-anywhere.herokuapp.com/${normalizedUrl}`;
        const response = await axios.get(proxyUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'X-Requested-With': 'XMLHttpRequest',
          },
          timeout: 15000
        });
        return response.data;
      },

      // Méthode 3: Requête directe avec headers avancés
      async () => {
        const response = await axios.get(normalizedUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Cache-Control': 'max-age=0',
            'Referer': 'https://vidmoly.net/',
          },
          timeout: 15000
        });
        return response.data;
      }
    ];

    let html = null;
    let methodUsed = 'none';

    // Essayer chaque méthode jusqu'à ce qu'une fonctionne
    for (let i = 0; i < extractionMethods.length; i++) {
      try {
        console.log(`🔄 Tentative méthode ${i + 1}...`);
        html = await extractionMethods[i]();
        methodUsed = `method_${i + 1}`;
        console.log(`✅ Méthode ${i + 1} réussie`);
        break;
      } catch (error) {
        console.log(`❌ Méthode ${i + 1} échouée:`, error.message);
        if (i === extractionMethods.length - 1) {
          throw new Error(`Toutes les méthodes d'extraction ont échoué. Dernière erreur: ${error.message}`);
        }
      }
    }

    if (!html) {
      throw new Error('Aucun HTML récupéré');
    }

    console.log(`📄 HTML récupéré (${html.length} caractères) via ${methodUsed}`);

    // Vérifier si AdBlock est détecté
    if (html.includes('Disable ADBlock') || html.includes('AdBlock') || html.includes('disable adblock')) {
      console.log('❌ VidMoly détecte AdBlock');
      throw new Error('VidMoly détecte un bloqueur de publicités');
    }

    // Patterns de recherche pour les liens m3u8
    const patterns = [
      // Pattern 1: player.setup avec sources
      /player\.setup\s*\(\s*\{[^}]*sources:\s*\[\s*\{\s*file:\s*["']([^"']+)["']/,
      // Pattern 2: sources simple
      /sources:\s*\[\s*\{\s*file:\s*["']([^"']+)["']/,
      // Pattern 3: URLs m3u8 directes
      /https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/,
      // Pattern 4: URLs avec .urlset
      /https?:\/\/[^"'\s]+\.urlset\/[^"'\s]*/,
      // Pattern 5: URLs dans des variables JavaScript
      /var\s+\w+\s*=\s*["']([^"']*\.m3u8[^"']*)["']/,
      // Pattern 6: URLs dans des objets JSON
      /"file"\s*:\s*["']([^"']*\.m3u8[^"']*)["']/
    ];

    let m3u8Url = null;
    let patternUsed = 'none';

    // Essayer chaque pattern
    for (let i = 0; i < patterns.length; i++) {
      const match = html.match(patterns[i]);
      if (match) {
        m3u8Url = match[1] || match[0];
        patternUsed = `pattern_${i + 1}`;
        console.log(`✅ Lien trouvé avec pattern ${i + 1}:`, m3u8Url);
        break;
      }
    }

    if (!m3u8Url) {
      console.log('❌ Aucun lien m3u8 trouvé. HTML sample:', html.substring(0, 1000));
      throw new Error('Aucun lien de streaming trouvé sur la page VidMoly');
    }

    // Nettoyer l'URL
    m3u8Url = m3u8Url.replace(/,/g, '').trim();
    
    // Vérifier que c'est bien une URL m3u8
    if (!m3u8Url.includes('.m3u8') && !m3u8Url.includes('.urlset')) {
      throw new Error('Lien trouvé ne semble pas être un lien de streaming valide');
    }

    console.log(`🎬 Lien m3u8 final: ${m3u8Url}`);

    return res.status(200).json({ 
      success: true,
      m3u8Url: m3u8Url,
      source: 'vidmoly',
      originalUrl: url,
      method: methodUsed,
      pattern: patternUsed
    });

  } catch (error) {
    console.error(`❌ Erreur lors de l'extraction VidMoly : ${error.message}`);
    return res.status(500).json({ 
      success: false,
      error: 'Erreur lors de l\'extraction VidMoly',
      details: error.message,
      originalUrl: req.body.url
    });
  }
}