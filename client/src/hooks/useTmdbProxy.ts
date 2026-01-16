import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

interface TmdbProxyLink {
    decoded_url: string;
    quality: string;
    language?: string;
}

interface TmdbProxyResponse {
    player_links?: TmdbProxyLink[];
    current_episode?: {
        player_links?: TmdbProxyLink[];
    };
}

const fetchTmdbProxy = async (type: 'movie' | 'tv', id: number, season?: number, episode?: number): Promise<TmdbProxyResponse | null> => {
    try {
        let url = `/api/movix-proxy?path=tmdb/${type}/${id}`;
        if (season && episode) {
            url += `&season=${season}&episode=${episode}`;
        }

        const { data } = await axios.get<TmdbProxyResponse>(url);

        console.log('TMDB Proxy API Response:', {
            type,
            id,
            season,
            episode,
            rootLinks: data.player_links?.length || 0,
            episodeLinks: data.current_episode?.player_links?.length || 0
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

    // Check both root player_links (Movies) and current_episode.player_links (Series)
    const allLinks = data?.current_episode?.player_links || data?.player_links || [];

    const luluvidLinks = allLinks.filter(link =>
        link.decoded_url.includes('luluvid') || link.decoded_url.includes('lulustream')
    );

    return {
        data: luluvidLinks,
        isLoading,
        hasLinks: luluvidLinks.length > 0
    };
};
