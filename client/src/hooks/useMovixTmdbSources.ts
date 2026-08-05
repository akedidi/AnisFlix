import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';

interface MovixTmdbSource {
  decoded_url: string;
  quality: string;
  language: string;
}

interface MovixTmdbResponse {
  tmdb_details: {
    id: number;
    title: string;
    original_title: string;
    release_date: string;
    poster_path: string;
    backdrop_path: string;
    overview: string;
    vote_average: number;
  };
  iframe_src: string;
  player_links: MovixTmdbSource[];
}

interface ProcessedSource {
  url: string;
  quality: string;
  language: string;
  provider: 'vidmoly' | 'vidzy' | 'darki' | 'vixsrc' | 'unknown';
  originalQuality: string;
}

// Fonction pour analyser la qualité et l'URL pour déterminer le provider
function analyzeProvider(quality: string, url: string): 'vidmoly' | 'vidzy' | 'darki' | 'vixsrc' | 'unknown' {
  const qualityLower = quality.toLowerCase();
  const urlLower = url.toLowerCase();

  if (qualityLower.includes('vixsrc') || urlLower.includes('vixsrc')) {
    return 'vixsrc';
  }
  if (qualityLower.includes('vidmoly') || urlLower.includes('vidmoly')) {
    return 'vidmoly';
  }
  if (qualityLower.includes('vidzy') || urlLower.includes('vidzy')) {
    return 'vidzy';
  }
  if (qualityLower.includes('darki') || urlLower.includes('darki')) {
    return 'darki';
  }

  return 'unknown';
}

// Fonction pour normaliser le language (French -> VF, English -> VO, etc.)
function normalizeLanguage(language: string): string {
  const langLower = language.toLowerCase();

  if (langLower.includes('french') || langLower.includes('français') || langLower === 'fr') {
    return 'VF';
  }

  if (langLower.includes('english') || langLower === 'en' || langLower === 'eng') {
    return 'VO';
  }

  if (langLower.includes('vostfr') || langLower.includes('subtitle')) {
    return 'VOSTFR';
  }

  return 'VF';
}

// Fonction pour extraire le premier mot du champ quality
function extractProviderName(quality: string, providerType: string): string {
  if (providerType === 'vixsrc') return 'VIXSRC';
  const firstWord = quality.split(' ')[0];
  return firstWord.toUpperCase();
}

// Fonction pour traiter les player_links et filtrer par provider
function processPlayerLinks(playerLinks: MovixTmdbSource[]): ProcessedSource[] {
  return playerLinks.map(link => {
    // Some endpoints wrap the provider name in quality or pass it in link.name
    // Check if name exists for Vixsrc
    const provider = analyzeProvider(link.quality, link.decoded_url || (link as any).url || '');
    const providerName = extractProviderName((link as any).name || link.quality, provider);
    const normalizedLanguage = normalizeLanguage(link.language || 'VF');

    return {
      url: link.decoded_url || (link as any).url,
      quality: providerName,
      language: normalizedLanguage,
      provider: provider,
      originalQuality: link.quality
    };
  });
}

export const useMovixTmdbSources = (movieId: number) => {
  console.log('🔍 [MOVIX TMDB] Hook initialized with movieId:', movieId);

  const queryResult = useQuery({
    queryKey: ['movix-tmdb-sources', movieId],
    queryFn: async (): Promise<MovixTmdbResponse & { processedSources: ProcessedSource[] }> => {
      try {
        const url = `/api/movix-proxy?path=tmdb/movie/${movieId}`;
        const response = await apiClient.request(url);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch Movix TMDB sources: ${response.status}`);
        }

        const data = await response.json();
        const rawLinks = data.player_links || data.streams || [];
        const processedSources = processPlayerLinks(rawLinks);

        // Filtrer les sources par provider connu
        const filteredSources = processedSources.filter(source =>
          source.provider !== 'unknown'
        );

        return {
          ...data,
          processedSources: filteredSources,
          sourcesByProvider: {
            vidmoly: filteredSources.filter(s => s.provider === 'vidmoly'),
            vidzy: filteredSources.filter(s => s.provider === 'vidzy'),
            darki: filteredSources.filter(s => s.provider === 'darki'),
            vixsrc: filteredSources.filter(s => s.provider === 'vixsrc'),
          }
        };
      } catch (error) {
        console.error('❌ [MOVIX TMDB] Error fetching sources:', error);
        console.error('❌ [MOVIX TMDB] Error details:', {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          type: typeof error
        });
        throw error;
      }
    },
    enabled: !!movieId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  console.log('🔍 [MOVIX TMDB] Query result:', {
    isLoading: queryResult.isLoading,
    isError: queryResult.isError,
    isSuccess: queryResult.isSuccess,
    hasData: !!queryResult.data,
    error: queryResult.error
  });

  return queryResult;
};
