// Movix API integration for player links

export interface PlayerLink {
  player: string;
  link: string;
  is_hd: boolean;
}

export interface MovixResponse {
  player_links?: PlayerLink[];
  type?: string;
  series?: any[];
}

/**
 * Récupère les liens de lecture depuis l'API Movix
 * @param imdbId - L'ID IMDB (ex: tt13186306)
 * @param mediaType - 'movie' ou 'tv'
 * @returns Promise<MovixResponse>
 */
export async function getMovixPlayerLinks(imdbId: string, mediaType: 'movie' | 'tv'): Promise<MovixResponse> {
  try {
    const endpoint = mediaType === 'movie' 
      ? `https://api.movix.site/api/imdb/movie/${imdbId}`
      : `https://api.movix.site/api/imdb/tv/${imdbId}`;
    
    const response = await fetch(endpoint);
    
    if (!response.ok) {
      throw new Error(`Movix API error: ${response.status}`);
    }
    
    const data: MovixResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching Movix player links:', error);
    throw error;
  }
}

/**
 * Extrait l'ID IMDB depuis une URL ou un ID IMDB
 * @param imdbId - L'ID IMDB ou l'URL complète
 * @returns L'ID IMDB nettoyé (ex: tt13186306)
 */
export function extractImdbId(imdbId: string): string | null {
  if (!imdbId) return null;
  
  // Si c'est déjà un ID IMDB (commence par tt)
  if (imdbId.startsWith('tt')) {
    return imdbId;
  }
  
  // Si c'est une URL IMDB, extraire l'ID
  const match = imdbId.match(/\/title\/(tt\d+)/);
  if (match) {
    return match[1];
  }
  
  return null;
}

/**
 * Génère l'URL du proxy HLS pour les segments
 * @param segmentUrl - L'URL du segment original
 * @returns L'URL du proxy HLS
 */
export function getHLSProxyUrl(segmentUrl: string): string {
  return `/api/supervideo-proxy?url=${encodeURIComponent(segmentUrl)}`;
}