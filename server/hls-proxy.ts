import type { Express, Request, Response } from "express";
import axios from "axios";
import { CookieJar } from "tough-cookie";
import { wrapper } from "axios-cookiejar-support";

const ORIGIN_HOST = 'https://fremtv.lol';
const EMBED_HOST = 'https://directfr.lat';

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
const ALLOWED_HOSTS = ['fremtv.lol', 'directfr.lat'];

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
      if (!t || t.startsWith('#')) return line;
      const abs = toAbsolute(baseUrl, t);
      if (/\.m3u8(\?|$)/i.test(abs)) {
        return `/proxy/m3u8?url=${encodeURIComponent(abs)}`;
      }
      return `/proxy/segment?url=${encodeURIComponent(abs)}`;
    })
    .join('\n');
}

// État en mémoire par chaîne pour les tokens et playlists
const channelStates = new Map(); // channelId -> { token, lastFetch, playlist }

export function registerHLSProxyRoutes(app: Express) {
  // Route compatible avec votre code fonctionnel (pour test)
  app.get('/stream/playlist.m3u8', async (req: Request, res: Response) => {
    try {
      // Utiliser l'ID 102 par défaut comme dans votre code
      const channelId = '102';
      const initialUrl = `${ORIGIN_HOST}/live/5A24C0D16059EDCC6A20E0CE234C7A25/${channelId}.m3u8`;

      // Amorcer la session/cookies
      try { 
        await http.get(ORIGIN_HOST + '/', { headers: browserHeaders }); 
      } catch {}

      // Récupérer l'état de la chaîne
      const channelState = channelStates.get(channelId);
      const now = Date.now();
      
      // Si pas de token ou token expiré (>30s), récupérer un nouveau token
      if (!channelState?.token || (now - channelState.lastTokenFetch) > 30000) {
        console.log(`[ENTRY] Récupération nouveau token pour chaîne ${channelId}`);
        
        // Première requête pour récupérer l'en-tête Location avec le token
        const initialResponse = await http.get(initialUrl, { 
          headers: browserHeaders, 
          responseType: 'text',
          maxRedirects: 0, // Ne pas suivre automatiquement les redirections
          validateStatus: (status) => status < 400 // Accepter les 3xx
        });

        console.log(`[ENTRY] ${initialResponse.status} ← ${initialUrl}`);
        console.log(`[ENTRY] Location header:`, initialResponse.headers.location);

        // Récupérer le token depuis l'en-tête Location
        const locationHeader = initialResponse.headers.location;
        if (!locationHeader) {
          return res.status(502).send('Pas d\'en-tête Location trouvé.');
        }

        // Sauvegarder le token
        channelStates.set(channelId, {
          token: locationHeader,
          lastTokenFetch: now,
          lastPlaylistFetch: 0,
          playlist: null
        });
      }

      // Récupérer le token depuis l'état
      const currentState = channelStates.get(channelId);
      const tokenUrl = currentState.token;

      // Si playlist trop vieille (>8s), refetch pour avoir les nouveaux segments
      if (!currentState.playlist || (now - currentState.lastPlaylistFetch) > 8000) {
        console.log(`[ENTRY] Récupération nouvelle playlist pour chaîne ${channelId}`);
        
        // Faire la requête avec le token pour récupérer les nouveaux segments
        const r = await http.get(tokenUrl, { 
          headers: browserHeaders, 
          responseType: 'text' 
        });

        const ctype = (r.headers['content-type'] || '').toLowerCase();
        console.log(`[ENTRY] ${r.status} ${ctype} ← ${tokenUrl}`);

        if (typeof r.data !== 'string') {
          return res.status(502).send('Pas une playlist M3U8.');
        }

        // Mettre à jour l'état avec la nouvelle playlist
        currentState.playlist = r.data;
        currentState.lastPlaylistFetch = now;
        channelStates.set(channelId, currentState);
      }

      // Utiliser la playlist mise à jour
      const playlist = currentState.playlist;
      const baseUrl = tokenUrl;
      const rewritten = rewritePlaylistUrls(playlist, baseUrl);

      res.set('Content-Type', 'application/vnd.apple.mpegurl');
      res.send(rewritten);
    } catch (e: any) {
      console.error('[ENTRY ERROR]', e.message);
      res.status(500).send('Erreur lors de la récupération de la playlist.');
    }
  });

  // Entrée: fournit une playlist m3u8 (réécrite) au player
  app.get('/api/tv/stream/:channelId', async (req: Request, res: Response) => {
    try {
      const { channelId } = req.params;
      
      // URL initiale avec l'ID de chaîne (ex: 78.m3u8)
      const initialUrl = `${ORIGIN_HOST}/live/5A24C0D16059EDCC6A20E0CE234C7A25/${channelId}.m3u8`;

      // Amorcer la session/cookies
      try { 
        await http.get(ORIGIN_HOST + '/', { headers: browserHeaders }); 
      } catch {}

      // Récupérer l'état de la chaîne
      const channelState = channelStates.get(channelId);
      const now = Date.now();
      
      // Si pas de token ou token expiré (>30s), récupérer un nouveau token
      if (!channelState?.token || (now - channelState.lastTokenFetch) > 30000) {
        console.log(`[TV ENTRY] Récupération nouveau token pour chaîne ${channelId}`);
        
        // Première requête pour récupérer l'en-tête Location avec le token
        const initialResponse = await http.get(initialUrl, { 
          headers: browserHeaders, 
          responseType: 'text',
          maxRedirects: 0, // Ne pas suivre automatiquement les redirections
          validateStatus: (status) => status < 400 // Accepter les 3xx
        });

        console.log(`[TV ENTRY] ${initialResponse.status} ← ${initialUrl}`);
        console.log(`[TV ENTRY] Location header:`, initialResponse.headers.location);

        // Récupérer le token depuis l'en-tête Location
        const locationHeader = initialResponse.headers.location;
        if (!locationHeader) {
          return res.status(502).send('Pas d\'en-tête Location trouvé.');
        }

        // Sauvegarder le token
        channelStates.set(channelId, {
          token: locationHeader,
          lastTokenFetch: now,
          lastPlaylistFetch: 0,
          playlist: null
        });
      }

      // Récupérer le token depuis l'état
      const currentState = channelStates.get(channelId);
      const tokenUrl = currentState.token;

      // Si playlist trop vieille (>8s), refetch pour avoir les nouveaux segments
      if (!currentState.playlist || (now - currentState.lastPlaylistFetch) > 8000) {
        console.log(`[TV ENTRY] Récupération nouvelle playlist pour chaîne ${channelId}`);
        
        // Faire la requête avec le token pour récupérer les nouveaux segments
        const r = await http.get(tokenUrl, { 
          headers: browserHeaders, 
          responseType: 'text' 
        });

        const ctype = (r.headers['content-type'] || '').toLowerCase();
        console.log(`[TV ENTRY] ${r.status} ${ctype} ← ${tokenUrl}`);

        if (typeof r.data !== 'string') {
          return res.status(502).send('Pas une playlist M3U8.');
        }

        // Mettre à jour l'état avec la nouvelle playlist
        currentState.playlist = r.data;
        currentState.lastPlaylistFetch = now;
        channelStates.set(channelId, currentState);
      }

      // Utiliser la playlist mise à jour
      const playlist = currentState.playlist;
      const baseUrl = tokenUrl;
      const rewritten = rewritePlaylistUrls(playlist, baseUrl);

      res.set('Content-Type', 'application/vnd.apple.mpegurl');
      res.send(rewritten);
    } catch (e: any) {
      console.error('[TV ENTRY ERROR]', e.message);
      res.status(500).send('Erreur lors de la récupération de la playlist.');
    }
  });

  // Proxy générique pour toute playlist (master/media)
  app.get('/proxy/m3u8', async (req: Request, res: Response) => {
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
  app.get('/proxy/segment', async (req: Request, res: Response) => {
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
}
