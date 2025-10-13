// État en mémoire (comme dans le code fonctionnel)
let currentPlaylistText = null;
let lastPlaylistFetch = 0;

// Headers exacts de votre code fonctionnel
const browserHeaders = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
  'Origin': 'https://directfr.lat',
  'Referer': 'https://directfr.lat/',
  'Accept': 'application/vnd.apple.mpegurl, application/x-mpegURL, */*',
  'Accept-Language': 'fr-FR,fr;q=0.7,en;q=0.6',
  'Connection': 'keep-alive'
};

// URL de base sera définie dynamiquement
let baseRemote = null;

// Fetch la playlist exactement comme votre code fonctionnel
async function fetchPlaylist() {
  console.log("Fetching playlist from:", baseRemote);
  
  // Amorcer éventuellement la session (comme votre code)
  try { 
    await fetch('https://fremtv.lol/', { headers: browserHeaders }); 
  } catch {}
  
  // Laisser suivre la redirection automatiquement (comme votre code)
  const res = await fetch(baseRemote, { 
    method: 'GET',
    headers: browserHeaders,
    redirect: 'follow' // Suit automatiquement les redirections
  });
  
  if (!res.ok) {
    throw new Error(`Failed to fetch playlist: ${res.status}`);
  }
  
  const text = await res.text();
  const contentType = res.headers.get('content-type') || '';
  
  console.log(`[ENTRY] ${res.status} ${contentType} ← ${res.url}`);
  
  if (typeof text !== 'string') {
    throw new Error('Pas une playlist M3U8.');
  }
  
  if (text.includes("#EXTM3U")) {
    currentPlaylistText = text;
    lastPlaylistFetch = Date.now();
    console.log("Playlist fetched, length:", text.length);
    return text;
  }
  
  throw new Error("Not a valid M3U8 playlist");
}

// Fonction toAbsolute exactement comme votre code fonctionnel
function toAbsolute(base, maybeRelative) {
  try { 
    return new URL(maybeRelative, base).toString(); 
  } catch { 
    return maybeRelative; 
  }
}

// Rewrite playlist URLs exactement comme votre code fonctionnel
function rewritePlaylistUrls(playlistText, baseUrl) {
  return playlistText
    .split('\n')
    .map((line) => {
      const t = line.trim();
      if (!t || t.startsWith('#')) return line;
      const abs = toAbsolute(baseUrl, t);
      if (/\.m3u8(\?|$)/i.test(abs)) return `/api/proxy-m3u8?url=${encodeURIComponent(abs)}`;
      return `/api/proxy-segment?url=${encodeURIComponent(abs)}`;
    })
    .join('\n');
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

    // Définir l'URL de base pour cette chaîne
    baseRemote = `https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/${channelId}.m3u8`;

    // Si playlist trop vieille (>8s ou configurable), refetch (comme dans le code fonctionnel)
    if (!currentPlaylistText || Date.now() - lastPlaylistFetch > 8000) {
      await fetchPlaylist();
    }
    
    // Utiliser l'URL finale comme baseUrl (comme votre code fonctionnel)
    const baseUrl = baseRemote; // L'URL finale après redirection
    const rewritten = rewritePlaylistUrls(currentPlaylistText, baseUrl);
    
    res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
    res.send(rewritten);
  } catch (err) {
    console.error(err);
    res.status(500).send("error fetching playlist");
  }
}