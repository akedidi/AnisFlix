import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';

interface MovixTmdbSource {
    decoded_url: string;
    quality: string;
    language: string;
}

interface MovixTmdbSeriesResponse {
    tmdb_details: {
        id: number;
        name: string;
        original_name: string;
        first_air_date: string;
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

// Fonction pour analyser la qualité et l'URL pour déterminer le provider
function analyzeProvider(quality: string, url: string): 'vidmoly' | 'vidzy' | 'darki' | 'unknown' {
    const qualityLower = quality.toLowerCase();
    const urlLower = url.toLowerCase();

    // Check both quality field and URL
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

// Fonction pour extraire le premier mot du champ quality
function extractProviderName(quality: string): string {
    const firstWord = quality.split(' ')[0];
    return firstWord.toUpperCase();
}

// Fonction pour traiter les player_links et filtrer par provider
function processPlayerLinks(playerLinks: MovixTmdbSource[]): ProcessedSource[] {
    return playerLinks.map(link => {
        const provider = analyzeProvider(link.quality, link.decoded_url);
        const providerName = extractProviderName(link.quality);

        return {
            url: link.decoded_url,
            quality: providerName,
            language: link.language,
            provider: provider,
            originalQuality: link.quality
        };
    });
}

export const useMovixTmdbSeriesSources = (
    seriesId: number,
    season: number,
    episode: number
) => {
    console.log('🔍 [MOVIX TMDB SERIES] Hook initialized:', { seriesId, season, episode });

    const queryResult = useQuery({
        queryKey: ['movix-tmdb-series-sources', seriesId, season, episode],
        queryFn: async (): Promise<MovixTmdbSeriesResponse & { processedSources: ProcessedSource[] }> => {
            console.log('🚀 [MOVIX TMDB SERIES] Fetching sources:', { seriesId, season, episode });

            try {
                // API call: /api/movix-proxy?path=tmdb/tv/{id}?season=X&episode=Y
                const url = `/api/movix-proxy?path=tmdb/tv/${seriesId}?season=${season}&episode=${episode}`;

                console.log('🔍 [MOVIX TMDB SERIES] Request URL:', url);
                const response = await apiClient.request(url);

                if (!response.ok) {
                    throw new Error(`Failed to fetch Movix TMDB series sources: ${response.status}`);
                }

                const data = await response.json();
                console.log('✅ [MOVIX TMDB SERIES] Sources fetched:', data);

                // Traiter les player_links pour analyser les providers
                const processedSources = processPlayerLinks(data.player_links || []);

                // Filtrer les sources par provider (vidmoly, vidzy, darki)
                const filteredSources = processedSources.filter(source =>
                    source.provider !== 'unknown'
                );

                console.log('🔍 [MOVIX TMDB SERIES] Processed sources:', {
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
                    sourcesByProvider: {
                        vidmoly: filteredSources.filter(s => s.provider === 'vidmoly'),
                        vidzy: filteredSources.filter(s => s.provider === 'vidzy'),
                        darki: filteredSources.filter(s => s.provider === 'darki'),
                    }
                };
            } catch (error) {
                console.error('❌ [MOVIX TMDB SERIES] Error fetching sources:', error);
                throw error;
            }
        },
        enabled: !!seriesId && season > 0 && episode > 0,
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
    });

    return queryResult;
};
