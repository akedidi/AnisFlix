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

// Fetch la playlist M3U8 initiale (comme dans le code fonctionnel)
async function fetchPlaylist() {
  console.log("Fetching playlist from:", baseRemote);
  const res = await fetch(baseRemote, { method: "GET", headers: defaultHeaders });
  
  if (!res.ok) {
    throw new Error(`Failed to fetch playlist: ${res.status}`);
  }
  
  const text = await res.text();
  
  // L'URL retourne toujours une playlist M3U8 avec des segments
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