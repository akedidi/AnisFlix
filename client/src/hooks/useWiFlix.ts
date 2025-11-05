import { useQuery } from '@tanstack/react-query';
import { movixProxy } from '@/lib/movixProxy';

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
    const data = await movixProxy.getWiFlix(type, id, season);
    
    console.log('WiFlix API Response:', {
      type,
      id,
      season,
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
    staleTime: 5 * 60 * 1000, // 5 minutes de cache
    gcTime: 10 * 60 * 1000, // 10 minutes de cache
    retry: 1,
    refetchOnMount: false, // Pas de refetch au montage si les données sont en cache
    refetchOnWindowFocus: false, // Pas de refetch au focus
    refetchOnReconnect: false, // Pas de refetch sur reconnexion
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

