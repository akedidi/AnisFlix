import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

interface AnimeEpisode {
  id: number;
  name: string;
  episode_number: number;
  season_number: number;
  streaming_links: {
    language: string;
    quality: string;
    url: string;
    player: string;
  }[];
  players: {
    name: string;
    url: string;
    language: string;
  }[];
}

interface AnimeSeason {
  id: number;
  name: string;
  season_number: number;
  episodes: AnimeEpisode[];
}

interface AnimeSeriesData {
  id: number;
  name: string;
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

    if (response.data && response.data.seasons) {
      return response.data;
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
    const season = animeData.seasons.find(s => s.season_number === seasonNumber);
    if (season) {
      const episode = season.episodes.find(e => e.episode_number === episodeNumber);
      if (episode) {
        // Extraire les liens VidMoly des streaming_links
        episode.streaming_links?.forEach(link => {
          if (link.player === 'vidmoly' || link.url.includes('vidmoly')) {
            if (link.language === 'fr') {
              vidmolyLinks.vf.push({
                url: link.url,
                quality: link.quality,
                language: link.language
              });
            } else if (link.language === 'vostfr') {
              vidmolyLinks.vostfr.push({
                url: link.url,
                quality: link.quality,
                language: link.language
              });
            }
          }
        });

        // Extraire les liens VidMoly des players
        episode.players?.forEach(player => {
          if (player.name === 'vidmoly' || player.url.includes('vidmoly')) {
            if (player.language === 'fr') {
              vidmolyLinks.vf.push({
                url: player.url,
                language: player.language
              });
            } else if (player.language === 'vostfr') {
              vidmolyLinks.vostfr.push({
                url: player.url,
                language: player.language
              });
            }
          }
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
