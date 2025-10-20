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
        timeout: 10000,
        maxRedirects: 3
      });
      
      const html = proxyResponse.data.contents;
      console.log(`📄 HTML récupéré (${html.length} caractères)`);
      
      // Chercher les patterns de liens m3u8 - patterns simplifiés et fonctionnels
      const patterns = [
        // Pattern exact pour player.setup avec sources (le plus important)
        /player\.setup\s*\(\s*\{[^}]*sources:\s*\[\s*\{\s*file:\s*["']([^"']+)["']/,
        // Pattern pour sources: [{file:"url"}] (guillemets doubles)
        /sources:\s*\[\s*\{\s*file:\s*"([^"]+)"\s*\}/,
        // Pattern pour sources: [{file: 'url'}] (guillemets simples)
        /sources:\s*\[\s*\{\s*file:\s*'([^']+)'\s*\}/,
        // Nouvelle regex spécifique pour master.m3u8 (méthode améliorée)
        /sources:\s*\[\s*{\s*file:\s*"([^"]+master\.m3u8[^"]*)"/s,
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
          const rawUrl = match[1] || match[0];
          usedPattern = `Pattern ${i + 1}`;
          console.log(`🔍 Pattern ${i + 1} trouvé - URL brute: "${rawUrl}"`);
          
          m3u8Url = rawUrl;
          
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
          
          // Nettoyer les virgules parasites à la fin après les paramètres de requête
          if (m3u8Url.includes('?') && m3u8Url.endsWith(',')) {
            m3u8Url = m3u8Url.slice(0, -1);
          }
          
          console.log(`🔧 URL finale après nettoyage: "${m3u8Url}"`);
          
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
        console.log(`🔍 Extrait HTML (premiers 2000 caractères):`, html.substring(0, 2000));
        
        // Chercher spécifiquement les occurrences de "player.setup" et "sources"
        const playerSetupIndex = html.indexOf('player.setup');
        if (playerSetupIndex !== -1) {
          const contextStart = Math.max(0, playerSetupIndex - 200);
          const contextEnd = Math.min(html.length, playerSetupIndex + 1000);
          console.log(`🔍 Contexte autour de 'player.setup':`, html.substring(contextStart, contextEnd));
        }
        
        const sourcesIndex = html.indexOf('sources:');
        if (sourcesIndex !== -1) {
          const contextStart = Math.max(0, sourcesIndex - 100);
          const contextEnd = Math.min(html.length, sourcesIndex + 500);
          console.log(`🔍 Contexte autour de 'sources:':`, html.substring(contextStart, contextEnd));
        }
      }
      
      if (m3u8Url && m3u8Url.startsWith('http') && (m3u8Url.includes('.m3u8') || m3u8Url.includes('.urlset'))) {
        console.log(`✅ Lien m3u8 valide trouvé avec ${usedPattern}: ${m3u8Url}`);
        
        // Tester si le lien extrait fonctionne réellement
        console.log(`🧪 Test de la validité du lien extrait...`);
        try {
          const testResponse = await axios.head(m3u8Url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Referer': normalizedUrl
            },
            timeout: 10000,
            maxRedirects: 3
          });
          
          if (testResponse.status === 200) {
            console.log(`✅ Lien testé avec succès (status: ${testResponse.status})`);
            return res.status(200).json({ 
              success: true,
              m3u8Url: m3u8Url,
              source: 'vidmoly',
              originalUrl: url,
              method: 'extracted_real'
            });
          } else {
            console.log(`⚠️ Lien extrait retourne un status ${testResponse.status}, passage au fallback`);
          }
        } catch (testError) {
          console.log(`❌ Lien extrait ne fonctionne pas: ${testError.message}`);
          console.log(`🔄 Passage à la méthode de fallback directe...`);
        }
      }
      
    } catch (extractionError) {
      console.log(`❌ Extraction via proxy CORS échouée: ${extractionError.message}`);
      console.log(`❌ Détails de l'erreur:`, extractionError);
    }
    
    // Méthode de fallback : essayer directement sans proxy CORS
    // (appelée si l'extraction échoue OU si le lien extrait ne fonctionne pas)
    console.log(`🔄 Tentative de méthode de fallback directe...`);
    try {
        const directResponse = await axios.get(normalizedUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
          },
          timeout: 15000,
          maxRedirects: 5
        });
        
        const directHtml = directResponse.data;
        console.log(`📄 HTML direct récupéré (${directHtml.length} caractères)`);
        
        // Utiliser la nouvelle regex spécifique pour master.m3u8
        const masterM3u8Regex = /sources:\s*\[\s*{\s*file:\s*"([^"]+master\.m3u8[^"]*)"/s;
        const masterMatch = directHtml.match(masterM3u8Regex);
        
        if (masterMatch && masterMatch[1]) {
          let m3u8Url = masterMatch[1];
          console.log(`🎯 Lien master.m3u8 trouvé avec méthode directe: "${m3u8Url}"`);
          
          // Nettoyer l'URL
          m3u8Url = m3u8Url
            .replace(/\\/g, '')
            .replace(/\s+/g, '')
            .trim();
          
          if (m3u8Url && m3u8Url.startsWith('http') && m3u8Url.includes('master.m3u8')) {
            console.log(`✅ Lien master.m3u8 valide trouvé avec méthode directe: ${m3u8Url}`);
            
            // Tester si le lien extrait par la méthode directe fonctionne
            console.log(`🧪 Test de la validité du lien direct...`);
            try {
              const testResponse = await axios.head(m3u8Url, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                  'Referer': normalizedUrl
                },
                timeout: 10000,
                maxRedirects: 3
              });
              
              if (testResponse.status === 200) {
                console.log(`✅ Lien direct testé avec succès (status: ${testResponse.status})`);
                return res.status(200).json({ 
                  success: true,
                  m3u8Url: m3u8Url,
                  source: 'vidmoly',
                  originalUrl: url,
                  method: 'direct_master_m3u8'
                });
              } else {
                console.log(`⚠️ Lien direct retourne un status ${testResponse.status}`);
              }
            } catch (testError) {
              console.log(`❌ Lien direct ne fonctionne pas: ${testError.message}`);
            }
          }
        }
        
        // Si la regex spécifique ne fonctionne pas, essayer les patterns généraux
        const fallbackPatterns = [
          /sources:\s*\[\s*\{\s*file:\s*"([^"]+)"\s*\}/,
          /sources:\s*\[\s*\{\s*file:\s*'([^']+)'\s*\}/,
          /https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/
        ];
        
        for (let i = 0; i < fallbackPatterns.length; i++) {
          const pattern = fallbackPatterns[i];
          const match = directHtml.match(pattern);
          if (match) {
            const rawUrl = match[1] || match[0];
            let m3u8Url = rawUrl
              .replace(/\\/g, '')
              .replace(/\s+/g, '')
              .trim();
            
            if (m3u8Url && m3u8Url.startsWith('http') && (m3u8Url.includes('.m3u8') || m3u8Url.includes('.urlset'))) {
              console.log(`✅ Lien m3u8 trouvé avec méthode directe (pattern ${i + 1}): ${m3u8Url}`);
              
              // Tester si le lien extrait par la méthode directe fonctionne
              console.log(`🧪 Test de la validité du lien direct (pattern ${i + 1})...`);
              try {
                const testResponse = await axios.head(m3u8Url, {
                  headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': normalizedUrl
                  },
                  timeout: 10000,
                  maxRedirects: 3
                });
                
                if (testResponse.status === 200) {
                  console.log(`✅ Lien direct testé avec succès (status: ${testResponse.status})`);
                  return res.status(200).json({ 
                    success: true,
                    m3u8Url: m3u8Url,
                    source: 'vidmoly',
                    originalUrl: url,
                    method: `direct_pattern_${i + 1}`
                  });
                } else {
                  console.log(`⚠️ Lien direct retourne un status ${testResponse.status}`);
                }
              } catch (testError) {
                console.log(`❌ Lien direct ne fonctionne pas: ${testError.message}`);
              }
            }
          }
        }
        
        console.log(`❌ Aucun lien m3u8 trouvé avec la méthode directe`);
        
      } catch (directError) {
        console.log(`❌ Méthode directe échouée: ${directError.message}`);
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
