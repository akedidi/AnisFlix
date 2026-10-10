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

                // Find the best match - prioritize exact matches
                let match = null;

                // For Attack on Titan, explicitly look for "Shingeki no Kyojin" (not Junior High)
                if (isAOT) {
                    match = data.find((item: any) => item.name.toLowerCase() === 'shingeki no kyojin');
                    console.log('🔍 [MOVIX ANIME] AOT specific match:', match?.name);
                }

                // Fallback to general matching
                if (!match) {
                    match = data.find((item: any) => {
                        const itemName = item.name.toLowerCase();
                        const searchLower = searchTitle.toLowerCase();
                        const titleLower = title.toLowerCase();
                        return itemName === searchLower || itemName === titleLower;
                    });
                }

                // Last resort: partial match (excluding Junior High variants)
                if (!match) {
                    match = data.find((item: any) => {
                        const itemName = item.name.toLowerCase();
                        if (itemName.includes('junior') || itemName.includes('high-school')) return false;
                        const searchLower = searchTitle.toLowerCase();
                        const titleLower = title.toLowerCase();
                        return itemName.includes(searchLower) || itemName.includes(titleLower);
                    });
                }


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
    tmdbSeries: any, // Added TMDB series info for absolute episode calculation
    seasonNumber: number,
    episodeNumber: number,
    seriesId: number
) => {
    console.log('🎯 [EXTRACT VIDMOLY] Called with:', { anime: anime?.name, seasonNumber, episodeNumber, seriesId });

    if (!anime || !anime.seasons) {
        console.log('🎯 [EXTRACT VIDMOLY] No anime or seasons data');
        return [];
    }

    console.log('🎯 [EXTRACT VIDMOLY] Available seasons:', anime.seasons.map(s => s.name));

    let targetSeason: Season | undefined;
    let targetEpisode: Episode | undefined;

    // Specific mapping for Attack on Titan (ID 1429)
    // TMDB S4 is 30 eps via episode groups: Part1 1-16, Part2 17-28, Final Chapters 29-30.
    // Raw TMDB still lists Final Chapters under Specials as S0E36/E37 — keep that fallback.
    if (seriesId === 1429) {
        if (seasonNumber === 4) {
            if (episodeNumber <= 16) {
                targetSeason = anime.seasons.find(s => s.name === 'Saison 4 partie 1');
                targetEpisode = targetSeason?.episodes.find(e => e.index === episodeNumber || e.name.includes(String(episodeNumber).padStart(2, '0')));
            } else if (episodeNumber <= 28) {
                targetSeason = anime.seasons.find(s => s.name === 'Saison 4 partie 2');
                const offsetEpisode = episodeNumber - 16;
                targetEpisode = targetSeason?.episodes.find(e => e.index === offsetEpisode || e.name.includes(String(offsetEpisode).padStart(2, '0')));
            } else if (episodeNumber === 29) {
                targetSeason = anime.seasons.find(s => s.name === 'Saison 4 partie 3');
                targetEpisode = targetSeason?.episodes[0];
            } else if (episodeNumber === 30) {
                targetSeason = anime.seasons.find(s => s.name === 'Saison 4 partie 4');
                targetEpisode = targetSeason?.episodes[0];
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

    // Fallback: Absolute Episode Search (if specific season/episode not found and it's a regular season)
    if (!targetEpisode && seasonNumber > 0 && tmdbSeries && tmdbSeries.seasons) {
        // Calculate absolute number from TMDB info
        // Sum episodes of all previous seasons (ignoring Specials/Season 0)
        const previousSeasons = tmdbSeries.seasons.filter((s: any) => s.season_number > 0 && s.season_number < seasonNumber) || [];
        const previousEpisodeCount = previousSeasons.reduce((acc: number, s: any) => acc + Number(s.episode_count || 0), 0);
        const absoluteEpisodeNumber = previousEpisodeCount + episodeNumber;

        console.log(`🎯 [EXTRACT VIDMOLY] Absolute search fallback: S${seasonNumber}E${episodeNumber} (Abs: ${absoluteEpisodeNumber}). PrevSeasons: ${previousSeasons.length}, PrevCount: ${previousEpisodeCount}`);

        // Search in ALL extracted seasons (Movix might put them in "Season 1" or "Unknown")
        for (const s of anime.seasons) {
            const match = s.episodes.find(e =>
                e.index === absoluteEpisodeNumber ||
                e.name.includes(String(absoluteEpisodeNumber).padStart(2, '0')) || // Matches "02", "153"
                (absoluteEpisodeNumber > 0 && e.name.toLowerCase().includes(`episode ${absoluteEpisodeNumber}`)) // Explicit "Episode N"
            );

            if (match) {
                console.log('🎯 [EXTRACT VIDMOLY] Found absolute match in', s.name, ':', match.name);
                targetEpisode = match;
                break;
            }
        }
    }

    console.log('🎯 [EXTRACT VIDMOLY] Target season found:', targetSeason?.name);
    console.log('🎯 [EXTRACT VIDMOLY] Target episode found:', targetEpisode?.name, 'index:', targetEpisode?.index);

    if (!targetEpisode || !targetEpisode.streaming_links) {
        console.log('🎯 [EXTRACT VIDMOLY] No target episode or streaming_links found');
        return [];
    }

    console.log('🎯 [EXTRACT VIDMOLY] Episode streaming_links:', targetEpisode.streaming_links);

    const sources: any[] = [];

    targetEpisode.streaming_links.forEach(link => {
        const language = link.language.toUpperCase(); // VF or VOSTFR

        link.players.forEach((playerUrl, idx) => {
            // Check for vidmoly
            if (playerUrl.includes('vidmoly')) {
                // Transform .to to .net
                const transformedUrl = playerUrl.replace('vidmoly.to', 'vidmoly.net');
                console.log('🎯 [EXTRACT VIDMOLY] Found VidMoly link:', playerUrl, '-> transformed:', transformedUrl);

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

    console.log('🎯 [EXTRACT VIDMOLY] Final sources:', sources);
    return sources;
};

