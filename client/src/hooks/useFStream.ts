import { useQuery } from '@tanstack/react-query';

interface FStreamPlayer {
  url: string;
  type: string;
  quality: string;
  player: string;
}

interface FStreamResponse {
  success: boolean;
  source: string;
  type: string;
  tmdb: {
    id: number;
    title: string;
    original_title: string;
    name_no_lang: string;
    release_date: string;
    overview: string;
  };
  search: {
    query: string;
    results: number;
    bestMatch: {
      title: string;
      originalTitle: string;
      link: string;
      seasonNumber: number | null;
      year: number | null;
    };
  };
  players?: {
    [key: string]: FStreamPlayer[];
  };
  episodes?: {
    [key: string]: {
      number: number;
      title: string;
      languages: {
        VF?: FStreamPlayer[];
        VOSTFR?: FStreamPlayer[];
      };
    };
  };
  total: number;
  metadata: {
    extractedAt: string;
    backgroundUpdate: boolean;
    fsvidFiltered: boolean;
    season?: number;
    episode?: number | null;
    fstreamReleaseDate?: string;
    dateValidation?: {
      fstreamYear: string;
      tmdbYear: string;
      isAvailable: boolean;
    };
  };
}

const fetchFStream = async (type: 'movie' | 'tv', id: number, season?: number): Promise<FStreamResponse | null> => {
  try {
    let url = `https://api.movix.site/api/fstream/${type}/${id}`;
    if (type === 'tv' && season) {
      url += `/season/${season}`;
    }
    
    const response = await fetch(url);
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    
    console.log('FStream API Response:', {
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
    console.error('Erreur lors de la récupération des données FStream:', error);
    return null;
  }
};

export const useFStream = (type: 'movie' | 'tv', id: number, season?: number) => {
  return useQuery({
    queryKey: ['fstream', type, id, season],
    queryFn: () => fetchFStream(type, id, season),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
};
