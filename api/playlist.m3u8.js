// État en mémoire (comme dans le code fonctionnel)
let currentAuthUrl = null;
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

// Fetch le contenu initial (comme dans le code fonctionnel)
async function fetchInitialContent() {
  console.log("Fetching initial content from:", baseRemote);
  const res = await fetch(baseRemote, { method: "GET", headers: defaultHeaders });
  
  if (!res.ok) {
    throw new Error(`Failed to fetch initial content: ${res.status}`);
  }
  
  const contentType = res.headers.get('content-type');
  const text = await res.text();
  
  // Si c'est une playlist M3U8
  if (text.includes("#EXTM3U")) {
    currentPlaylistText = text;
    console.log("Master returned playlist directly");
    return { type: 'playlist', content: text };
  }
  
  // Si c'est un MP4, créer une playlist simple
  if (contentType?.includes('video/mp4')) {
    console.log("Master returned MP4 directly, creating simple playlist");
    const simplePlaylist = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:10
#EXT-X-MEDIA-SEQUENCE:0
#EXTINF:10.0,
${baseRemote}
#EXT-X-ENDLIST`;
    currentPlaylistText = simplePlaylist;
    return { type: 'mp4', content: simplePlaylist };
  }
  
  throw new Error("Unknown content type");
}

// Pas besoin de fetchPlaylist séparé, on utilise fetchInitialContent

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
      await fetchInitialContent();
      lastPlaylistFetch = Date.now();
    }
    const local = makeLocalPlaylist(currentPlaylistText);
    res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
    res.send(local);
  } catch (err) {
    console.error(err);
    res.status(500).send("error fetching playlist");
  }
}