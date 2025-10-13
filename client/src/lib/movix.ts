const MOVIX_BASE_URL = "https://api.movix.site/api";

export type StreamProvider = "fstream" | "topstream" | "wiflix";

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
  provider: StreamProvider = "topstream"
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
  provider: StreamProvider = "topstream"
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
      case "topstream":
        if (episode !== undefined) {
          url = `${MOVIX_BASE_URL}/topstream/tv/${seriesId}?season=${season}&episode=${episode}`;
        } else {
          url = `${MOVIX_BASE_URL}/topstream/tv/${seriesId}?season=${season}`;
        }
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
  const providers: StreamProvider[] = ["fstream", "topstream", "wiflix"];
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
  const providers: StreamProvider[] = ["fstream", "topstream", "wiflix"];
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
    // Use Vercel Functions in production, local API in development
    const apiUrl = process.env.NODE_ENV === 'production' 
      ? '/api/vidzy/extract-simple'
      : '/api/vidzy/extract';
      
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: vidzyUrl }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.m3u8Url || null;
  } catch (error) {
    console.error('Erreur lors de l\'extraction Vidzy:', error);
    return null;
  }
}
