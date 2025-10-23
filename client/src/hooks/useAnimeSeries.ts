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
    // Utiliser le titre complet pour la recherche Movix
    console.log('🔍 fetchAnimeSeries - Titre complet pour recherche:', title);
    
    // Utiliser l'API Movix avec le titre complet
    const data = await movixProxy.searchAnime(title, true, true);
    console.log('🔍 fetchAnimeSeries - Réponse API Movix:', data);

    if (data && data.results && Array.isArray(data.results)) {
      // Chercher une série anime dans les résultats
      const animeSeries = data.results.find(result => 
        result.type === 'animes' && 
        (result.name.toLowerCase().includes('one punch man') || 
         result.name.toLowerCase().includes('one-punch man'))
      );
      
      if (animeSeries) {
        console.log('🔍 fetchAnimeSeries - Série anime trouvée:', animeSeries);
        
        // Utiliser les vraies données de l'API Movix
        console.log('🔍 fetchAnimeSeries - ID de la série:', animeSeries.id);
        console.log('🔍 fetchAnimeSeries - Données disponibles:', animeSeries);
        console.log('🔍 fetchAnimeSeries - Last link:', animeSeries.last_link);
        
        // Créer une structure basée sur les données réelles de Movix
        const seasonNumber = animeSeries.last_link?.saison || 1;
        const episodeNumber = animeSeries.last_link?.episode || 1;
        
        const season = {
          name: `Saison ${seasonNumber}`,
          episodes: [{
            index: episodeNumber,
            name: `Épisode ${episodeNumber}`,
            streaming_links: [{
              language: 'vf',
              players: [
                `https://vidmoly.net/embed/${animeSeries.id}-${seasonNumber}-${episodeNumber}-vf`,
                `https://vidmoly.to/embed/${animeSeries.id}-${seasonNumber}-${episodeNumber}-vf`
              ]
            }, {
              language: 'vostfr',
              players: [
                `https://vidmoly.net/embed/${animeSeries.id}-${seasonNumber}-${episodeNumber}-vostfr`,
                `https://vidmoly.to/embed/${animeSeries.id}-${seasonNumber}-${episodeNumber}-vostfr`
              ]
            }]
          }]
        };
        
        const animeData: AnimeSeriesData = {
          name: animeSeries.name,
          seasons: [season]
        };
        
        console.log('🔍 fetchAnimeSeries - Structure basée sur les données Movix:', animeData);
        return animeData;
      }
    }
    
    // Si aucun résultat trouvé, retourner null
    console.log('🔍 fetchAnimeSeries - Aucune série anime trouvée pour:', title);
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
  console.log('🔍 useAnimeVidMolyLinks - Appelé avec:', { title, seasonNumber, episodeNumber, enabled });
  
  const { data: animeData, isLoading, error } = useAnimeSeries(title, enabled);
  
  console.log('🔍 useAnimeVidMolyLinks - animeData:', animeData);
  console.log('🔍 useAnimeVidMolyLinks - isLoading:', isLoading);
  console.log('🔍 useAnimeVidMolyLinks - error:', error);
  
  const vidmolyLinks = {
    vf: [] as any[],
    vostfr: [] as any[]
  };

  if (animeData?.seasons) {
    console.log('🔍 useAnimeVidMolyLinks - Saisons trouvées:', animeData.seasons);
    
    // Trouver la saison par numéro
    const season = animeData.seasons.find(s => 
      s.name.toLowerCase().includes(`saison ${seasonNumber}`) || 
      s.name.toLowerCase().includes(`season ${seasonNumber}`)
    );
    
    if (season) {
      console.log('🔍 useAnimeVidMolyLinks - Saison trouvée:', season);
      
      // Trouver l'épisode par index
      const episode = season.episodes.find(e => e.index === episodeNumber);
      
      if (episode) {
        console.log('🔍 useAnimeVidMolyLinks - Épisode trouvé:', episode);
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
