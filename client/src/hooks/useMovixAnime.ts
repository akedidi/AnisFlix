import { useQuery } from '@tanstack/react-query';
import { movixProxy } from '@/lib/movixProxy';

interface Player {
    language: string;
    players: string[];
}

interface Episode {
    name: string;
    index: number | null;
    streaming_links: Player[];
}

interface Season {
    name: string;
    index: number | null;
    episodes: Episode[];
}

interface Anime {
    name: string;
    seasons: Season[];
}

export const useMovixAnime = (title: string | undefined, seriesId: number) => {
    return useQuery({
        queryKey: ['movix-anime', seriesId, title],
        queryFn: async () => {
            if (!title) return null;

            try {
                // Clean title for better matching. 
                // For Attack on Titan, "Shingeki no Kyojin" is the best match in Movix.
                const isAOT = seriesId === 1429 || title.toLowerCase().includes('attaque des titans') || title.toLowerCase().includes('shingeki no kyojin');
                const searchTitle = isAOT ? 'L\'Attaque des Titans' : title.split(':')[0].trim();

                console.log('🔍 [MOVIX ANIME] Searching for:', searchTitle);

                const data = await movixProxy.searchAnime(searchTitle, true, true);

                if (!Array.isArray(data)) {
                    console.log('⚠️ [MOVIX ANIME] Response is not an array:', data);
                    return null;
                }

                // Find the best match
                const match = data.find((item: any) => {
                    const itemName = item.name.toLowerCase();
                    const searchLower = searchTitle.toLowerCase();
                    const titleLower = title.toLowerCase();

                    if (isAOT && (itemName === 'shingeki no kyojin' || itemName.includes('attaque des titans'))) return true;
                    return itemName === searchLower || itemName.includes(searchLower) || itemName === titleLower || itemName.includes(titleLower);
                });

                if (!match) {
                    console.log('⚠️ [MOVIX ANIME] No match found for:', searchTitle);
                    return null;
                }

                console.log('✅ [MOVIX ANIME] Found match:', match.name);
                return match as Anime;
            } catch (error) {
                console.error('❌ [MOVIX ANIME] Error fetching anime data:', error);
                return null;
            }
        },
        enabled: !!title,
        staleTime: 10 * 60 * 1000,
    });
};

export const extractVidMolyFromAnime = (
    anime: Anime | null | undefined,
    seasonNumber: number,
    episodeNumber: number,
    seriesId: number
) => {
    if (!anime || !anime.seasons) return [];

    let targetSeason: Season | undefined;
    let targetEpisode: Episode | undefined;

    // Specific mapping for Attack on Titan (ID 1429)
    if (seriesId === 1429) {
        if (seasonNumber === 4) {
            if (episodeNumber <= 16) {
                targetSeason = anime.seasons.find(s => s.name === 'Saison 4 partie 1');
                targetEpisode = targetSeason?.episodes.find(e => e.index === episodeNumber || e.name.includes(String(episodeNumber).padStart(2, '0')));
            } else {
                targetSeason = anime.seasons.find(s => s.name === 'Saison 4 partie 2');
                const offsetEpisode = episodeNumber - 16;
                targetEpisode = targetSeason?.episodes.find(e => e.index === offsetEpisode || e.name.includes(String(offsetEpisode).padStart(2, '0')));
            }
        } else if (seasonNumber === 0) {
            // Specials
            if (episodeNumber === 36) {
                targetSeason = anime.seasons.find(s => s.name === 'Saison 4 partie 3');
                targetEpisode = targetSeason?.episodes[0];
            } else if (episodeNumber === 37) {
                targetSeason = anime.seasons.find(s => s.name === 'Saison 4 partie 4');
                targetEpisode = targetSeason?.episodes[0];
            } else {
                // Other specials might be in "OAV" season
                targetSeason = anime.seasons.find(s => s.name === 'OAV');
                targetEpisode = targetSeason?.episodes.find(e => e.index === episodeNumber || e.name.includes(String(episodeNumber).padStart(2, '0')));
            }
        } else {
            // Seasons 1, 2, 3
            targetSeason = anime.seasons.find(s => s.name === `Saison ${seasonNumber}`);
            targetEpisode = targetSeason?.episodes.find(e => e.index === episodeNumber || e.name.includes(String(episodeNumber).padStart(2, '0')));
        }
    } else {
        // Generic mapping
        targetSeason = anime.seasons.find(s =>
            s.index === seasonNumber ||
            s.name.includes(`Saison ${seasonNumber}`) ||
            (seasonNumber === 0 && (s.name.toLowerCase().includes('oav') || s.name.toLowerCase().includes('special')))
        );

        if (targetSeason) {
            targetEpisode = targetSeason.episodes.find(e =>
                e.index === episodeNumber ||
                e.name.includes(String(episodeNumber).padStart(2, '0'))
            );
        }
    }

    if (!targetEpisode || !targetEpisode.streaming_links) return [];

    const sources: any[] = [];

    targetEpisode.streaming_links.forEach(link => {
        const language = link.language.toUpperCase(); // VF or VOSTFR

        link.players.forEach((playerUrl, idx) => {
            // Check for vidmoly
            if (playerUrl.includes('vidmoly')) {
                // Transform .to to .net
                const transformedUrl = playerUrl.replace('vidmoly.to', 'vidmoly.net');

                sources.push({
                    id: `movix-anime-vidmoly-${language}-${idx}`,
                    name: `VidMoly ${language}`,
                    provider: 'VidMoly',
                    url: transformedUrl,
                    type: 'embed',
                    isVidMoly: true,
                    language: language,
                    quality: 'HD'
                });
            }
        });
    });

    return sources;
};
