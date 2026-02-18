const MOVIX_BASE_URL = "https://api.movix.site/api";

export type StreamProvider = "fstream" | "wiflix";

export interface StreamSource {
  provider: StreamProvider;
  url: string;
  quality?: string;
  subtitles?: Array<{
    language: string;
    url: string;
  }>;
  audioTracks?: Array<{
    language: string;
    url: string;
  }>;
}

export interface MovieStreamResponse {
  sources: StreamSource[];
  success: boolean;
}

export interface SeriesStreamResponse {
  sources: StreamSource[];
  success: boolean;
}

export async function getMovieStream(
  movieId: number,
  provider: StreamProvider = "fstream"
): Promise<MovieStreamResponse> {
  try {
    const url = `${MOVIX_BASE_URL}/${provider}/movie/${movieId}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch ${provider} stream for movie ${movieId}`);
    }

    const data = await response.json();
    return data as MovieStreamResponse;
  } catch (error) {
    console.error(`Error fetching movie stream from ${provider}:`, error);
    throw error;
  }
}

export async function getSeriesStream(
  seriesId: number,
  season: number,
  episode?: number,
  provider: StreamProvider = "fstream"
): Promise<SeriesStreamResponse> {
  try {
    let url: string;

    switch (provider) {
      case "fstream":
        url = `${MOVIX_BASE_URL}/fstream/tv/${seriesId}/season/${season}`;
        break;
      case "wiflix":
        url = `${MOVIX_BASE_URL}/wiflix/tv/${seriesId}/${season}`;
        break;
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch ${provider} stream for series ${seriesId}`);
    }

    const data = await response.json();
    return data as SeriesStreamResponse;
  } catch (error) {
    console.error(`Error fetching series stream from ${provider}:`, error);
    throw error;
  }
}

export async function getAllMovieStreams(movieId: number): Promise<Record<StreamProvider, any>> {
  const providers: StreamProvider[] = ["fstream", "wiflix"];
  const results: Record<string, any> = {};

  await Promise.allSettled(
    providers.map(async (provider) => {
      try {
        results[provider] = await getMovieStream(movieId, provider);
      } catch (error) {
        results[provider] = { error: true, message: `Failed to load ${provider}` };
      }
    })
  );

  return results as Record<StreamProvider, any>;
}

export async function getAllSeriesStreams(
  seriesId: number,
  season: number,
  episode?: number
): Promise<Record<StreamProvider, any>> {
  const providers: StreamProvider[] = ["fstream", "wiflix"];
  const results: Record<string, any> = {};

  await Promise.allSettled(
    providers.map(async (provider) => {
      try {
        results[provider] = await getSeriesStream(seriesId, season, episode, provider);
      } catch (error) {
        results[provider] = { error: true, message: `Failed to load ${provider}` };
      }
    })
  );

  return results as Record<StreamProvider, any>;
}

/**
 * Extrait le lien m3u8 depuis une URL Vidzy en utilisant l'API backend
 * @param vidzyUrl - URL complète de la page Vidzy (ex: https://vidzy.org/embed-xxxxx.html)
 * @returns Le lien m3u8 extrait ou null si échec
 */
export async function extractVidzyM3u8(vidzyUrl: string): Promise<string | null> {
  try {
    // Utiliser l'API client pour la compatibilité iOS/Web
    const { apiClient } = await import('./apiClient');
    const { getVidzyProxyUrl } = await import('../utils/urlUtils');

    console.log('🔍 Vidzy extraction avec API client pour:', vidzyUrl);

    const data = await apiClient.extractVidzy(vidzyUrl);
    console.log('✅ Vidzy API Response:', data);

    // Vérifier si c'est une erreur
    if (data.error) {
      console.error('Erreur API Vidzy:', data.error, data.details);
      throw new Error(data.error);
    }

    // Vérifier les deux clés possibles (extractedUrl ou m3u8Url)
    const m3u8Url = data.extractedUrl || data.m3u8Url;

    if (!m3u8Url) {
      console.log('⚠️ Aucun lien m3u8 trouvé pour Vidzy');
      return null;
    }

    // Pour Vidzy, utiliser directement l'URL m3u8 extraite
    // Pas besoin de proxy car l'URL est déjà extraite et valide
    console.log('📺 Vidzy m3u8 URL directe:', m3u8Url);
    return m3u8Url;
  } catch (error) {
    console.error('Erreur lors de l\'extraction Vidzy:', error);
    // Ne pas re-throw pour éviter les crashes, retourner null à la place
    return null;
  }
}

/**
 * Extrait le lien m3u8 depuis une URL VidMoly en utilisant l'API backend
 * @param vidmolyUrl - URL complète de la page VidMoly (ex: https://vidmoly.to/embed-xxxxx.html)
 * @returns Le lien m3u8 extrait ou null si échec
 */
export async function extractVidMolyM3u8(vidmolyUrl: string): Promise<string | null> {
  try {
    // Utiliser l'API client pour la compatibilité iOS/Web
    const { apiClient } = await import('./apiClient');

    console.log('🔍 VidMoly extraction avec API client pour:', vidmolyUrl);

    const data = await apiClient.extractVidMoly(vidmolyUrl);
    console.log('✅ VidMoly API Response:', data);

    // Vérifier si c'est une erreur
    if (data.error) {
      console.error('Erreur API VidMoly:', data.error);
      throw new Error(data.error);
    }

    // Vérifier les clés possibles (m3u8, file, etc.)
    const m3u8Url = data.data?.file || data.file || data.m3u8;

    if (!m3u8Url) {
      console.log('⚠️ Aucun lien m3u8 trouvé pour VidMoly');
      return null;
    }

    return m3u8Url;
  } catch (error) {
    console.error('Erreur lors de l\'extraction VidMoly:', error);
    // Ne pas re-throw pour éviter les crashes, retourner null à la place
    return null;
  }
}

/**
 * Extrait le lien m3u8 depuis une URL Luluvid en utilisant l'API backend
 * @param luluvidUrl - URL complète de la page Luluvid
 * @returns Le lien m3u8 extrait ou null si échec
 */
export async function extractLuluvidM3u8(luluvidUrl: string): Promise<string | null> {
  try {
    console.log('🔍 Luluvid proxy generation for:', luluvidUrl);

    // Construct the proxy URL directly
    // The backend's cinepro-proxy handles extraction and header wrapping
    const proxyUrl = `/api/movix-proxy?path=cinepro-proxy&url=${encodeURIComponent(luluvidUrl)}`;

    console.log('✅ Generated Luluvid Proxy URL:', proxyUrl);
    return proxyUrl;
  } catch (error) {
    console.error('Erreur lors de la génération du proxy Luluvid:', error);
    return null;
  }
}


/**
 * Extrait le lien m3u8 depuis une URL Bysebuho via AES-256-GCM.
 * 
 * Flux:
 * 1. /api/proxy?action=bysebuho-extract → fetch API côté Vercel
 * 2. Déchiffrement AES-256-GCM côté client (Web Crypto API)
 * 3. Essai payload2 (bysevideo.net, sans restriction ASN) puis payload1 (sprintcdn)
 * 4. M3U8 proxifié via /api/proxy
 */
export async function extractBysebuhoM3u8(bysebuhoUrl: string): Promise<string | null> {
  try {
    console.log('🔍 Bysebuho extraction (AES-256-GCM) pour:', bysebuhoUrl);

    // 1. Extraire le code vidéo depuis l'URL
    const codeMatch = bysebuhoUrl.match(/\/e\/([a-z0-9]+)/i);
    if (!codeMatch) throw new Error('Code vidéo introuvable dans URL: ' + bysebuhoUrl);
    const code = codeMatch[1];

    // 2. Fetch via notre proxy Vercel (token lié à l'ASN Vercel)
    const apiResp = await fetch(`/api/proxy?action=bysebuho-extract&code=${code}`);
    if (!apiResp.ok) throw new Error(`Proxy bysebuho-extract: ${apiResp.status}`);
    const { playback: pb } = await apiResp.json();
    if (!pb) throw new Error('Pas de données playback');

    // 3. Helpers de déchiffrement AES-256-GCM (Web Crypto API)
    const b64url = (s: string) => {
      const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
      const padded = b64.padEnd(b64.length + (4 - b64.length % 4) % 4, '=');
      return Uint8Array.from(atob(padded), c => c.charCodeAt(0));
    };

    const aesDecrypt = async (keyBytes: Uint8Array, ivBytes: Uint8Array, payloadBytes: Uint8Array) => {
      const cryptoKey = await crypto.subtle.importKey('raw', keyBytes.buffer as ArrayBuffer, { name: 'AES-GCM' }, false, ['decrypt']);
      const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivBytes.buffer as ArrayBuffer }, cryptoKey, payloadBytes.buffer as ArrayBuffer);
      return JSON.parse(new TextDecoder().decode(decrypted));
    };

    const concatKeys = (k1: Uint8Array, k2: Uint8Array) => {
      const out = new Uint8Array(k1.length + k2.length);
      out.set(k1, 0); out.set(k2, k1.length);
      return out;
    };

    // 4. payload1 (sprintcdn) - token généré par Vercel → ASN Vercel (14618) → proxy Vercel valide ✅
    let m3u8Url: string | null = null;
    try {
      const kp1 = b64url(pb.key_parts[0]);
      const kp2 = b64url(pb.key_parts[1]);
      const key1 = concatKeys(kp1, kp2);
      const iv1 = b64url(pb.iv);
      const payload1 = b64url(pb.payload);
      const sources1 = await aesDecrypt(key1, iv1, payload1);
      const hls1 = (sources1.sources || []).filter((s: any) => s.url?.includes('.m3u8'));
      if (hls1.length > 0) {
        m3u8Url = (hls1.find((s: any) => s.quality === 'h') || hls1[0]).url;
        console.log('✅ Bysebuho payload1 (sprintcdn):', m3u8Url);
      }
    } catch (e) {
      console.warn('⚠️ payload1 failed:', e);
    }

    // 5. Fallback: payload2 (bysevideo.net)
    if (!m3u8Url) {
      const edge1 = b64url(pb.decrypt_keys.edge_1);
      const edge2 = b64url(pb.decrypt_keys.edge_2);
      const key2 = concatKeys(edge1, edge2);
      const iv2 = b64url(pb.iv2);
      const payload2 = b64url(pb.payload2);
      const sources2 = await aesDecrypt(key2, iv2, payload2);
      const hls2 = (sources2.sources || []).filter((s: any) => s.url?.includes('.m3u8'));
      if (hls2.length === 0) throw new Error('Aucune source HLS trouvée');
      m3u8Url = (hls2.find((s: any) => s.quality === 'h') || hls2[0]).url;
      console.log('✅ Bysebuho payload2 (bysevideo.net):', m3u8Url);
    }

    // 6. Proxifier via /api/proxy (même ASN Vercel que le token → ✅)
    const proxied = `/api/proxy?url=${encodeURIComponent(m3u8Url!)}&referer=${encodeURIComponent('https://bysebuho.com/')}`;
    console.log('✅ Bysebuho M3U8 proxifié:', proxied);
    return proxied;

  } catch (error) {
    console.error('Erreur extraction Bysebuho:', error);
    return null;
  }
}

/**
 * Extrait le lien m3u8 depuis une URL FSVid en utilisant le proxy et parsing client
 */
export async function extractFSVidM3u8(fsvidUrl: string): Promise<string | null> {
  try {
    console.log('🔍 FSVid extraction demandé pour:', fsvidUrl);

    // 1. TENTATIVE SERVEUR (Static Extraction) - Priorité
    try {
      console.log('📡 Appel API Serveur /api/extract...');
      const serverRes = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'fsvid', url: fsvidUrl })
      });
      if (serverRes.ok) {
        const serverData = await serverRes.json();
        if (serverData && serverData.success && serverData.m3u8Url) {
          console.log('✅ FSVid extraction serveur réussie:', serverData.m3u8Url);
          const proxyUrl = `/api/proxy?url=${encodeURIComponent(serverData.m3u8Url)}&referer=${encodeURIComponent('https://fsvid.lol/')}`;
          return proxyUrl;
        }
      }
    } catch (serverError) {
      console.warn('⚠️ Échec extraction serveur FSVid, tentative client...');
    }

    // 2. Si échec serveur, on retourne null car le user ne veut pas de proxy client
    console.warn('⚠️ Échec extraction serveur FSVid et fallback client désactivé.');
    return null;
  } catch (error) {
    console.error('Erreur extraction FSVid:', error);
    return null;
  }
}

