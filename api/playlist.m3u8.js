// État en mémoire (comme dans le code fonctionnel)
let currentPlaylistText = null;
let lastPlaylistFetch = 0;

// Headers par défaut
const defaultHeaders = {
  "User-Agent": "Mozilla/5.0 (Node HLS Proxy)",
  "Accept": "*/*",
  "Referer": "https://fremtv.lol/"
};

// URL de base sera définie dynamiquement
let baseRemote = null;

// Fetch le token depuis l'URL initiale (comme dans le code fonctionnel)
async function fetchToken() {
  console.log("Fetching token from:", baseRemote);
  const res = await fetch(baseRemote, { method: "GET", headers: defaultHeaders });
  
  if (!res.ok) {
    throw new Error(`Failed to fetch token: ${res.status}`);
  }
  
  // On s'en fout du contenu MP4, on cherche le token dans les headers
  const token = res.headers.get('x-token') || res.headers.get('token') || res.headers.get('x-auth-token');
  
  if (!token) {
    // Si pas de token dans les headers, peut-être dans l'URL de redirection
    const location = res.headers.get('location');
    if (location && location.includes('token=')) {
      const url = new URL(location);
      const extractedToken = url.searchParams.get('token');
      if (extractedToken) {
        console.log("Token found in location header:", extractedToken);
        return extractedToken;
      }
    }
    throw new Error("No token found in response");
  }
  
  console.log("Token found:", token);
  return token;
}

// Fetch la vraie playlist avec le token
async function fetchPlaylist() {
  const token = await fetchToken();
  
  // Construire l'URL de la vraie playlist avec le token
  const playlistUrl = `https://fremtv.lol/auth/${baseRemote.split('/').pop()}?token=${token}`;
  console.log("Fetching real playlist from:", playlistUrl);
  
  const res = await fetch(playlistUrl, { headers: defaultHeaders });
  
  if (!res.ok) {
    throw new Error(`Failed to fetch playlist: ${res.status}`);
  }
  
  const text = await res.text();
  
  if (text.includes("#EXTM3U")) {
    currentPlaylistText = text;
    lastPlaylistFetch = Date.now();
    console.log("Playlist fetched, length:", text.length);
    return text;
  }
  
  throw new Error("Not a valid M3U8 playlist");
}

// Simple parser -> remplace les lignes qui commencent par "/hls/..." par URLs locales (comme dans le code fonctionnel)
function makeLocalPlaylist(playlistText) {
  if (!playlistText) return "";
  const lines = playlistText.split(/\r?\n/);
  const out = lines.map(line => {
    if (line.startsWith("/hls/") || line.match(/\.ts\?/)) {
      // extract filename and keep query if any (we'll ignore remote token and proxy)
      const u = line.trim();
      // get basename (e.g. 78_25.ts?token=...)
      const name = u.split("/").pop();
      // local proxy path
      return `/api/seg/${encodeURIComponent(name)}`;
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

    // Définir l'URL de base pour cette chaîne
    baseRemote = `https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/${channelId}.m3u8`;

    // Si playlist trop vieille (>8s ou configurable), refetch (comme dans le code fonctionnel)
    if (!currentPlaylistText || Date.now() - lastPlaylistFetch > 8000) {
      await fetchPlaylist();
    }
    const local = makeLocalPlaylist(currentPlaylistText);
    res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
    res.send(local);
  } catch (err) {
    console.error(err);
    res.status(500).send("error fetching playlist");
  }
}