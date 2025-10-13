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

// Suit redirection initiale et stocke auth URL
async function resolveAuthUrl() {
  console.log("Resolving auth URL from master:", baseRemote);
  const res = await fetch(baseRemote, { method: "GET", redirect: "manual", headers: defaultHeaders });
  if (res.status >= 300 && res.status < 400) {
    const loc = res.headers.get("location");
    if (!loc) throw new Error("Redirect without Location header");
    const resolved = new URL(loc, baseRemote).toString();
    currentAuthUrl = resolved;
    console.log("Resolved auth URL:", currentAuthUrl);
    return currentAuthUrl;
  }
  if (res.ok) {
    const text = await res.text();
    if (text.includes("#EXTM3U")) {
      currentPlaylistText = text;
      console.log("Master returned playlist directly");
      return baseRemote;
    }
  }
  throw new Error("Could not resolve auth URL");
}

// Fetch playlist text from auth URL and keep it in memory
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
    const { name } = req.query;

    if (!name) {
      return res.status(400).json({ error: 'Segment name required' });
    }

    // Décoder le nom du segment
    const segmentName = decodeURIComponent(name);
    console.log(`[SEG] Fetching segment: ${segmentName}`);

    // Si pas de playlist, fetch une fois
    if (!currentPlaylistText) {
      await fetchPlaylist();
    }

    // On doit reconstruire l'URL distante (comme dans le code fonctionnel)
    let token = null;
    if (currentPlaylistText) {
      const re = new RegExp(`${segmentName.replace(/\?/g,"\\?").split("\\?")[0]}(?:\\?token=([^\\s]+))?`);
      const m = currentPlaylistText.match(re);
      if (m && m[1]) token = m[1];
    }

    // Si pas trouvé, re-fetch playlist once (token rotated)
    if (!token) {
      await fetchPlaylist();
      const m2 = currentPlaylistText.match(new RegExp(`${segmentName.replace(/\?/g,"\\?").split("\\?")[0]}(?:\\?token=([^\\s]+))?`));
      if (m2 && m2[1]) token = m2[1];
    }

    // remote segment url (comme dans le code fonctionnel)
    const remoteBase = new URL(currentAuthUrl || baseRemote).origin; // e.g. https://fremtv.lol
    const remoteUrl = token
      ? `${remoteBase}/hls/${segmentName.split("?")[0]}?token=${token}`
      : `${remoteBase}/hls/${segmentName.split("?")[0]}`;

    console.log(`[SEG] Fetching from: ${remoteUrl}`);

    // forward request and stream (comme dans le code fonctionnel)
    const upstream = await fetch(remoteUrl, { headers: defaultHeaders });
    if (!upstream.ok) {
      console.error(`[SEG] Upstream error: ${upstream.status}`);
      res.status(upstream.status).send("upstream error");
      return;
    }

    console.log(`[SEG] Success: ${upstream.status}`);

    // propagate content-type/length etc (comme dans le code fonctionnel)
    upstream.headers.forEach((v, k) => {
      if (k.toLowerCase() === "transfer-encoding") return;
      res.setHeader(k, v);
    });

    res.status(upstream.status);
    // stream body (comme dans le code fonctionnel)
    const buffer = await upstream.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error("seg error", err);
    res.status(500).send("seg proxy error");
  }
}
