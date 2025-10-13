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
 * Extrait le lien m3u8 depuis une URL SuperVideo
 * @param superVideoUrl - L'URL SuperVideo (ex: https://supervideo.cc/e/4sro2m95gamx)
 * @returns Promise<string> - Le lien m3u8 extrait
 */
export async function extractSuperVideoM3u8(superVideoUrl: string): Promise<string> {
  try {
    const response = await fetch('/api/supervideo-extract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: superVideoUrl }),
    });

    if (!response.ok) {
      throw new Error(`SuperVideo extraction failed: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.success && data.m3u8) {
      return data.m3u8;
    } else {
      throw new Error(data.error || 'Failed to extract m3u8 from SuperVideo');
    }
  } catch (error) {
    console.error('Error extracting SuperVideo m3u8:', error);
    throw error;
  }
}

/**
 * Traite un lien master.m3u8 et retourne l'URL de l'index m3u8
 * @param masterM3u8Url - L'URL du master.m3u8
 * @returns Promise<string> - L'URL de l'index m3u8
 */
export async function getIndexM3u8FromMaster(masterM3u8Url: string): Promise<string> {
  try {
    const response = await fetch(`/api/hls-proxy?url=${encodeURIComponent(masterM3u8Url)}&type=master`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch master playlist: ${response.status}`);
    }

    const playlistText = await response.text();
    
    // Parse the master playlist to find the index URL
    const lines = playlistText.split('\n');
    let indexUrl = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Look for EXT-X-STREAM-INF followed by a URL
      if (line.startsWith('#EXT-X-STREAM-INF:')) {
        const nextLine = lines[i + 1]?.trim();
        if (nextLine && !nextLine.startsWith('#')) {
          indexUrl = nextLine;
          break;
        }
      }
    }
    
    if (!indexUrl) {
      throw new Error('No index URL found in master playlist');
    }
    
    // If it's a relative URL, make it absolute
    if (!indexUrl.startsWith('http')) {
      const baseUrl = new URL(masterM3u8Url);
      const basePath = baseUrl.pathname.substring(0, baseUrl.pathname.lastIndexOf('/'));
      indexUrl = `${baseUrl.origin}${basePath}/${indexUrl}`;
    }
    
    return indexUrl;
  } catch (error) {
    console.error('Error getting index m3u8 from master:', error);
    throw error;
  }
}

/**
 * Obtient l'URL proxy pour un stream HLS complet
 * @param masterM3u8Url - L'URL du master.m3u8
 * @returns Promise<string> - L'URL proxy pour le lecteur vidéo
 */
export async function getHLSProxyUrl(masterM3u8Url: string): Promise<string> {
  try {
    // Le proxy HLS gère automatiquement le master.m3u8 et réécrit les URLs
    return `/api/hls-proxy?url=${encodeURIComponent(masterM3u8Url)}&type=master`;
  } catch (error) {
    console.error('Error getting HLS proxy URL:', error);
    throw error;
  }
}
