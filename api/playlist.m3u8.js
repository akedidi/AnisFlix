// État en mémoire (comme dans le code fonctionnel)
let currentAuthUrl = null;
let currentPlaylistText = null;
let lastPlaylistFetch = 0;
let baseRemote = null;

// Headers par défaut
const defaultHeaders = {
  "User-Agent": "Mozilla/5.0 (Node HLS Proxy)",
  "Accept": "*/*",
  "Referer": "https://fremtv.lol/"
};

// Suit redirection initiale et stocke auth URL (comme dans le code fonctionnel)
async function resolveAuthUrl() {
  console.log("Resolving auth URL from master:", baseRemote);
  // Do not auto-follow redirects so we can read Location
  const res = await fetch(baseRemote, { method: "GET", redirect: "manual", headers: defaultHeaders });
  if (res.status >= 300 && res.status < 400) {
    const loc = res.headers.get("location");
    if (!loc) throw new Error("Redirect without Location header");
    // if relative, resolve
    const resolved = new URL(loc, baseRemote).toString();
    currentAuthUrl = resolved;
    console.log("Resolved auth URL:", currentAuthUrl);
    return currentAuthUrl;
  }
  // sometimes server replies directly with playlist
  if (res.ok) {
    const text = await res.text();
    // If it looks like an M3U8, set as playlist
    if (text.includes("#EXTM3U")) {
      currentPlaylistText = text;
      console.log("Master returned playlist directly");
      return baseRemote;
    }
  }
  throw new Error("Could not resolve auth URL");
}

// Fetch playlist text from auth URL and keep it in memory (comme dans le code fonctionnel)
async function fetchPlaylist() {
  if (!currentAuthUrl) await resolveAuthUrl();

  const res = await fetch(currentAuthUrl, { headers: defaultHeaders });
  if (!res.ok) throw new Error("Failed fetching auth playlist: " + res.status);
  const text = await res.text();
  currentPlaylistText = text;
  lastPlaylistFetch = Date.now();
  console.log("Playlist fetched, length:", text.length);
  return text;
}

// Simple parser -> remplace les lignes qui commencent par "/hls/..." par URLs locales (comme dans le code fonctionnel)
function makeLocalPlaylist(playlistText) {
  if (!playlistText) return "";
  const lines = playlistText.split(/\r?\n/);
  const out = lines.map(line => {
    if (line.startsWith("/hls/") || line.match(/\.ts\?/)) {
      // extract filename and keep query if any (we'll ignore remote token and proxy)
      const u = line.trim();
      // get basename (e.g. 138_914.ts?token=...)
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
