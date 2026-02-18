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
 * Extrait le lien m3u8 depuis une URL Bysebuho via AES-256-GCM côté client.
 * L'extraction se fait directement depuis le browser pour que le token CDN
 * soit lié à l'IP/ASN de l'utilisateur (et non du serveur Vercel).
 */
export async function extractBysebuhoM3u8(bysebuhoUrl: string): Promise<string | null> {
  try {
    console.log('🔍 Bysebuho extraction (AES-256-GCM client-side) pour:', bysebuhoUrl);

    // 1. Extraire le code vidéo depuis l'URL
    const codeMatch = bysebuhoUrl.match(/\/e\/([a-z0-9]+)/i);
    if (!codeMatch) throw new Error('Code vidéo introuvable dans URL: ' + bysebuhoUrl);
    const code = codeMatch[1];

    // 2. Fetch l'API directement depuis le browser (token lié à l'IP du user)
    const apiResp = await fetch(`https://bysebuho.com/api/videos/${code}`, {
      headers: {
        'Referer': `https://bysebuho.com/e/${code}`,
        'Origin': 'https://bysebuho.com',
      }
    });
    if (!apiResp.ok) throw new Error(`API Bysebuho: ${apiResp.status}`);
    const videoInfo = await apiResp.json();
    const pb = videoInfo.playback;
    if (!pb) throw new Error('Pas de données playback dans la réponse API');

    // 3. Déchiffrer AES-256-GCM avec Web Crypto API
    const b64url = (s: string) => {
      const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
      const padded = b64.padEnd(b64.length + (4 - b64.length % 4) % 4, '=');
      return Uint8Array.from(atob(padded), c => c.charCodeAt(0));
    };

    const kp1 = b64url(pb.key_parts[0]);
    const kp2 = b64url(pb.key_parts[1]);
    const keyBytes = new Uint8Array(kp1.length + kp2.length);
    keyBytes.set(kp1, 0);
    keyBytes.set(kp2, kp1.length); // 32 bytes = AES-256
    const ivBytes = b64url(pb.iv);
    const payloadBytes = b64url(pb.payload);

    const cryptoKey = await crypto.subtle.importKey(
      'raw', keyBytes, { name: 'AES-GCM' }, false, ['decrypt']
    );
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBytes },
      cryptoKey,
      payloadBytes
    );
    const sources = JSON.parse(new TextDecoder().decode(decrypted));

    // 4. Trouver le meilleur lien M3U8
    const hlsSources = (sources.sources || []).filter((s: any) =>
      s.mime_type === 'application/vnd.apple.mpegurl' || s.url?.includes('.m3u8')
    );
    if (hlsSources.length === 0) throw new Error('Aucune source HLS dans les données déchiffrées');

    const best = hlsSources.find((s: any) => s.quality === 'h') || hlsSources[0];
    console.log('✅ Bysebuho M3U8 extrait (client-side):', best.url);
    return best.url;

  } catch (error) {
    console.error('Erreur extraction Bysebuho Client:', error);
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

