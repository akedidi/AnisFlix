import { useQuery } from '@tanstack/react-query';
import { movixProxy } from '@/lib/movixProxy';

interface AnimeEpisode {
  name: string;
  serie_name: string;
  season_name: string;
  index: number;
  streaming_links: {
    language: string;
    players: string[];
  }[];
}

interface AnimeSeason {
  name: string;
  episodes: AnimeEpisode[];
  episodeCount: number;
  cacheFile: string;
  timestamp: number;
}

interface AnimeSeriesData {
  url: string;
  name: string;
  image: string;
  alternative_names: string[];
  alternative_names_string: string;
  seasons: AnimeSeason[];
}

const fetchAnimeSeries = async (title: string): Promise<AnimeSeriesData | null> => {
  try {
    // Extraire le titre de la série (enlever "Saison X Épisode Y")
    let seriesTitle = title.split(' - ')[0];
    console.log('🔍 fetchAnimeSeries - Titre original:', title);
    console.log('🔍 fetchAnimeSeries - Titre extrait:', seriesTitle);
    
    // Remplacer les tirets par des espaces pour l'API TMDB
    seriesTitle = seriesTitle.replace(/-/g, ' ');
    console.log('🔍 fetchAnimeSeries - Titre après remplacement des tirets:', seriesTitle);
    
    // Utiliser l'API Movix avec le bon endpoint
    const data = await movixProxy.searchAnime(seriesTitle, true, true);
    console.log('🔍 fetchAnimeSeries - Réponse API Movix:', data);

    if (data && data.results && Array.isArray(data.results)) {
      // Chercher une série anime dans les résultats
      const animeSeries = data.results.find(result => 
        result.type === 'animes' && 
        result.name.toLowerCase().includes(seriesTitle.toLowerCase())
      );
      
      if (animeSeries) {
        console.log('🔍 fetchAnimeSeries - Série anime trouvée:', animeSeries);
        
        // Simuler la structure attendue par l'interface AnimeSeriesData
        const animeData: AnimeSeriesData = {
          name: animeSeries.name,
          seasons: [] // Pour l'instant, on retourne une structure vide
        };
        
        return animeData;
      }
    }
    
    // Si aucun résultat trouvé, retourner null
    console.log('🔍 fetchAnimeSeries - Aucune série anime trouvée pour:', seriesTitle);
    return null;
  } catch (error) {
    console.error('Erreur lors de la récupération des données anime:', error);
    return null;
  }
};

export const useAnimeSeries = (title: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['anime-series', title],
    queryFn: () => fetchAnimeSeries(title),
    enabled: enabled && !!title,
    staleTime: 1000 * 60 * 10, // 10 minutes
    retry: 1,
  });
};

// Hook pour extraire les liens VidMoly d'une série anime
export const useAnimeVidMolyLinks = (title: string, seasonNumber: number, episodeNumber: number, enabled: boolean = true): {
  data: any;
  isLoading: boolean;
  error: any;
  hasVidMolyLinks: boolean;
} => {
  const { data: animeData, isLoading, error } = useAnimeSeries(title, enabled);
  
  const vidmolyLinks = {
    vf: [] as any[],
    vostfr: [] as any[]
  };

  // Pour l'instant, retourner des données vides car la structure des saisons/épisodes
  // n'est pas encore implémentée avec le nouvel endpoint
  console.log('🔍 useAnimeVidMolyLinks - Fonctionnalité en cours de développement avec le nouvel endpoint Movix');
  
  return {
    data: vidmolyLinks,
    isLoading,
    error,
    hasVidMolyLinks: vidmolyLinks.vf.length > 0 || vidmolyLinks.vostfr.length > 0
  };
};
