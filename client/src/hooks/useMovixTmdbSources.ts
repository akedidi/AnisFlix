import { useQuery } from '@tanstack/react-query';

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
  provider: 'vidmoly' | 'vidzy' | 'darki' | 'unknown';
  originalQuality: string;
}

// Fonction pour analyser la qualité et déterminer le provider
function analyzeQuality(quality: string): 'vidmoly' | 'vidzy' | 'darki' | 'unknown' {
  const qualityLower = quality.toLowerCase();
  
  if (qualityLower.includes('vidmoly')) {
    return 'vidmoly';
  }
  
  if (qualityLower.includes('vidzy')) {
    return 'vidzy';
  }
  
  if (qualityLower.includes('darki')) {
    return 'darki';
  }
  
  return 'unknown';
}

// Fonction pour extraire le premier mot du champ quality
function extractProviderName(quality: string): string {
  // Extraire le premier mot du champ quality
  const firstWord = quality.split(' ')[0];
  return firstWord.toUpperCase();
}

// Fonction pour traiter les player_links et filtrer par provider
function processPlayerLinks(playerLinks: MovixTmdbSource[]): ProcessedSource[] {
  return playerLinks.map(link => {
    const provider = analyzeQuality(link.quality);
    const providerName = extractProviderName(link.quality);
    
    return {
      url: link.decoded_url,
      quality: providerName, // Nom du provider (ex: "DARKI")
      language: link.language,
      provider: provider, // Type de provider pour la logique
      originalQuality: link.quality
    };
  });
}

export const useMovixTmdbSources = (movieId: number) => {
  return useQuery({
    queryKey: ['movix-tmdb-sources', movieId],
    queryFn: async (): Promise<MovixTmdbResponse & { processedSources: ProcessedSource[] }> => {
      console.log('🚀 [MOVIX TMDB] Fetching sources for movie:', movieId);
      
      const response = await fetch(`/api/movix-tmdb?movieId=${movieId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch Movix TMDB sources: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ [MOVIX TMDB] Sources fetched:', data);
      
      // Traiter les player_links pour analyser les providers
      const processedSources = processPlayerLinks(data.player_links || []);
      
      // Filtrer les sources par provider (vidmoly, vidzy, darki)
      const filteredSources = processedSources.filter(source => 
        source.provider !== 'unknown'
      );
      
      console.log('🔍 [MOVIX TMDB] Processed sources:', {
        total: processedSources.length,
        filtered: filteredSources.length,
        byProvider: {
          vidmoly: filteredSources.filter(s => s.provider === 'vidmoly').length,
          vidzy: filteredSources.filter(s => s.provider === 'vidzy').length,
          darki: filteredSources.filter(s => s.provider === 'darki').length,
        }
      });
      
      return {
        ...data,
        processedSources: filteredSources,
        // Sources groupées par provider pour faciliter l'utilisation
        sourcesByProvider: {
          vidmoly: filteredSources.filter(s => s.provider === 'vidmoly'),
          vidzy: filteredSources.filter(s => s.provider === 'vidzy'),
          darki: filteredSources.filter(s => s.provider === 'darki'),
        }
      };
    },
    enabled: !!movieId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};
