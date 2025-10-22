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
    
    // Remplacer les tirets par des espaces pour l'API anime
    seriesTitle = seriesTitle.replace(/-/g, ' ');
    console.log('🔍 fetchAnimeSeries - Titre après remplacement des tirets:', seriesTitle);
    
    const data = await movixProxy.searchAnime(seriesTitle, true, true);

    console.log('🔍 fetchAnimeSeries - Réponse API:', data);

    if (data && Array.isArray(data) && data.length > 0) {
      // L'API retourne un tableau, prendre le premier élément
      return data[0];
    }
    
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

  if (animeData?.seasons) {
    // Trouver la saison par numéro (les saisons sont nommées "Saison 1", "Saison 2", etc.)
    const season = animeData.seasons.find(s => 
      s.name.toLowerCase().includes(`saison ${seasonNumber}`) || 
      s.name.toLowerCase().includes(`season ${seasonNumber}`)
    );
    
    if (season) {
      // Trouver l'épisode par index (les épisodes ont un index qui correspond au numéro d'épisode)
      const episode = season.episodes.find(e => e.index === episodeNumber);
      
      if (episode) {
        console.log('🔍 useAnimeVidMolyLinks - Épisode trouvé:', episode.name, episode.index);
        console.log('🔍 useAnimeVidMolyLinks - Streaming links:', episode.streaming_links);
        
        // Extraire les liens VidMoly des streaming_links
        episode.streaming_links?.forEach(link => {
          console.log('🔍 useAnimeVidMolyLinks - Traitement link:', link.language, link.players);
          
          // Filtrer les liens VidMoly dans les players
          const vidmolyPlayers = link.players.filter((playerUrl: string) => 
            playerUrl.includes('vidmoly')
          );
          
          console.log('🔍 useAnimeVidMolyLinks - Players VidMoly trouvés:', vidmolyPlayers);
          
          vidmolyPlayers.forEach((playerUrl: string) => {
            // Convertir vidmoly.to en vidmoly.net pour une meilleure compatibilité
            const normalizedUrl = playerUrl.replace('vidmoly.to', 'vidmoly.net');
            console.log('🔄 URL normalisée:', playerUrl, '→', normalizedUrl);
            
            if (link.language === 'vf') {
              console.log('✅ Ajout lien VF:', normalizedUrl);
              vidmolyLinks.vf.push({
                url: normalizedUrl,
                language: link.language
              });
            } else if (link.language === 'vostfr') {
              console.log('✅ Ajout lien VOSTFR:', normalizedUrl);
              vidmolyLinks.vostfr.push({
                url: normalizedUrl,
                language: link.language
              });
            }
          });
        });
      }
    }
  }

  console.log('🔍 useAnimeVidMolyLinks - Résultat final:', {
    vf: vidmolyLinks.vf,
    vostfr: vidmolyLinks.vostfr,
    vfCount: vidmolyLinks.vf.length,
    vostfrCount: vidmolyLinks.vostfr.length,
    hasVidMolyLinks: vidmolyLinks.vf.length > 0 || vidmolyLinks.vostfr.length > 0
  });

  return {
    data: vidmolyLinks,
    isLoading,
    error,
    hasVidMolyLinks: vidmolyLinks.vf.length > 0 || vidmolyLinks.vostfr.length > 0
  };
};
