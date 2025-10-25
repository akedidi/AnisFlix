import type { Express, Request, Response } from "express";
import axios from "axios";
import { CookieJar } from "tough-cookie";
import { wrapper } from "axios-cookiejar-support";

const ORIGIN_HOST = 'https://fremtv.lol';
const EMBED_HOST = 'https://directfr.lat';

// Sources alternatives qui fonctionnent vraiment
const WORKING_SOURCES = {
  '87': 'https://artesimulcast.akamaized.net/hls/live/2031003/artelive_fr/master_v720.m3u8', // TF1 (utilise Arte temporairement)
  '78': 'https://live2.eu-north-1b.cf.dmcdn.net/sec2(ermuWFoalFOnbKlK1xFl5N6-RFs8TR8ytC0BN_948kQeziLQ1-fkqkfWedz6vwq2pV6cqOmVPXuHrmkEOQaWFwzk0ey6_-rMEdaMlm0fB0xLwngtrfO1pgJlnMjnpi2h)/cloud/3/x2lefik/d/live-720.m3u8', // TMC
  '137': 'https://artesimulcast.akamaized.net/hls/live/2031003/artelive_fr/master_v720.m3u8', // France 2 (utilise Arte temporairement)
  '138': 'https://artesimulcast.akamaized.net/hls/live/2031003/artelive_fr/master_v720.m3u8', // France 3 (utilise Arte temporairement)
  '102': 'https://artesimulcast.akamaized.net/hls/live/2031003/artelive_fr/master_v720.m3u8', // M6 (utilise Arte temporairement)
  '77': 'https://artesimulcast.akamaized.net/hls/live/2031003/artelive_fr/master_v720.m3u8', // TFX (utilise Arte temporairement)
  '106': 'https://artesimulcast.akamaized.net/hls/live/2031003/artelive_fr/master_v720.m3u8', // Canal+ (utilise Arte temporairement)
  '79': 'https://artesimulcast.akamaized.net/hls/live/2031003/artelive_fr/master_v720.m3u8', // W9 (utilise Arte temporairement)
  '90': 'https://artesimulcast.akamaized.net/hls/live/2031003/artelive_fr/master_v720.m3u8', // RMC Découverte (utilise Arte temporairement)
  '44': 'https://artesimulcast.akamaized.net/hls/live/2031003/artelive_fr/master_v720.m3u8', // Bein Sports 1 (utilise Arte temporairement)
  '49': 'https://artesimulcast.akamaized.net/hls/live/2031003/artelive_fr/master_v720.m3u8', // Bein Sports 2 (utilise Arte temporairement)
  '50': 'https://artesimulcast.akamaized.net/hls/live/2031003/artelive_fr/master_v720.m3u8', // Bein Sports 3 (utilise Arte temporairement)
  '88': 'https://artesimulcast.akamaized.net/hls/live/2031003/artelive_fr/master_v720.m3u8', // Canal+ Foot (utilise Arte temporairement)
  '58': 'https://artesimulcast.akamaized.net/hls/live/2031003/artelive_fr/master_v720.m3u8', // Canal+ Sport 360 (utilise Arte temporairement)
  '33': 'https://artesimulcast.akamaized.net/hls/live/2031003/artelive_fr/master_v720.m3u8', // RMC Sport 1 (utilise Arte temporairement)
  '40': 'https://artesimulcast.akamaized.net/hls/live/2031003/artelive_fr/master_v720.m3u8', // RMC Sport 2 (utilise Arte temporairement)
  '42': 'https://artesimulcast.akamaized.net/hls/live/2031003/artelive_fr/master_v720.m3u8', // RMC Sport 3 (utilise Arte temporairement)
  '91': 'https://artesimulcast.akamaized.net/hls/live/2031003/artelive_fr/master_v720.m3u8', // Syfy (utilise Arte temporairement)
  '104': 'https://artesimulcast.akamaized.net/hls/live/2031003/artelive_fr/master_v720.m3u8', // Game One (utilise Arte temporairement)
  '97': 'https://artesimulcast.akamaized.net/hls/live/2031003/artelive_fr/master_v720.m3u8', // Mangas (utilise Arte temporairement)
  '180': 'https://artesimulcast.akamaized.net/hls/live/2031003/artelive_fr/master_v720.m3u8', // Boomerang (utilise Arte temporairement)
  '76': 'https://artesimulcast.akamaized.net/hls/live/2031003/artelive_fr/master_v720.m3u8', // Cartoon Network (utilise Arte temporairement)
  '81': 'https://artesimulcast.akamaized.net/hls/live/2031003/artelive_fr/master_v720.m3u8', // National Geographic (utilise Arte temporairement)
  '82': 'https://artesimulcast.akamaized.net/hls/live/2031003/artelive_fr/master_v720.m3u8', // National Geographic Wild (utilise Arte temporairement)
  '95': 'https://artesimulcast.akamaized.net/hls/live/2031003/artelive_fr/master_v720.m3u8', // TCM Cinema (utilise Arte temporairement)
};

const jar = new CookieJar();
const http = wrapper(axios.create({ 
  jar, 
  withCredentials: true, 
  timeout: 15000 
}));

const browserHeaders = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
  'Origin': EMBED_HOST,
  'Referer': EMBED_HOST + '/',
  'Accept': 'application/vnd.apple.mpegurl, application/x-mpegURL, */*',
  'Accept-Language': 'fr-FR,fr;q=0.7,en;q=0.6',
  'Connection': 'keep-alive'
};

// Whitelist des domaines autorisés pour le proxy
const ALLOWED_HOSTS = [
  'fremtv.lol', 
  'directfr.lat',
  'viamotionhsi.netplus.ch',
  'simulcast-p.ftven.fr',
  'live2.eu-north-1b.cf.dmcdn.net',
  'artesimulcast.akamaized.net',
  'cache1a.netplus.ch',
  'cachehsi1b.netplus.ch',
  'cachehsi1a.netplus.ch',
  'cachehsi1c.netplus.ch',
  'cachehsi1d.netplus.ch',
  'cachehsi1e.netplus.ch',
  'cachehsi1f.netplus.ch',
  'cachehsi1g.netplus.ch',
  'cachehsi1h.netplus.ch',
  'cachehsi1i.netplus.ch',
  'cachehsi1j.netplus.ch'
];

function isAllowedUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return ALLOWED_HOSTS.some(host => url.hostname === host || url.hostname.endsWith('.' + host));
  } catch {
    return false;
  }
}

function toAbsolute(base: string, maybeRelative: string): string {
  try { 
    return new URL(maybeRelative, base).toString(); 
  } catch { 
    return maybeRelative; 
  }
}

function rewritePlaylistUrls(playlistText: string, baseUrl: string): string {
  return playlistText
    .split('\n')
    .map((line) => {
      const t = line.trim();
      if (!t || t.startsWith('#')) {
        // Pour les streams live, s'assurer que les directives live sont préservées
        if (t.startsWith('#EXT-X-VERSION:')) return line;
        if (t.startsWith('#EXT-X-TARGETDURATION:')) return line;
        if (t.startsWith('#EXT-X-MEDIA-SEQUENCE:')) return line;
        if (t.startsWith('#EXT-X-PLAYLIST-TYPE:')) return line;
        if (t.startsWith('#EXT-X-ENDLIST')) return line;
        if (t.startsWith('#EXT-X-PROGRAM-DATE-TIME:')) return line;
        return line;
      }
      
      // Convertir l'URL relative en URL absolue
      let abs: string;
      if (t.startsWith('http')) {
        abs = t;
      } else {
        // Pour les URLs relatives, construire l'URL absolue
        const baseUrlObj = new URL(baseUrl);
        abs = new URL(t, baseUrlObj.origin + baseUrlObj.pathname.replace(/\/[^\/]*$/, '/')).href;
      }
      
      if (/\.m3u8(\?|$)/i.test(abs)) {
        return `/api/tv/proxy/m3u8?url=${encodeURIComponent(abs)}`;
      }
      return `/api/tv/proxy/segment?url=${encodeURIComponent(abs)}`;
    })
    .join('\n');
}

export function registerHLSProxyRoutes(app: Express) {
  // Entrée: fournit une playlist m3u8 (réécrite) au player
  app.get('/api/tv/stream/:channelId', async (req: Request, res: Response) => {
    try {
      const { channelId } = req.params;
      
      // Désactiver temporairement les sources alternatives pour permettre la différenciation des chaînes
      // const workingUrl = WORKING_SOURCES[channelId as keyof typeof WORKING_SOURCES];
      
      // if (workingUrl) {
      //   console.log(`[TV WORKING] Utilisation de la source alternative pour ${channelId}: ${workingUrl}`);
      //   
      //   try {
      //     const r = await http.get(workingUrl, { 
      //       headers: browserHeaders, 
      //       responseType: 'text' 
      //     });

      //     const ctype = (r.headers['content-type'] || '').toLowerCase();
      //     console.log(`[TV WORKING] ${r.status} ${ctype} ← ${workingUrl}`);

      //     if (typeof r.data !== 'string') {
      //       return res.status(502).send('Pas une playlist M3U8.');
      //     }

      //     const baseUrl = (r as any).request?.res?.responseUrl || workingUrl;
      //     const rewritten = rewritePlaylistUrls(r.data, baseUrl);

      //     // Headers spécifiques pour les streams live
      //     res.set('Content-Type', 'application/vnd.apple.mpegurl');
      //     res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      //     res.set('Pragma', 'no-cache');
      //     res.set('Expires', '0');
      //     res.set('Access-Control-Allow-Origin', '*');
      //     res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
      //     res.set('Access-Control-Allow-Headers', 'Range, Content-Type');
      //     res.send(rewritten);
      //     return;
      //   } catch (workingError: any) {
      //     console.error(`[TV WORKING ERROR] Erreur avec la source alternative:`, workingError.message);
      //     // Continuer avec la source principale si l'alternative échoue
      //   }
      // }
      
      // URL initiale avec l'ID de chaîne (ex: 78.m3u8)
      const initialUrl = `${ORIGIN_HOST}/live/5A24C0D16059EDCC6A20E0CE234C7A25/${channelId}.m3u8`;

      // Amorcer la session/cookies
      try { 
        await http.get(ORIGIN_HOST + '/', { headers: browserHeaders }); 
      } catch {}

      // Laisser suivre la 302 vers /auth/...token=...
      const r = await http.get(initialUrl, { 
        headers: browserHeaders, 
        responseType: 'text' 
      });

      const ctype = (r.headers['content-type'] || '').toLowerCase();
      console.log(`[TV ENTRY] ${r.status} ${ctype} ← ${(r as any).request?.res?.responseUrl || initialUrl}`);

      if (typeof r.data !== 'string') {
        return res.status(502).send('Pas une playlist M3U8.');
      }

      const baseUrl = (r as any).request?.res?.responseUrl || initialUrl;
      const rewritten = rewritePlaylistUrls(r.data, baseUrl);

      // Headers spécifiques pour les streams live
      res.set('Content-Type', 'application/vnd.apple.mpegurl');
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Range, Content-Type');
      res.send(rewritten);
    } catch (e: any) {
      console.error('[TV ENTRY ERROR]', e.message);
      
      // En cas d'erreur, essayer la source de fallback
      const { channelId } = req.params;
      const fallbackUrl = FALLBACK_SOURCES[channelId as keyof typeof FALLBACK_SOURCES];
      
      if (fallbackUrl) {
        console.log(`[TV FALLBACK ERROR] Proxification de la source de fallback pour ${channelId}: ${fallbackUrl}`);
        
        try {
          const r = await http.get(fallbackUrl, { 
            headers: browserHeaders, 
            responseType: 'text' 
          });

          const ctype = (r.headers['content-type'] || '').toLowerCase();
          console.log(`[TV FALLBACK ERROR] ${r.status} ${ctype} ← ${fallbackUrl}`);

          if (typeof r.data !== 'string') {
            return res.status(502).send('Pas une playlist M3U8.');
          }

          const baseUrl = (r as any).request?.res?.responseUrl || fallbackUrl;
          const rewritten = rewritePlaylistUrls(r.data, baseUrl);

          // Headers spécifiques pour les streams live
          res.set('Content-Type', 'application/vnd.apple.mpegurl');
          res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.set('Pragma', 'no-cache');
          res.set('Expires', '0');
          res.set('Access-Control-Allow-Origin', '*');
          res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
          res.set('Access-Control-Allow-Headers', 'Range, Content-Type');
          res.send(rewritten);
          return;
        } catch (fallbackError: any) {
          console.error(`[TV FALLBACK ERROR] Erreur avec la source de fallback:`, fallbackError.message);
        }
      }
      
      res.status(500).send('Erreur lors de la récupération de la playlist.');
    }
  });

  // Route générique pour proxifier n'importe quelle URL M3U8
  app.get('/api/tv', async (req: Request, res: Response) => {
    const target = req.query.url as string;
    const channelId = req.query.channelId as string;
    
    if (channelId) {
      // Redirection vers la route spécifique pour les chaînes
      return res.redirect(`/api/tv/stream/${channelId}`);
    }
    
    if (!target) {
      return res.status(400).send('Paramètre "url" ou "channelId" manquant.');
    }
    
    // Validation SSRF: vérifier que l'URL est autorisée
    if (!isAllowedUrl(target)) {
      console.error(`[TV GENERIC] URL non autorisée: ${target}`);
      return res.status(403).send('URL non autorisée.');
    }
    
    try {
      const r = await http.get(target, { 
        headers: browserHeaders, 
        responseType: 'text' 
      });

      const ctype = (r.headers['content-type'] || '').toLowerCase();
      console.log(`[TV GENERIC] ${r.status} ${ctype} ← ${target}`);
      
      if (r.status >= 400) {
        return res.status(r.status).send('Erreur distante playlist.');
      }
      if (typeof r.data !== 'string') {
        return res.status(502).send('Pas une playlist M3U8.');
      }

      const baseUrl = (r as any).request?.res?.responseUrl || target;
      const rewritten = rewritePlaylistUrls(r.data, baseUrl);

      res.set('Content-Type', 'application/vnd.apple.mpegurl');
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Range, Content-Type');
      res.send(rewritten);
    } catch (e: any) {
      console.error('[TV GENERIC ERROR]', e.message);
      res.status(500).send('Erreur proxy playlist.');
    }
  });

  // Proxy générique pour toute playlist (master/media)
  app.get('/api/tv/proxy/m3u8', async (req: Request, res: Response) => {
    const target = req.query.url as string;
    if (!target) {
      return res.status(400).send('Paramètre "url" manquant.');
    }
    
    // Validation SSRF: vérifier que l'URL est autorisée
    if (!isAllowedUrl(target)) {
      console.error(`[TV M3U8] URL non autorisée: ${target}`);
      return res.status(403).send('URL non autorisée.');
    }
    
    try {
      const r = await http.get(target, { 
        headers: browserHeaders, 
        responseType: 'text' 
      });

      const ctype = (r.headers['content-type'] || '').toLowerCase();
      console.log(`[TV M3U8] ${r.status} ${ctype} ← ${target}`);
      
      if (r.status >= 400) {
        return res.status(r.status).send('Erreur distante playlist.');
      }
      if (typeof r.data !== 'string') {
        return res.status(502).send('Pas une playlist M3U8.');
      }

      const baseUrl = (r as any).request?.res?.responseUrl || target;
      const rewritten = rewritePlaylistUrls(r.data, baseUrl);

      res.set('Content-Type', 'application/vnd.apple.mpegurl');
      res.send(rewritten);
    } catch (e: any) {
      console.error('[TV M3U8 ERROR]', e.message);
      res.status(500).send('Erreur proxy playlist.');
    }
  });

  // Proxy segments (gère Range + stream)
  app.get('/api/tv/proxy/segment', async (req: Request, res: Response) => {
    const target = req.query.url as string;
    if (!target) {
      return res.status(400).send('Paramètre "url" manquant.');
    }
    
    // Validation SSRF: vérifier que l'URL est autorisée
    if (!isAllowedUrl(target)) {
      console.error(`[TV SEG] URL non autorisée: ${target}`);
      return res.status(403).send('URL non autorisée.');
    }
    
    try {
      const headers: any = { ...browserHeaders };
      if (req.headers.range) {
        headers.Range = req.headers.range;
      }

      const r = await http.get(target, { 
        headers, 
        responseType: 'stream', 
        validateStatus: () => true 
      });
      
      console.log(`[TV SEG] ${r.status} ← ${target}`);
      
      if (r.status >= 400) {
        return res.status(r.status).send('Erreur distante segment.');
      }

      // Propager quelques headers utiles
      ['content-type','content-length','accept-ranges','content-range','cache-control'].forEach(h => {
        if (r.headers[h]) {
          res.setHeader(h, r.headers[h]);
        }
      });

      res.status(r.status);
      r.data.pipe(res);
    } catch (e: any) {
      console.error('[TV SEG ERROR]', e.message);
      res.status(500).send('Erreur proxy segment.');
    }
  });

  // Route catch-all pour les URLs M3U8 non gérées
  app.get('/api/*.m3u8', async (req: Request, res: Response) => {
    try {
      const originalUrl = req.originalUrl;
      console.log(`[TV CATCH-ALL] URL M3U8 non gérée: ${originalUrl}`);
      
      // Rediriger vers l'API TV générique pour traiter l'URL
      const encodedUrl = encodeURIComponent(originalUrl.replace('/api/', ''));
      const redirectUrl = `/api/tv?url=${encodedUrl}`;
      console.log(`[TV CATCH-ALL] Redirection vers: ${redirectUrl}`);
      
      res.redirect(redirectUrl);
    } catch (e: any) {
      console.error('[TV CATCH-ALL ERROR]', e.message);
      res.status(500).send('Erreur proxy catch-all.');
    }
  });
}
