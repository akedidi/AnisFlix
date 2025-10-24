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

const fetchTopStream = async (type: 'movie' | 'tv', id: number, season?: number, episode?: number): Promise<TopStreamResponse | null> => {
  try {
    console.log('🔍 [TOPSTREAM] Fetching data for:', { type, id, season, episode });
    const data = await movixProxy.getTopStream(type, id, season, episode);
    
    console.log('🔍 [TOPSTREAM] API Response:', data);
    
    // Vérifier si on a un stream disponible
    if (data.success && data.stream && data.stream.url) {
      console.log('✅ [TOPSTREAM] Stream found:', data.stream.url);
      return data;
    }
    
    console.log('❌ [TOPSTREAM] No stream available');
    return null;
  } catch (error) {
    console.error('❌ [TOPSTREAM] Error fetching data:', error);
    return null;
  }
};

export const useTopStream = (type: 'movie' | 'tv', id: number, season?: number, episode?: number) => {
  return useQuery({
    queryKey: ['topstream', type, id, season, episode],
    queryFn: () => fetchTopStream(type, id, season, episode),
    enabled: !!id && (type === 'movie' || (type === 'tv' && !!season)),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
};
