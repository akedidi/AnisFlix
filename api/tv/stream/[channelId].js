// État en mémoire (simulé avec des variables globales)
let channelStates = {};

// Headers par défaut
const defaultHeaders = {
  "User-Agent": "Mozilla/5.0 (Node HLS Proxy)",
  "Accept": "*/*",
  "Referer": "https://fremtv.lol/"
};

// Résout l'URL d'authentification en suivant les redirections
async function resolveAuthUrl(channelId) {
  const baseRemote = `https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/${channelId}.m3u8`;
  
  console.log(`[TV] Resolving auth URL for channel ${channelId}:`, baseRemote);
  
  try {
    // Ne pas suivre automatiquement les redirections pour pouvoir lire Location
    const res = await fetch(baseRemote, { 
      method: "GET", 
      redirect: "manual", 
      headers: defaultHeaders 
    });
    
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) throw new Error("Redirect without Location header");
      
      // Si relative, résoudre
      const resolved = new URL(loc, baseRemote).toString();
      console.log(`[TV] Resolved auth URL for ${channelId}:`, resolved);
      return resolved;
    }
    
    // Parfois le serveur répond directement avec la playlist
    if (res.ok) {
      const text = await res.text();
      // Si ça ressemble à un M3U8, définir comme playlist
      if (text.includes("#EXTM3U")) {
        console.log(`[TV] Master returned playlist directly for ${channelId}`);
        return { directPlaylist: text, url: baseRemote };
      }
      
      // Si c'est un MP4, créer une playlist simple qui pointe vers notre proxy
      if (res.headers.get('content-type')?.includes('video/mp4')) {
        console.log(`[TV] Master returned MP4 directly for ${channelId}`);
        const playlist = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:10
#EXT-X-MEDIA-SEQUENCE:0
#EXTINF:10.0,
/api/tv-proxy-simple?url=${encodeURIComponent(baseRemote)}
#EXT-X-ENDLIST`;
        return { directPlaylist: playlist, url: baseRemote };
      }
    }
    
    throw new Error("Could not resolve auth URL");
  } catch (error) {
    console.error(`[TV] Error resolving auth URL for ${channelId}:`, error.message);
    throw error;
  }
}

// Récupère le texte de la playlist depuis l'URL d'auth
async function fetchPlaylist(channelId, authUrl) {
  try {
    const res = await fetch(authUrl, { headers: defaultHeaders });
    if (!res.ok) throw new Error(`Failed fetching auth playlist: ${res.status}`);
    
    const text = await res.text();
    console.log(`[TV] Playlist fetched for ${channelId}, length:`, text.length);
    return text;
  } catch (error) {
    console.error(`[TV] Error fetching playlist for ${channelId}:`, error.message);
    throw error;
  }
}

// Parseur simple -> remplace les lignes qui commencent par "/hls/..." par URLs locales
function makeLocalPlaylist(playlistText, channelId) {
  if (!playlistText) return "";
  
  const lines = playlistText.split(/\r?\n/);
  const out = lines.map(line => {
    if (line.startsWith("/hls/") || line.match(/\.ts\?/)) {
      // Extraire le nom de fichier et garder la query si nécessaire
      const u = line.trim();
      // Obtenir le basename (ex: 138_914.ts?token=...)
      const name = u.split("/").pop();
      // Chemin proxy local unifié
      return `/api/tv-proxy?channelId=${channelId}&segment=${encodeURIComponent(name)}`;
    }
    return line;
  });
  return out.join("\n");
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { channelId } = req.query;

    if (!channelId) {
      return res.status(400).json({ error: 'Channel ID required' });
    }

    // Initialiser l'état du canal s'il n'existe pas
    if (!channelStates[channelId]) {
      channelStates[channelId] = {
        authUrl: null,
        playlistText: null,
        lastFetch: 0
      };
    }

    const state = channelStates[channelId];

    // Si playlist trop vieille (>8s), refetch
    if (!state.playlistText || Date.now() - state.lastFetch > 8000) {
      try {
        // Résoudre l'URL d'auth si nécessaire
        if (!state.authUrl) {
          const authResult = await resolveAuthUrl(channelId);
          if (authResult.directPlaylist) {
            state.playlistText = authResult.directPlaylist;
            state.authUrl = authResult.url;
          } else {
            state.authUrl = authResult;
          }
        }

        // Si on a une URL d'auth et pas de playlist directe, fetch la playlist
        if (state.authUrl && !state.playlistText) {
          state.playlistText = await fetchPlaylist(channelId, state.authUrl);
        }

        state.lastFetch = Date.now();
      } catch (error) {
        console.error(`[TV] Error updating playlist for ${channelId}:`, error.message);
        return res.status(500).json({ 
          error: 'Failed to fetch playlist',
          details: error.message
        });
      }
    }

    if (!state.playlistText) {
      return res.status(500).json({ error: 'No playlist available' });
    }

    // Créer la playlist locale
    const localPlaylist = makeLocalPlaylist(state.playlistText, channelId);

    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.status(200).send(localPlaylist);

  } catch (error) {
    console.error('[TV STREAM ERROR]', error.message);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    });
  }
}