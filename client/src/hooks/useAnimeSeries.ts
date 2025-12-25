import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { movixProxy } from '@/lib/movixProxy';

interface AnimeEpisode {
  name: string;
  serie_name: string;
  season_name: string;
  index: number;
  streaming_links: {
    language: string;
    players: string[];
  }[];
}

interface AnimeSeason {
  name: string;
  episodes: AnimeEpisode[];
  episodeCount: number;
  cacheFile: string;
  timestamp: number;
}

interface AnimeSeriesData {
  url: string;
  name: string;
  image: string;
  alternative_names: string[];
  alternative_names_string: string;
  seasons: AnimeSeason[];
}

const fetchAnimeSeries = async (title: string): Promise<AnimeSeriesData | null> => {
  console.log('🚀 fetchAnimeSeries - DÉBUT avec titre:', title);

  try {
    // Utiliser le titre complet pour la recherche Movix
    console.log('🔍 fetchAnimeSeries - Titre complet pour recherche:', title);

    // Utiliser l'API Movix avec le titre complet
    console.log('🔍 fetchAnimeSeries - Appel API Movix...');
    const data = await movixProxy.searchAnime(title, true, true);
    console.log('🔍 fetchAnimeSeries - Réponse API Movix:', data);

    if (data && Array.isArray(data) && data.length > 0) {
      // L'API anime/search retourne directement un tableau avec les données complètes
      const animeSeries = data[0];
      console.log('🔍 fetchAnimeSeries - Série anime trouvée:', animeSeries);
      console.log('🔍 fetchAnimeSeries - Saisons disponibles:', animeSeries.seasons);
      console.log('🔍 fetchAnimeSeries - Nombre de saisons:', animeSeries.seasons?.length);

      // Utiliser les vraies données de l'API Movix avec les liens VidMoly
      const animeData: AnimeSeriesData = {
        name: animeSeries.name,
        seasons: animeSeries.seasons || []
      };

      console.log('🔍 fetchAnimeSeries - Structure avec vraies données VidMoly:', animeData);
      console.log('🔍 fetchAnimeSeries - Première saison:', animeData.seasons[0]);
      console.log('🔍 fetchAnimeSeries - Premier épisode:', animeData.seasons[0]?.episodes[0]);
      return animeData;
    }

    // Si aucun résultat trouvé, retourner null
    console.log('🔍 fetchAnimeSeries - Aucune série anime trouvée pour:', title);
    return null;
  } catch (error) {
    console.error('❌ fetchAnimeSeries - ERREUR lors de la récupération des données anime:', error);
    console.error('❌ fetchAnimeSeries - Type d\'erreur:', typeof error);
    console.error('❌ fetchAnimeSeries - Message d\'erreur:', error?.message);
    return null;
  }
};

export const useAnimeSeries = (title: string, enabled: boolean = true) => {
  console.log('🔍 useAnimeSeries - Appelé avec:', { title, enabled });
  console.log('🔍 useAnimeSeries - enabled && !!title:', enabled && !!title);
  console.log('🔍 useAnimeSeries - title existe?', !!title);
  console.log('🔍 useAnimeSeries - enabled:', enabled);

  const query = useQuery({
    queryKey: ['anime-series', title],
    queryFn: () => fetchAnimeSeries(title),
    enabled: enabled && !!title,
    staleTime: 1000 * 60 * 60, // 1 heure de cache
    cacheTime: 1000 * 60 * 60, // 1 heure de cache
    retry: 1,
    refetchOnMount: false, // Pas de refetch au montage
    refetchOnWindowFocus: false, // Pas de refetch au focus
    refetchOnReconnect: false, // Pas de refetch sur reconnexion
  });

  return query;
};

// Hook pour extraire les liens VidMoly d'une série anime
export const useAnimeVidMolyLinks = (title: string, seasonNumber: number, episodeNumber: number, enabled: boolean = true): {
  data: any;
  isLoading: boolean;
  error: any;
  hasVidMolyLinks: boolean;
} => {
  console.log('🔍 useAnimeVidMolyLinks - Appelé avec:', { title, seasonNumber, episodeNumber, enabled });

  const { data: animeData, isLoading, error, isFetching, isStale } = useAnimeSeries(title, enabled);

  console.log('🔍 useAnimeVidMolyLinks - animeData:', animeData);
  console.log('🔍 useAnimeVidMolyLinks - isLoading:', isLoading);
  console.log('🔍 useAnimeVidMolyLinks - isFetching:', isFetching);
  console.log('🔍 useAnimeVidMolyLinks - isStale:', isStale);
  console.log('🔍 useAnimeVidMolyLinks - error:', error);
  console.log('🔍 useAnimeVidMolyLinks - animeData existe?', !!animeData);
  console.log('🔍 useAnimeVidMolyLinks - animeData.seasons existe?', !!animeData?.seasons);

  const [vidmolyLinks, setVidmolyLinks] = useState({
    vf: [] as any[],
    vostfr: [] as any[]
  });

  const [isLoadingVidMoly, setIsLoadingVidMoly] = useState(false);

  useEffect(() => {
    if (!animeData?.seasons) return;

    const processVidMolyLinks = async () => {
      console.log('🔍 useAnimeVidMolyLinks - DÉBUT du traitement VidMoly');
      setIsLoadingVidMoly(true);

      console.log('🔍 useAnimeVidMolyLinks - Saisons trouvées:', animeData.seasons);
      console.log('🔍 useAnimeVidMolyLinks - Recherche saison numéro:', seasonNumber);
      console.log('🔍 useAnimeVidMolyLinks - Noms des saisons:', animeData.seasons.map(s => s.name));

      const season = animeData.seasons.find(s =>
        s.name.toLowerCase().includes(`saison ${seasonNumber}`) ||
        s.name.toLowerCase().includes(`season ${seasonNumber}`)
      );

      console.log('🔍 useAnimeVidMolyLinks - Saison trouvée:', season);

      if (season) {
        const episode = season.episodes.find(e => e.index === episodeNumber || e.name.includes(String(episodeNumber).padStart(2, '0')));

        if (episode) {
          console.log('🔍 useAnimeVidMolyLinks - Épisode trouvé:', episode);
          console.log('🔍 useAnimeVidMolyLinks - Streaming links:', episode.streaming_links);

          const newVidmolyLinks = {
            vf: [] as any[],
            vostfr: [] as any[]
          };

          // Collecter tous les liens VidMoly de tous les streaming_links
          const allVidMolyPlayers: { url: string; language: string }[] = [];

          episode.streaming_links?.forEach(link => {
            console.log('🔍 useAnimeVidMolyLinks - Traitement link:', link.language, link.players);

            const vidmolyPlayers = link.players.filter((playerUrl: string) =>
              playerUrl.includes('vidmoly')
            );

            console.log('🔍 useAnimeVidMolyLinks - Players VidMoly trouvés:', vidmolyPlayers);

            vidmolyPlayers.forEach(playerUrl => {
              allVidMolyPlayers.push({
                url: playerUrl.replace('vidmoly.to', 'vidmoly.net'),
                language: link.language
              });
            });
          });

          console.log('🔍 useAnimeVidMolyLinks - Total liens VidMoly à traiter:', allVidMolyPlayers.length);

          // Traiter TOUS les liens VidMoly en parallèle d'un coup
          const allVidMolyPromises = allVidMolyPlayers.map(async (player) => {
            console.log('🔄 URL normalisée:', player.url);

            try {
              console.log('🎬 Extraction m3u8 pour VidMoly:', player.url);
              console.log('🔍 URL VidMoly originale:', player.url);
              console.log('🔍 Language:', player.language);

              const { apiClient } = await import('../lib/apiClient');
              const data = await apiClient.extractVidMoly(player.url);

              console.log('🔍 Réponse complète API VidMoly:', data);

              if (data.success && data.m3u8Url) {
                console.log('✅ Utilisation du m3u8 extrait:', data.m3u8Url);
                return {
                  url: data.m3u8Url,
                  language: player.language
                };
              } else {
                console.log('❌ Échec extraction m3u8:', data.error);
                return {
                  url: player.url, // Fallback vers l'URL originale
                  language: player.language
                };
              }
            } catch (error) {
              console.error('❌ Erreur extraction VidMoly:', error);
              return {
                url: player.url, // Fallback vers l'URL originale
                language: player.language
              };
            }
          });

          // Attendre TOUS les résultats d'un coup
          const allResults = await Promise.all(allVidMolyPromises);

          // Ajouter tous les résultats valides d'un coup
          allResults.forEach(result => {
            if (result) {
              if (result.language === 'vf') {
                newVidmolyLinks.vf.push(result);
              } else if (result.language === 'vostfr') {
                newVidmolyLinks.vostfr.push(result);
              }
            }
          });

          setVidmolyLinks(newVidmolyLinks);
          setIsLoadingVidMoly(false);
        } else {
          console.log('⚠️ useAnimeVidMolyLinks - Épisode non trouvé:', episodeNumber);
          setIsLoadingVidMoly(false);
        }
      } else {
        setIsLoadingVidMoly(false);
      }
    };
  };

  processVidMolyLinks();
}, [animeData, seasonNumber, episodeNumber]);

// Recalculer hasVidMolyLinks à chaque changement de vidmolyLinks
const hasVidMolyLinks = vidmolyLinks.vf.length > 0 || vidmolyLinks.vostfr.length > 0;

console.log('🔍 useAnimeVidMolyLinks - hasVidMolyLinks recalculé:', hasVidMolyLinks, 'vf:', vidmolyLinks.vf.length, 'vostfr:', vidmolyLinks.vostfr.length);

return {
  data: vidmolyLinks,
  isLoading: isLoading || isLoadingVidMoly,
  error,
  hasVidMolyLinks
};
};
