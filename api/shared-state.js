// État partagé entre les APIs (comme dans le code fonctionnel)
export let currentAuthUrl = null;
export let currentPlaylistText = null;
export let lastPlaylistFetch = 0;
export let baseRemote = null;

// Headers par défaut
export const defaultHeaders = {
  "User-Agent": "Mozilla/5.0 (Node HLS Proxy)",
  "Accept": "*/*",
  "Referer": "https://fremtv.lol/"
};

// Fonctions pour gérer l'état
export function setBaseRemote(url) {
  baseRemote = url;
}

export function setAuthUrl(url) {
  currentAuthUrl = url;
}

export function setPlaylistText(text) {
  currentPlaylistText = text;
  lastPlaylistFetch = Date.now();
}

export function getState() {
  return {
    currentAuthUrl,
    currentPlaylistText,
    lastPlaylistFetch,
    baseRemote
  };
}
