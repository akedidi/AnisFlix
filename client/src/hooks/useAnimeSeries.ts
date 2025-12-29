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
  const { data: animeData, isLoading, error } = useAnimeSeries(title, enabled);

  const [vidmolyLinks, setVidmolyLinks] = useState({
    vf: [] as any[],
    vostfr: [] as any[]
  });

  const [isLoadingVidMoly, setIsLoadingVidMoly] = useState(false);

  // Ref to track processed key and prevent duplicate calls
  const lastProcessedKey = React.useRef<string | null>(null);
  const isProcessing = React.useRef(false);

  useEffect(() => {
    if (!animeData?.seasons) return;

    // Create a unique key for this request
    const requestKey = `${title}-${seasonNumber}-${episodeNumber}`;

    // Skip if already processed or currently processing
    if (lastProcessedKey.current === requestKey || isProcessing.current) {
      console.log('🔄 useAnimeVidMolyLinks - Skipping duplicate call for:', requestKey);
      return;
    }

    const processVidMolyLinks = async () => {
      isProcessing.current = true;
      console.log('🔍 useAnimeVidMolyLinks - Processing:', requestKey);
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
          // NO extraction here - just collect embed URLs, extraction happens on click (like Vidzy)
          episode.streaming_links?.forEach(link => {
            const vidmolyPlayers = link.players.filter((playerUrl: string) =>
              playerUrl.includes('vidmoly')
            );

            vidmolyPlayers.forEach(playerUrl => {
              const normalizedUrl = playerUrl.replace('vidmoly.to', 'vidmoly.net');
              if (link.language === 'vf') {
                newVidmolyLinks.vf.push({ url: normalizedUrl, language: 'vf' });
              } else if (link.language === 'vostfr') {
                newVidmolyLinks.vostfr.push({ url: normalizedUrl, language: 'vostfr' });
              }
            });
          });

          console.log('🔍 useAnimeVidMolyLinks - VidMoly links collected (no extraction):', {
            vf: newVidmolyLinks.vf.length,
            vostfr: newVidmolyLinks.vostfr.length
          });

          setVidmolyLinks(newVidmolyLinks);
          setIsLoadingVidMoly(false);
          lastProcessedKey.current = requestKey;
          isProcessing.current = false;
        } else {
          console.log('⚠️ useAnimeVidMolyLinks - Épisode non trouvé:', episodeNumber);
          setIsLoadingVidMoly(false);
          isProcessing.current = false;
        }
      } else {
        setIsLoadingVidMoly(false);
        isProcessing.current = false;
      }
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
