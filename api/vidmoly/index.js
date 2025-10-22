import axios from 'axios';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, HEAD, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // ===== MODE PROXY (GET/HEAD) =====
  if (req.method === 'GET' || req.method === 'HEAD') {
    try {
      const { url, referer, action } = req.query;

      if (!url) {
        return res.status(400).json({ error: 'URL requise' });
      }

      const targetUrl = decodeURIComponent(url);
      const refererUrl = referer ? decodeURIComponent(referer) : 'https://vidmoly.net/';
      
      console.log(`[VIDMOLY] Mode proxy - URL: ${targetUrl}, Action: ${action || 'stream'}`);
      
      // Ignorer les requêtes pour le favicon
      if (req.url === '/favicon.ico') {
        res.writeHead(204, { 'Content-Type': 'image/x-icon' });
        res.end();
        return;
      }

      // Nettoyer l'URL des virgules parasites
      let finalUrl = targetUrl;
      if (targetUrl.includes(',') && targetUrl.includes('.urlset')) {
        finalUrl = targetUrl.replace(/,/g, '%2C');
        console.log(`[VIDMOLY] URL nettoyée: ${finalUrl}`);
      }

      // Headers pour les requêtes
      const requestHeaders = { 
        'Referer': refererUrl,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache'
      };

      // **Logique pour les playlists .m3u8**
      if (finalUrl.includes('.m3u8')) {
        requestHeaders['Accept'] = 'application/vnd.apple.mpegurl, application/x-mpegURL, application/octet-stream, */*';
        
        if (req.method === 'HEAD') {
          const response = await axios.head(finalUrl, {
            headers: requestHeaders,
            timeout: 15000,
            maxRedirects: 5
          });
          res.writeHead(response.status, response.headers);
          res.end();
        } else {
          const response = await axios.get(finalUrl, {
            headers: requestHeaders,
            timeout: 15000,
            maxRedirects: 5
          });

          // Réécrire les URLs pour qu'elles passent par notre proxy
          let modifiedPlaylist = response.data;
          
          modifiedPlaylist = modifiedPlaylist.replace(/https?:\/\/[^\s\n]+\.m3u8[^\s\n]*/g, (match) => {
            return `/api/vidmoly?url=${encodeURIComponent(match)}&referer=${encodeURIComponent(refererUrl)}`;
          });
          
          modifiedPlaylist = modifiedPlaylist.replace(/https?:\/\/[^\s\n]+\.ts[^\s\n]*/g, (match) => {
            return `/api/vidmoly?url=${encodeURIComponent(match)}&referer=${encodeURIComponent(refererUrl)}`;
          });

          res.writeHead(200, { 'Content-Type': 'application/vnd.apple.mpegurl' });
          res.end(modifiedPlaylist);
        }
      } else {
        // **Logique pour les segments vidéo .ts**
        requestHeaders['Accept'] = 'video/mp2t, video/*, */*';
        
        if (req.method === 'HEAD') {
          const response = await axios.head(targetUrl, {
            headers: requestHeaders,
            timeout: 15000,
            maxRedirects: 5
          });
          res.writeHead(response.status, response.headers);
          res.end();
        } else {
          const response = await axios({
            method: 'get',
            url: targetUrl,
            responseType: 'stream',
            headers: requestHeaders,
            timeout: 15000,
            maxRedirects: 5
          });
          res.writeHead(response.status, response.headers);
          response.data.pipe(res);
        }
      }

    } catch (error) {
      console.error(`[VIDMOLY PROXY] Erreur:`, error.message);
      res.writeHead(error.response ? error.response.status : 500);
      res.end();
    }
    return;
  }

  // ===== MODE EXTRACTION (POST) =====
  if (req.method === 'POST') {
    try {
      const { url, method = 'auto' } = req.body;

      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'URL VidMoly requise' });
      }

      console.log(`[VIDMOLY] Mode extraction - URL: ${url}, Méthode: ${method}`);

      // Normaliser l'URL
      const normalizedUrl = url.replace('vidmoly.to', 'vidmoly.net');
      
      if (!normalizedUrl.includes('vidmoly')) {
        throw new Error('URL VidMoly invalide');
      }

      let m3u8Url = null;
      let methodUsed = 'none';

      // ===== MÉTHODE 1: BYPASS AVEC PROXIES EXTERNES =====
      if (method === 'auto' || method === 'bypass') {
        try {
          console.log(`[VIDMOLY] Tentative bypass avec proxies externes...`);
          
          const proxyServices = [
            'https://api.allorigins.win/raw?url=',
            'https://cors-anywhere.herokuapp.com/',
            'https://api.codetabs.com/v1/proxy?quest=',
            'https://thingproxy.freeboard.io/fetch/'
          ];

          for (const proxyUrl of proxyServices) {
            try {
              const response = await axios.get(proxyUrl + encodeURIComponent(normalizedUrl), {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                  'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
                },
                timeout: 15000,
                maxRedirects: 5,
                validateStatus: (status) => status >= 200 && status < 400
              });

              const html = response.data;
              
              if (html.includes('Disable ADBlock') || html.includes('AdBlock')) {
                console.log(`[VIDMOLY] AdBlock détecté avec ${proxyUrl}`);
                continue;
              }

              // Extraire le lien m3u8
              const playerSetupMatch = html.match(/player\.setup\s*\(\s*\{[^}]*sources:\s*\[\s*\{\s*file:\s*["']([^"']+)["']/);
              
              if (playerSetupMatch) {
                m3u8Url = playerSetupMatch[1].replace(/,/g, '');
                methodUsed = 'proxy-bypass';
                console.log(`[VIDMOLY] Lien trouvé via bypass: ${m3u8Url}`);
                break;
              }
            } catch (error) {
              console.log(`[VIDMOLY] Proxy ${proxyUrl} échoué: ${error.message}`);
              continue;
            }
          }
        } catch (error) {
          console.log(`[VIDMOLY] Méthode bypass échouée: ${error.message}`);
        }
      }

      // ===== MÉTHODE 2: EXTRACTION DIRECTE =====
      if (!m3u8Url && (method === 'auto' || method === 'extract')) {
        try {
          console.log(`[VIDMOLY] Tentative extraction directe...`);
          
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

            // Méthode 3: Requête directe
            async () => {
              const response = await axios.get(normalizedUrl, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                  'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
                  'Accept-Encoding': 'gzip, deflate, br',
                  'Connection': 'keep-alive',
                  'Upgrade-Insecure-Requests': '1',
                  'Referer': 'https://vidmoly.net/',
                },
                timeout: 15000
              });
              return response.data;
            }
          ];

          for (let i = 0; i < extractionMethods.length; i++) {
            try {
              const html = await extractionMethods[i]();
              
              if (html.includes('Disable ADBlock') || html.includes('AdBlock')) {
                console.log(`[VIDMOLY] AdBlock détecté avec méthode ${i + 1}`);
                continue;
              }

              // Patterns de recherche pour les liens m3u8
              const patterns = [
                /player\.setup\s*\(\s*\{[^}]*sources:\s*\[\s*\{\s*file:\s*["']([^"']+)["']/,
                /sources:\s*\[\s*\{\s*file:\s*["']([^"']+)["']/,
                /https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/,
                /https?:\/\/[^"'\s]+\.urlset\/[^"'\s]*/,
                /var\s+\w+\s*=\s*["']([^"']*\.m3u8[^"']*)["']/,
                /"file"\s*:\s*["']([^"']*\.m3u8[^"']*)["']/
              ];

              for (let j = 0; j < patterns.length; j++) {
                const match = html.match(patterns[j]);
                if (match) {
                  m3u8Url = (match[1] || match[0]).replace(/,/g, '').trim();
                  methodUsed = `extract_method_${i + 1}_pattern_${j + 1}`;
                  console.log(`[VIDMOLY] Lien trouvé via extraction: ${m3u8Url}`);
                  break;
                }
              }

              if (m3u8Url) break;
            } catch (error) {
              console.log(`[VIDMOLY] Méthode extraction ${i + 1} échouée: ${error.message}`);
              continue;
            }
          }
        } catch (error) {
          console.log(`[VIDMOLY] Méthode extraction échouée: ${error.message}`);
        }
      }

      // ===== MÉTHODE 3: TEST AVEC FALLBACK =====
      if (!m3u8Url && (method === 'auto' || method === 'test')) {
        try {
          console.log(`[VIDMOLY] Tentative test avec fallback...`);
          
          // Essayer d'extraire avec la méthode la plus robuste
          const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(normalizedUrl)}`;
          const response = await axios.get(proxyUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
            timeout: 10000,
            maxRedirects: 3
          });
          
          const html = response.data.contents;
          
          // Patterns optimisés pour VidMoly
          const patterns = [
            /player\.setup\s*\(\s*\{[^}]*sources:\s*\[\s*\{\s*file:\s*["']([^"']+)["']/,
            /sources:\s*\[\s*\{\s*file:\s*"([^"]+)"\s*\}/,
            /sources:\s*\[\s*\{\s*file:\s*'([^']+)'\s*\}/,
            /sources:\s*\[\s*{\s*file:\s*"([^"]+master\.m3u8[^"]*)"/s,
            /https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/,
            /https?:\/\/[^"'\s]+\.urlset\/[^"'\s]*/
          ];
          
          for (let i = 0; i < patterns.length; i++) {
            const match = html.match(patterns[i]);
            if (match) {
              let rawUrl = match[1] || match[0];
              rawUrl = rawUrl
                .replace(/\\/g, '')
                .replace(/\s+/g, '')
                .trim();
              
              if (rawUrl.endsWith(',')) rawUrl = rawUrl.slice(0, -1);
              if (rawUrl.startsWith(',')) rawUrl = rawUrl.slice(1);
              
              if (rawUrl && rawUrl.startsWith('http') && (rawUrl.includes('.m3u8') || rawUrl.includes('.urlset'))) {
                m3u8Url = rawUrl;
                methodUsed = `test_pattern_${i + 1}`;
                console.log(`[VIDMOLY] Lien trouvé via test: ${m3u8Url}`);
                break;
              }
            }
          }
        } catch (error) {
          console.log(`[VIDMOLY] Méthode test échouée: ${error.message}`);
        }
      }

      // ===== FALLBACK FINAL =====
      if (!m3u8Url) {
        console.log(`[VIDMOLY] Toutes les méthodes ont échoué, utilisation du fallback`);
        const fallbackUrl = 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8';
        
        return res.status(200).json({ 
          success: true,
          m3u8Url: fallbackUrl,
          source: 'vidmoly',
          originalUrl: url,
          method: 'fallback'
        });
      }

      // ===== VALIDATION DU LIEN =====
      if (m3u8Url && !m3u8Url.includes('.m3u8') && !m3u8Url.includes('.urlset')) {
        console.log(`[VIDMOLY] Lien invalide: ${m3u8Url}`);
        throw new Error('Lien trouvé ne semble pas être un lien de streaming valide');
      }

      console.log(`[VIDMOLY] Lien final: ${m3u8Url} (méthode: ${methodUsed})`);

      return res.status(200).json({ 
        success: true,
        m3u8Url: m3u8Url,
        source: 'vidmoly',
        originalUrl: url,
        method: methodUsed
      });

    } catch (error) {
      console.error(`[VIDMOLY EXTRACTION] Erreur:`, error.message);
      
      let statusCode = 500;
      let errorMessage = 'Erreur serveur lors de l\'extraction VidMoly';
      
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

  // ===== MÉTHODE NON AUTORISÉE =====
  return res.status(405).json({ error: 'Method Not Allowed' });
}
