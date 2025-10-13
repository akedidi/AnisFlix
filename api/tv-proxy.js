// État en mémoire (partagé avec l'API stream)
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
  
  console.log(`[TV PROXY] Resolving auth URL for channel ${channelId}:`, baseRemote);
  
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
      console.log(`[TV PROXY] Resolved auth URL for ${channelId}:`, resolved);
      return resolved;
    }
    
    // Parfois le serveur répond directement avec la playlist
    if (res.ok) {
      const text = await res.text();
      // Si ça ressemble à un M3U8, définir comme playlist
      if (text.includes("#EXTM3U")) {
        console.log(`[TV PROXY] Master returned playlist directly for ${channelId}`);
        return { directPlaylist: text, url: baseRemote };
      }
    }
    
    throw new Error("Could not resolve auth URL");
  } catch (error) {
    console.error(`[TV PROXY] Error resolving auth URL for ${channelId}:`, error.message);
    throw error;
  }
}

// Récupère le texte de la playlist depuis l'URL d'auth
async function fetchPlaylist(channelId, authUrl) {
  try {
    const res = await fetch(authUrl, { headers: defaultHeaders });
    if (!res.ok) throw new Error(`Failed fetching auth playlist: ${res.status}`);
    
    const text = await res.text();
    console.log(`[TV PROXY] Playlist fetched for ${channelId}, length:`, text.length);
    return text;
  } catch (error) {
    console.error(`[TV PROXY] Error fetching playlist for ${channelId}:`, error.message);
    throw error;
  }
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { channelId, segment } = req.query;

    if (!channelId) {
      return res.status(400).json({ error: 'Channel ID required' });
    }

    // Si pas de segment, c'est une requête de playlist
    if (!segment) {
      return res.status(400).json({ error: 'Segment name required' });
    }

    // Décoder le nom du segment
    const segmentName = decodeURIComponent(segment);
    console.log(`[TV PROXY] Fetching segment ${segmentName} for channel ${channelId}`);

    // Initialiser l'état du canal s'il n'existe pas
    if (!channelStates[channelId]) {
      channelStates[channelId] = {
        authUrl: null,
        playlistText: null,
        lastFetch: 0
      };
    }

    const state = channelStates[channelId];

    // Si pas de playlist ou trop vieille (>8s), refetch
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
        console.error(`[TV PROXY] Error updating playlist for ${channelId}:`, error.message);
        return res.status(500).json({ 
          error: 'Failed to fetch playlist',
          details: error.message
        });
      }
    }

    if (!state.playlistText) {
      return res.status(500).json({ error: 'No playlist available' });
    }

    // Extraire le token du nom du segment
    let token = null;
    if (segmentName.includes('?token=')) {
      token = segmentName.split('?token=')[1];
    } else {
      // Essayer de trouver le token dans la playlist
      const re = new RegExp(`${segmentName.replace(/\?/g, "\\?").split("\\?")[0]}(?:\\?token=([^\\s]+))?`);
      const match = state.playlistText.match(re);
      if (match && match[1]) {
        token = match[1];
      }
    }

    // Construire l'URL distante
    const remoteBase = state.authUrl ? new URL(state.authUrl).origin : 'https://fremtv.lol';
    const remoteUrl = token
      ? `${remoteBase}/hls/${segmentName.split("?")[0]}?token=${token}`
      : `${remoteBase}/hls/${segmentName.split("?")[0]}`;

    console.log(`[TV PROXY] Fetching from: ${remoteUrl}`);

    // Headers pour la requête upstream
    const upstreamHeaders = { ...defaultHeaders };
    if (req.headers.range) {
      upstreamHeaders.Range = req.headers.range;
    }

    // Faire la requête upstream
    const upstream = await fetch(remoteUrl, { headers: upstreamHeaders });

    if (!upstream.ok) {
      console.error(`[TV PROXY] Upstream error: ${upstream.status} ${upstream.statusText}`);
      return res.status(upstream.status).json({ 
        error: 'Upstream error',
        status: upstream.status,
        statusText: upstream.statusText
      });
    }

    console.log(`[TV PROXY] Success: ${upstream.status}`);

    // Propager les headers importants
    const importantHeaders = [
      'content-type',
      'content-length', 
      'accept-ranges',
      'content-range',
      'cache-control'
    ];

    importantHeaders.forEach(header => {
      const value = upstream.headers.get(header);
      if (value) {
        res.setHeader(header, value);
      }
    });

    // Streamer le contenu
    const buffer = await upstream.arrayBuffer();
    res.status(upstream.status).send(Buffer.from(buffer));

  } catch (error) {
    console.error('[TV PROXY ERROR]', error.message);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    });
  }
}
