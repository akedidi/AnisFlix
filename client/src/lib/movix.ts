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

    console.log('📺 VidMoly m3u8 URL directe:', m3u8Url);
    return m3u8Url;
  } catch (error) {
    console.error('Erreur lors de l\'extraction VidMoly:', error);
    // Ne pas re-throw pour éviter les crashes, retourner null à la place
    return null;
  }
}
