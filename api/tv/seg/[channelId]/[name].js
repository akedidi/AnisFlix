// État en mémoire (partagé avec l'API stream)
let channelStates = {};

// Headers par défaut
const defaultHeaders = {
  "User-Agent": "Mozilla/5.0 (Node HLS Proxy)",
  "Accept": "*/*",
  "Referer": "https://fremtv.lol/"
};

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
    const { channelId, name } = req.query;

    if (!channelId || !name) {
      return res.status(400).json({ error: 'Channel ID and segment name required' });
    }

    // Décoder le nom du segment
    const segmentName = decodeURIComponent(name);
    console.log(`[TV SEG] Fetching segment ${segmentName} for channel ${channelId}`);

    // Récupérer l'état du canal (normalement partagé avec l'API stream)
    const state = channelStates[channelId];
    if (!state || !state.playlistText) {
      return res.status(404).json({ error: 'Channel state not found' });
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

    console.log(`[TV SEG] Fetching from: ${remoteUrl}`);

    // Headers pour la requête upstream
    const upstreamHeaders = { ...defaultHeaders };
    if (req.headers.range) {
      upstreamHeaders.Range = req.headers.range;
    }

    // Faire la requête upstream
    const upstream = await fetch(remoteUrl, { headers: upstreamHeaders });

    if (!upstream.ok) {
      console.error(`[TV SEG] Upstream error: ${upstream.status} ${upstream.statusText}`);
      return res.status(upstream.status).json({ 
        error: 'Upstream error',
        status: upstream.status,
        statusText: upstream.statusText
      });
    }

    console.log(`[TV SEG] Success: ${upstream.status}`);

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
    console.error('[TV SEG ERROR]', error.message);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    });
  }
}
