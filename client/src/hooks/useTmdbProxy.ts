import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

interface TmdbProxyLink {
    decoded_url: string;
    quality: string;
    language?: string;
}

interface TmdbProxyResponse {
    player_links?: TmdbProxyLink[];
}

const fetchTmdbProxy = async (type: 'movie' | 'tv', id: number, season?: number, episode?: number): Promise<TmdbProxyResponse | null> => {
    try {
        let url = `/api/movix-proxy?path=tmdb/${type}/${id}`;
        if (season && episode) {
            url += `?season=${season}&episode=${episode}`;
        }

        const { data } = await axios.get<TmdbProxyResponse>(url);

        console.log('TMDB Proxy API Response:', {
            type,
            id,
            season,
            episode,
            links: data.player_links?.length || 0
        });

        return data;
    } catch (error) {
        console.error('Erreur lors de la récupération des données TMDB Proxy:', error);
        return null;
    }
};

export const useTmdbProxy = (type: 'movie' | 'tv', id: number, season?: number, episode?: number) => {
    return useQuery({
        queryKey: ['tmdb-proxy', type, id, season, episode],
        queryFn: () => fetchTmdbProxy(type, id, season, episode),
        enabled: !!id && (type === 'movie' || (type === 'tv' && !!season && !!episode)),
        staleTime: 5 * 60 * 1000,
        retry: 1,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
    });
};

export const useTmdbProxyLinks = (type: 'movie' | 'tv', id: number, season?: number, episode?: number) => {
    const { data, isLoading } = useTmdbProxy(type, id, season, episode);

    const luluvidLinks = (data?.player_links || []).filter(link =>
        link.decoded_url.includes('luluvid') || link.decoded_url.includes('lulustream')
    );

    return {
        data: luluvidLinks,
        isLoading,
        hasLinks: luluvidLinks.length > 0
    };
};
