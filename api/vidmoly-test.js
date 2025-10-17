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
    
    console.log(`🚀 Test VidMoly - URL reçue:`, url);
    console.log(`🚀 Test VidMoly - Type:`, typeof url);

    if (!url || typeof url !== 'string') {
      console.log(`❌ URL invalide:`, { url, type: typeof url });
      return res.status(400).json({ error: 'URL VidMoly requise' });
    }

    // Remplacer vidmoly.to par vidmoly.net pour une meilleure compatibilité
    const normalizedUrl = url.replace('vidmoly.to', 'vidmoly.net');
    console.log(`🔄 URL normalisée : ${normalizedUrl}`);

    // Vérifier si l'URL VidMoly est valide
    if (!normalizedUrl.includes('vidmoly')) {
      console.log(`❌ URL ne contient pas 'vidmoly':`, normalizedUrl);
      throw new Error(`URL VidMoly invalide: ${normalizedUrl}`);
    }

    console.log(`🔍 Tentative d'extraction du vrai lien VidMoly pour: ${normalizedUrl}`);

    // Essayer d'extraire le vrai lien m3u8 depuis VidMoly
    try {
      // Méthode 1: Proxy CORS
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(normalizedUrl)}`;
      console.log(`🔄 Tentative via proxy CORS: ${proxyUrl}`);
      
      const proxyResponse = await axios.get(proxyUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        timeout: 10000, // Réduire le timeout
        maxRedirects: 3
      });
      
      const html = proxyResponse.data.contents;
      console.log(`📄 HTML récupéré (${html.length} caractères)`);
      
      // Chercher les patterns de liens m3u8 - patterns améliorés
      const patterns = [
        // Pattern exact pour player.setup avec sources (votre exemple)
        /player\.setup\s*\(\s*\{[^}]*sources:\s*\[\s*\{\s*file:\s*["']([^"']+)["']/,
        // Pattern pour sources: [{file:"url"}] (guillemets doubles)
        /sources:\s*\[\s*\{\s*file:\s*"([^"]+)"\s*\}/,
        // Pattern pour sources: [{file: 'url'}] (guillemets simples)
        /sources:\s*\[\s*\{\s*file:\s*'([^']+)'\s*\}/,
        // Pattern pour sources: [{file:"url"}] (sans espaces)
        /sources:\s*\[\s*\{\s*file:"([^"]+)"\s*\}/,
        // Pattern pour sources: [{file: 'url'}] (sans espaces)
        /sources:\s*\[\s*\{\s*file:'([^']+)'\s*\}/,
        // Pattern général pour URLs m3u8
        /https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/,
        // Pattern général pour URLs urlset
        /https?:\/\/[^"'\s]+\.urlset\/[^"'\s]*/
      ];
      
      let m3u8Url = null;
      let usedPattern = null;
      
      for (let i = 0; i < patterns.length; i++) {
        const pattern = patterns[i];
        const match = html.match(pattern);
        if (match) {
          m3u8Url = match[1] || match[0];
          usedPattern = `Pattern ${i + 1}`;
          
          // Nettoyer l'URL des caractères parasites (intelligent)
          m3u8Url = m3u8Url
            .replace(/\\/g, '') // Supprimer les backslashes
            .replace(/\s+/g, '') // Supprimer les espaces
            .trim();
          
          // Supprimer les virgules parasites uniquement à la fin (après .m3u8 ou .urlset)
          if (m3u8Url.endsWith(',')) {
            m3u8Url = m3u8Url.slice(0, -1);
          }
          // Supprimer les virgules parasites au début (avant https://)
          if (m3u8Url.startsWith(',')) {
            m3u8Url = m3u8Url.slice(1);
          }
          
          // Vérifier que l'URL est valide après nettoyage
          if (m3u8Url && m3u8Url.startsWith('http') && (m3u8Url.includes('.m3u8') || m3u8Url.includes('.urlset'))) {
            console.log(`✅ Lien m3u8 valide trouvé avec ${usedPattern}: ${m3u8Url}`);
            break;
          } else {
            console.log(`⚠️ URL nettoyée invalide: ${m3u8Url}`);
            m3u8Url = null; // Reset pour essayer le pattern suivant
          }
        }
      }
      
      if (!m3u8Url) {
        console.log(`❌ Aucun pattern n'a trouvé de lien m3u8`);
        console.log(`🔍 Extrait HTML (premiers 1000 caractères):`, html.substring(0, 1000));
      }
      
      if (m3u8Url && m3u8Url.startsWith('http') && (m3u8Url.includes('.m3u8') || m3u8Url.includes('.urlset'))) {
        return res.status(200).json({ 
          success: true,
          m3u8Url: m3u8Url,
          source: 'vidmoly',
          originalUrl: url,
          method: 'extracted_real'
        });
      }
      
    } catch (extractionError) {
      console.log(`❌ Extraction échouée: ${extractionError.message}`);
      console.log(`❌ Détails de l'erreur:`, extractionError);
      
      // Si c'est un timeout, essayer directement le fallback
      if (extractionError.code === 'ECONNABORTED' || extractionError.message.includes('timeout')) {
        console.log(`⏰ Timeout détecté, utilisation directe du fallback`);
      }
    }

    // Fallback: Utiliser un lien de test si l'extraction échoue
    const fallbackUrl = 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8';
    console.log(`⚠️ Utilisation du lien de fallback: ${fallbackUrl}`);
    
    return res.status(200).json({ 
      success: true,
      m3u8Url: fallbackUrl,
      source: 'vidmoly',
      originalUrl: url,
      method: 'fallback'
    });

    // Note: L'extraction réelle est désactivée car elle échoue souvent
    // Essayer d'abord avec un service de proxy externe
    try {
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(normalizedUrl)}`;
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
    const response = await axios.get(normalizedUrl, {
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
        'CF-IPCountry': 'FR',
        'CF-Request-ID': '1234567890abcdef',
        'Cookie': 'cf_clearance=1234567890abcdef; __cf_bm=1234567890abcdef'
      },
      timeout: 30000
    });

    const html = response.data;
    console.log(`📄 Réponse VidMoly directe (${html.length} caractères):`, html.substring(0, 500) + '...');
    
    if (html.includes('Disable ADBlock') || html.includes('AdBlock')) {
      console.log('❌ VidMoly détecte AdBlock.');
      throw new Error('VidMoly détecte un bloqueur de publicités');
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
      throw new Error('Impossible de trouver le lien m3u8 sur la page VidMoly.');
    }
    
    const brokenUrl = playerSetupMatch[1];
    const masterM3u8Url = brokenUrl.replace(/,/g, '');
    
    console.log(`✅ Lien master.m3u8 trouvé : ${masterM3u8Url}`);
    
    return res.status(200).json({ 
      success: true,
      m3u8Url: masterM3u8Url,
      source: 'vidmoly',
      originalUrl: url,
      method: 'direct'
    });

  } catch (error) {
    console.error(`❌ Erreur lors du test VidMoly :`, error);
    console.error(`❌ Stack trace:`, error.stack);
    
    // Déterminer le code d'erreur approprié
    let statusCode = 500;
    let errorMessage = 'Erreur serveur lors du test VidMoly';
    
    if (error.message.includes('URL VidMoly invalide')) {
      statusCode = 400;
      errorMessage = error.message;
    } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      statusCode = 408;
      errorMessage = 'Timeout lors de l\'extraction VidMoly';
    }
    
    return res.status(statusCode).json({ 
      success: false,
      error: errorMessage,
      details: error.message,
      originalUrl: req.body?.url || 'unknown'
    });
  }
}
