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
    staleTime: 0, // Pas de cache pour debug
    cacheTime: 0, // Pas de cache pour debug
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
    console.log('🔍 WiFlix data reçue pour', type, id, ':', wiflixData);
    
    // Filtrer les liens VidMoly
    if (wiflixData.players.vf) {
      console.log('🔍 Players VF disponibles pour', type, id, ':', wiflixData.players.vf.map(p => p.name));
      vidmolyLinks.vf = wiflixData.players.vf.filter(player => {
          const isVidMoly = player.name === 'vidmoly.net';
          if (isVidMoly) {
            console.log('✅ Lien VidMoly VF trouvé pour', type, id, ':', player.url);
            console.log('🔍 Player complet VidMoly VF:', player);
          }
          return isVidMoly;
      });
    }
    
    if (wiflixData.players.vostfr) {
      console.log('🔍 Players VOSTFR disponibles pour', type, id, ':', wiflixData.players.vostfr.map(p => p.name));
      vidmolyLinks.vostfr = wiflixData.players.vostfr.filter(player => {
        const isVidMoly = player.name === 'vidmoly.net';
        if (isVidMoly) {
          console.log('✅ Lien VidMoly VOSTFR trouvé pour', type, id, ':', player.url);
        }
        return isVidMoly;
      });
    }
  }

  console.log('🔍 VidMoly links finaux pour', type, id, ':', vidmolyLinks);

  return {
    data: vidmolyLinks,
    isLoading,
    error,
    hasVidMolyLinks: vidmolyLinks.vf.length > 0 || vidmolyLinks.vostfr.length > 0
  };
};

