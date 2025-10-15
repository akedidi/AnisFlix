import { useQuery } from '@tanstack/react-query';

interface WiFlixPlayer {
  name: string;
  url: string;
  episode: number;
  type: string;
}

interface WiFlixResponse {
  success: boolean;
  tmdb_id: string;
  title: string;
  original_title: string;
  wiflix_url: string;
  players: {
    vf?: WiFlixPlayer[];
    vostfr?: WiFlixPlayer[];
  };
  cache_timestamp: string;
}

const fetchWiFlix = async (type: 'movie' | 'tv', id: number, season?: number): Promise<WiFlixResponse | null> => {
  try {
    let url = `https://api.movix.site/api/wiflix/${type}/${id}`;
    if (type === 'tv' && season) {
      url += `/season/${season}`;
    }
    
    const response = await fetch(url);
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    
    console.log('WiFlix API Response:', {
      url,
      success: data.success,
      players: data.players ? Object.keys(data.players) : 'No players',
      data
    });
    
    if (data.success) {
      return data;
    }
    
    return null;
  } catch (error) {
    console.error('Erreur lors de la récupération des données WiFlix:', error);
    return null;
  }
};

export const useWiFlix = (type: 'movie' | 'tv', id: number, season?: number) => {
  return useQuery({
    queryKey: ['wiflix', type, id, season],
    queryFn: () => fetchWiFlix(type, id, season),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Hook spécifique pour récupérer les liens VidMoly
export const useVidMolyLinks = (type: 'movie' | 'tv', id: number, season?: number) => {
  const { data: wiflixData, isLoading, error } = useWiFlix(type, id, season);
  
  const vidmolyLinks = {
    vf: [] as WiFlixPlayer[],
    vostfr: [] as WiFlixPlayer[]
  };

  if (wiflixData?.players) {
    // Filtrer les liens VidMoly
    if (wiflixData.players.vf) {
      vidmolyLinks.vf = wiflixData.players.vf.filter(player => 
        player.name === 'vidmoly.net'
      );
    }
    
    if (wiflixData.players.vostfr) {
      vidmolyLinks.vostfr = wiflixData.players.vostfr.filter(player => 
        player.name === 'vidmoly.net'
      );
    }
  }

  return {
    data: vidmolyLinks,
    isLoading,
    error,
    hasVidMolyLinks: vidmolyLinks.vf.length > 0 || vidmolyLinks.vostfr.length > 0
  };
};

