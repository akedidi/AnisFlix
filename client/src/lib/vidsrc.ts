/**
 * Utilitaires pour VidSrc.io
 * Interface avec le scraper VidSrc côté serveur
 */

export interface VidSrcPlayer {
  name: string;
  url: string;
  type: 'm3u8' | 'mp4' | 'embed';
}

export interface VidSrcResult {
  success: boolean;
  m3u8Url?: string;
  players?: VidSrcPlayer[];
  error?: string;
}

/**
 * Extrait les liens de streaming depuis VidSrc
 */
export async function extractVidSrcStreamingLinks(url: string): Promise<VidSrcResult> {
  try {
    // Use Vercel Functions in production, local API in development
    const apiUrl = process.env.NODE_ENV === 'production' 
      ? '/api/vidsrc-extract'
      : '/api/vidsrc/extract';
      
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Erreur lors de l\'extraction VidSrc');
    }

    return await response.json();
  } catch (error) {
    console.error('Erreur VidSrc:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    };
  }
}

/**
 * Extrait directement le lien m3u8 depuis VidSrc
 */
export async function extractVidSrcM3u8(url: string): Promise<string | null> {
  try {
    // Use Vercel Functions in production, local API in development
    const apiUrl = process.env.NODE_ENV === 'production' 
      ? '/api/vidsrc-m3u8'
      : '/api/vidsrc/m3u8';
      
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Erreur lors de l\'extraction m3u8 VidSrc');
    }

    const data = await response.json();
    return data.m3u8Url || null;
  } catch (error) {
    console.error('Erreur extraction m3u8 VidSrc:', error);
    return null;
  }
}

/**
 * Génère une URL VidSrc pour un film TMDB
 */
export function generateVidSrcMovieUrl(tmdbId: number): string {
  return `https://vidsrc.io/embed/movie?tmdb=${tmdbId}`;
}

/**
 * Génère une URL VidSrc pour une série TMDB
 */
export function generateVidSrcSeriesUrl(tmdbId: number, season: number, episode: number): string {
  return `https://vidsrc.io/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`;
}

/**
 * Vérifie si une URL est une URL VidSrc valide
 */
export function isValidVidSrcUrl(url: string): boolean {
  return url.includes('vidsrc.io') && (url.includes('/embed/movie') || url.includes('/embed/tv'));
}

/**
 * Extrait l'ID TMDB depuis une URL VidSrc
 */
export function extractTmdbIdFromVidSrcUrl(url: string): { tmdbId?: number; season?: number; episode?: number } {
  try {
    const urlObj = new URL(url);
    const tmdbMatch = urlObj.searchParams.get('tmdb');
    const seasonMatch = urlObj.searchParams.get('season');
    const episodeMatch = urlObj.searchParams.get('episode');

    return {
      tmdbId: tmdbMatch ? parseInt(tmdbMatch) : undefined,
      season: seasonMatch ? parseInt(seasonMatch) : undefined,
      episode: episodeMatch ? parseInt(episodeMatch) : undefined,
    };
  } catch {
    return {};
  }
}
