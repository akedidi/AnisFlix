import { useQuery } from '@tanstack/react-query';
import { movixProxy } from '@/lib/movixProxy';

interface TopStreamResponse {
  success: boolean;
  tmdb_id: string;
  tmdb_details: {
    title: string;
    original_title: string;
    release_date: string;
    year: number;
    poster_path: string;
    backdrop_path: string;
    overview: string;
  };
  topstream_match: {
    title: string;
    year: number;
    url: string;
    similarity: number;
    total_score: number;
  };
  stream: {
    url: string;
    type: string;
    label: string;
  };
  searched_titles: string[];
  timestamp: string;
}

const fetchTopStream = async (type: 'movie' | 'tv', id: number): Promise<TopStreamResponse | null> => {
  try {
    const data = await movixProxy.getTopStream(type, id);
    
    // Vérifier si on a un stream disponible
    if (data.success && data.stream && data.stream.url) {
      return data;
    }
    
    return null;
  } catch (error) {
    console.error('Erreur lors de la récupération des données TopStream:', error);
    return null;
  }
};

export const useTopStream = (type: 'movie' | 'tv', id: number) => {
  return useQuery({
    queryKey: ['topstream', type, id],
    queryFn: () => fetchTopStream(type, id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
};
