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

    // Filtrer les liens VidMoly et Luluvid
    const filterLinks = (players: WiFlixPlayer[]) => {
      return players.filter(player => {
        const name = player.name.toLowerCase();
        const isVidMoly = name.includes('vidmoly') ||
          name.includes('myvidplay') ||
          name.includes('christopheruntilpoint') ||
          name.includes('waaw1');

        const isLuluvid = name.includes('luluvid') || name.includes('lulustream');

        if (isVidMoly) console.log('✅ Lien VidMoly trouvé:', player.url);
        if (isLuluvid) console.log('✅ Lien Luluvid trouvé:', player.url);

        return isVidMoly || isLuluvid;
      });
    };

    if (wiflixData.players.vf) {
      vidmolyLinks.vf = filterLinks(wiflixData.players.vf);
    }

    if (wiflixData.players.vostfr) {
      vidmolyLinks.vostfr = filterLinks(wiflixData.players.vostfr);
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

