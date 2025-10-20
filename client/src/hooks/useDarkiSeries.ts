import { useQuery } from '@tanstack/react-query';

interface MovixSearchResult {
  id: number;
  tmdb_id: number;
  type: string;
  name: string;
}

interface MovixSearchResponse {
  results: MovixSearchResult[];
}

// Fonction pour récupérer l'ID Movix depuis l'ID TMDB
const getMovixIdFromTmdb = async (tmdbId: number, title?: string): Promise<number | null> => {
  try {
    // Si pas de titre fourni, on ne peut pas faire la recherche
    if (!title) {
      return null;
    }
    
    // Rechercher dans l'API Movix avec le titre
    const searchUrl = `https://api.movix.site/api/search?title=${encodeURIComponent(title)}`;
    
    const searchResponse = await fetch(searchUrl);
    if (!searchResponse.ok) {
      return null;
    }
    
    const searchData: MovixSearchResponse = await searchResponse.json();
    
    // Trouver le résultat qui correspond à notre TMDB ID et type 'series'
    const matchingResult = searchData.results.find(result => 
      result.tmdb_id === tmdbId && 
      result.type === 'series'
    );
    
    if (matchingResult) {
      return matchingResult.id;
    }
    
    return null;
  } catch (error) {
    console.error('[DarkiSeries] Error getting Movix ID:', error);
    return null;
  }
};

interface DarkiSource {
  id: string;
  src: string;
  language: string;
  quality: string;
  m3u8: string;
  provider: string;
  type: string;
}

interface DarkiSeriesResponse {
  success: boolean;
  sources: DarkiSource[];
  seriesId: number;
  season: number;
  episode: number;
  total: number;
}

const fetchDarkiSeries = async (tmdbId: number, season: number, episode: number, title?: string): Promise<DarkiSeriesResponse | null> => {
  try {
    // Convertir l'ID TMDB en ID Movix
    const movixId = await getMovixIdFromTmdb(tmdbId, title);
    
    if (!movixId) {
      console.log(`[DarkiSeries] Aucun ID Movix trouvé pour TMDB ID ${tmdbId}`);
      return null;
    }
    
    console.log(`[DarkiSeries] Conversion TMDB ${tmdbId} → Movix ${movixId}`);
    
    const url = `/api/darkibox/series?seriesId=${movixId}&season=${season}&episode=${episode}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    
    console.log('Darki Series API Response:', {
      url,
      tmdbId,
      movixId,
      success: data.success,
      sources: data.sources ? data.sources.length : 0,
      data
    });
    
    if (data.success) {
      return data;
    }
    
    return null;
  } catch (error) {
    console.error('Erreur lors de la récupération des sources Darki séries:', error);
    return null;
  }
};

export const useDarkiSeries = (seriesId: number, season: number, episode: number, title?: string) => {
  return useQuery({
    queryKey: ['darki-series', seriesId, season, episode, title],
    queryFn: () => fetchDarkiSeries(seriesId, season, episode, title),
    enabled: !!seriesId && !!season && !!episode,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

