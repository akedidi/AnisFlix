import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

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
    const encodedTitle = encodeURIComponent(title);
    const response = await axios.get(
      `https://api.movix.site/anime/search/${encodedTitle}?includeSeasons=true&includeEpisodes=true`,
      {
        timeout: 10000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }
    );

    if (response.data && Array.isArray(response.data) && response.data.length > 0) {
      // L'API retourne un tableau, prendre le premier élément
      return response.data[0];
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
export const useAnimeVidMolyLinks = (title: string, seasonNumber: number, episodeNumber: number) => {
  const { data: animeData, isLoading, error } = useAnimeSeries(title);
  
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
        // Extraire les liens VidMoly des streaming_links
        episode.streaming_links?.forEach(link => {
          // Filtrer les liens VidMoly dans les players
          const vidmolyPlayers = link.players.filter((playerUrl: string) => 
            playerUrl.includes('vidmoly')
          );
          
          vidmolyPlayers.forEach((playerUrl: string) => {
            if (link.language === 'vf') {
              vidmolyLinks.vf.push({
                url: playerUrl,
                language: link.language
              });
            } else if (link.language === 'vostfr') {
              vidmolyLinks.vostfr.push({
                url: playerUrl,
                language: link.language
              });
            }
          });
        });
      }
    }
  }

  return {
    data: vidmolyLinks,
    isLoading,
    error,
    hasVidMolyLinks: vidmolyLinks.vf.length > 0 || vidmolyLinks.vostfr.length > 0
  };
};
