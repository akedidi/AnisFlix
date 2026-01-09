import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { IonPage } from '@ionic/react';
import NativeHeader from "@/components/NativeHeader";
import { useRouteParams } from "@/hooks/useRouteParams";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, Calendar, X, Heart, Play } from "lucide-react";
import MediaCarousel from "@/components/MediaCarousel";
import VideoPlayer from "@/components/VideoPlayer";
import VidMolyPlayer from "@/components/VidMolyPlayer";
import DarkiPlayer from "@/components/DarkiPlayer";
import StreamingSources from "@/components/StreamingSources";
import WatchProviders from "@/components/WatchProviders";
import CommonLayout from "@/components/CommonLayout";
import { useSeriesDetails, useSeriesVideos, useSeasonDetails, useSimilarSeries, useMultiSearch, useMovixPlayerLinks } from "@/hooks/useTMDB";
import { useUniversalVOSources } from "@/hooks/useUniversalVOSources";
import { useAfterDarkSources } from "@/hooks/useAfterDarkSources";
import { useMovixAnime, extractVidMolyFromAnime } from "@/hooks/useMovixAnime";
import { useMovixTmdbSeriesSources } from "@/hooks/useMovixTmdbSeriesSources";

import { getImageUrl, tmdb } from "@/lib/tmdb";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { getSeriesStream, extractVidzyM3u8 } from "@/lib/movix";
import { useFavorites } from "@/hooks/useFavorites";
import { useWatchProgress } from "@/hooks/useWatchProgress";
import { useKeyboardNavigation } from "@/hooks/useKeyboardNavigation";
import { navPaths } from "@/lib/nativeNavigation";
import { useAppNavigation } from "@/lib/useAppNavigation";
import { cn, formatDuration } from "@/lib/utils";

// Convert ISO country code to flag emoji
const getCountryFlag = (countryCode: string): string => {
  const code = countryCode.toUpperCase();
  const flag = code.split('').map(char => String.fromCodePoint(0x1F1E6 + char.charCodeAt(0) - 65)).join('');
  return flag;
};

export default function SeriesDetail() {
  const { id } = useRouteParams<{ id: string }>();
  const { navigate } = useAppNavigation();
  const [selectedEpisode, setSelectedEpisode] = useState<number | null>(null);
  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState<number>(1);
  const [selectedSource, setSelectedSource] = useState<{ url: string; type: "m3u8" | "mp4" | "embed"; name: string; isVidMoly?: boolean; isDarki?: boolean; quality?: string; language?: string; tracks?: Array<{ file: string; label: string; kind?: string }>; provider?: string } | null>(null);
  const [isLoadingSource, setIsLoadingSource] = useState(false);
  const seriesId = parseInt(id || "0");
  const { t } = useLanguage();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { getMediaProgress } = useWatchProgress();
  // Réinitialiser la source quand l'épisode ou la saison change
  useEffect(() => {
    setSelectedSource(null);
  }, [selectedEpisode, selectedSeasonNumber]);
  // Nettoyer l'état quand la série change
  useEffect(() => {
    setSelectedSource(null);
    setIsLoadingSource(false);
    setSelectedEpisode(null);
    setSelectedSeasonNumber(1);
  }, [seriesId]);
  // Fermer la liste des épisodes quand on change de saison
  useEffect(() => {
    setSelectedEpisode(null);
  }, [selectedSeasonNumber]);
  // Debug: Log quand un épisode est sélectionné
  useEffect(() => {
    if (selectedEpisode) {
      console.log('🔍 Episode sélectionné:', selectedEpisode, 'selectedSource:', selectedSource);
    }
  }, [selectedEpisode, selectedSource]);
  // Fetch data from TMDB
  const { data: series, isLoading: isLoadingSeries } = useSeriesDetails(seriesId);

  // Sort seasons: Regular seasons first (1, 2, ...), then Specials (0) at the end
  const sortedSeasons = series?.seasons
    ?.filter((s: any) => s.season_number >= 0)
    .sort((a: any, b: any) => {
      const numA = Number(a.season_number);
      const numB = Number(b.season_number);

      // If both are 0, equal
      if (numA === 0 && numB === 0) return 0;
      // If a is 0, it goes after b (return 1)
      if (numA === 0) return 1;
      // If b is 0, it goes after a (return -1)
      if (numB === 0) return -1;
      // Otherwise regular ascending sort
      return numA - numB;
    }) || [];

  // Determine the first available season from the sorted list
  const firstAvailableSeason = sortedSeasons.length > 0 ? sortedSeasons[0].season_number : 1;

  // Update initial season when series loads
  useEffect(() => {
    if (series && !isLoadingSeries) {
      setSelectedSeasonNumber(firstAvailableSeason);
    }
  }, [series, isLoadingSeries]);

  const [additionalProviders, setAdditionalProviders] = useState<any>(null);

  // Fallback for watch providers if proxy misses them
  useEffect(() => {
    if (series && !isLoadingSeries && !series["watch/providers"]) {
      console.log('⚠️ Proxy missed watch providers, fetching independently...');
      tmdb.getSeriesProviders(seriesId)
        .then(res => setAdditionalProviders(res))
        .catch(err => console.error('Failed to fetch fallback providers', err));
    }
  }, [series, isLoadingSeries, seriesId]);

  const { data: videos } = useSeriesVideos(seriesId);
  // Ensure we only fetch season details AFTER the series has been loaded and processed
  // This allows the useSeriesDetails hook to populate the virtualSeasonsCache first!
  const { data: seasonDetails, isLoading: isLoadingSeason, error: seasonError } = useSeasonDetails(seriesId, selectedSeasonNumber, { enabled: !!series });

  // Debug Season 0
  useEffect(() => {
    if (selectedSeasonNumber === 0) {
      console.log('🔍 [DEBUG SEASON 0] Loading:', isLoadingSeason);
      console.log('🔍 [DEBUG SEASON 0] Error:', seasonError);
      console.log('🔍 [DEBUG SEASON 0] Details:', seasonDetails);
      if (seasonDetails?.episodes) {
        console.log('🔍 [DEBUG SEASON 0] Episodes:', seasonDetails.episodes.length);
        console.log('🔍 [DEBUG SEASON 0] First episode:', seasonDetails.episodes[0]);
      }
    }
  }, [selectedSeasonNumber, seasonDetails, isLoadingSeason, seasonError]);

  const { data: similarSeries = [] } = useSimilarSeries(seriesId);
  // Fetch Movix player links
  const { data: movixLinks, isLoading: isLoadingMovixLinks } = useMovixPlayerLinks(
    series?.imdb_id || null,
    'tv'
  );

  // Calculate relative episode number (index + 1) to handle absolute ordering (e.g. One Piece ep 422 -> S13E1)
  const relativeEpisode = useMemo(() => {
    if (!seasonDetails?.episodes || !selectedEpisode) return selectedEpisode;
    // Find the episode in the current season list
    const episodeIndex = seasonDetails.episodes.findIndex((e: any) => e.episode_number === selectedEpisode);
    if (episodeIndex !== -1) {
      console.log(`🔢 [Episode Calc] Map absolute ${selectedEpisode} to relative ${episodeIndex + 1}`);
      return episodeIndex + 1;
    }
    return selectedEpisode;
  }, [seasonDetails, selectedEpisode]);

  // Fetch UniversalVO sources
  const { data: universalVOSources, isLoading: isLoadingUniversalVOSources } = useUniversalVOSources(
    'tv',
    seriesId,
    selectedSeasonNumber,
    relativeEpisode || undefined
  );

  const { data: afterDarkSources, isLoading: isLoadingAfterDark } = useAfterDarkSources(
    'tv',
    seriesId,
    series?.name,
    undefined, // year not needed for TV
    undefined, // originalTitle not needed
    selectedSeasonNumber,
    relativeEpisode || undefined
  );



  // Fetch AnimeAPI sources for Animation genre
  // Use relativeEpisode in queryKey to trigger refetch when it changes
  const { data: animeAPISources, isLoading: isLoadingAnimeAPI } = useQuery({
    queryKey: ['anime-api-sources', seriesId, selectedSeasonNumber, relativeEpisode],
    queryFn: async () => {
      // Check if this is an animation (genre ID: 16)
      const isAnimation = series?.genres?.some((g: any) => g.id === 16);

      if (!isAnimation || !selectedEpisode) {
        return [];
      }

      // Get English title from TMDB (original_name is often Japanese for anime)
      try {
        const tmdbResponse = await fetch(
          `https://api.themoviedb.org/3/tv/${seriesId}?api_key=68e094699525b18a70bab2f86b1fa706&language=en-US`
        );
        const tmdbData = await tmdbResponse.json();
        const englishTitle = tmdbData.name || series.original_name;

        console.log(`🎌 [AnimeAPI] Fetching: ${englishTitle} S${selectedSeasonNumber}E${selectedEpisode}`);

        const params = new URLSearchParams({
          path: 'anime-api',
          title: englishTitle,
          season: selectedSeasonNumber.toString(),
          episode: relativeEpisode.toString(), // Send relative episode number (e.g. 1 instead of 422)
          tmdbId: seriesId.toString(),
        });

        const response = await fetch(`/api/movix-proxy?${params}`);
        const data = await response.json();

        if (!data.success || !data.results) {
          return [];
        }

        console.log(`🎌 [AnimeAPI] Found ${data.results.length} sources`);
        console.log(`🎌 [AnimeAPI] First source tracks:`, data.results[0]?.tracks);
        return data.results;
      } catch (error) {
        console.error('[AnimeAPI] Error:', error);
        return [];
      }
    },
    enabled: !!series && !!selectedEpisode,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch Movix Anime sources
  const { data: movixAnime, isLoading: isLoadingMovixAnime, error: movixAnimeError } = useMovixAnime(series?.name, seriesId);

  // Fetch Movix TMDB sources (Vidzy/VidMoly) - only when episode is selected
  const { data: movixTmdbSeries, isLoading: isLoadingMovixTmdbSeries } = useMovixTmdbSeriesSources(
    seriesId,
    selectedSeasonNumber,
    selectedEpisode ? (relativeEpisode || selectedEpisode) : 0 // Pass 0 when no episode selected
  );

  // Debug Movix TMDB Series sources
  useEffect(() => {
    if (movixTmdbSeries?.processedSources?.length) {
      console.log('🎬 [MOVIX TMDB SERIES] Sources:', movixTmdbSeries.processedSources);
    }
  }, [movixTmdbSeries]);

  // Debug Movix Anime
  useEffect(() => {
    console.log('🎬 [DEBUG MOVIX ANIME] Loading:', isLoadingMovixAnime);
    console.log('🎬 [DEBUG MOVIX ANIME] Error:', movixAnimeError);
    console.log('🎬 [DEBUG MOVIX ANIME] Data:', movixAnime);
    if (movixAnime) {
      console.log('🎬 [DEBUG MOVIX ANIME] Seasons:', movixAnime.seasons?.map((s: any) => s.name));
    }
  }, [movixAnime, isLoadingMovixAnime, movixAnimeError]);

  // Log Movix links for debugging (will be removed later)
  if (movixLinks && !isLoadingMovixLinks) {
    console.log('Movix player links for series:', series?.name, movixLinks);
  }
  // Find trailer from videos
  const trailer = videos?.results?.find(
    (video: any) => video.type === "Trailer" && video.site === "YouTube"
  );

  // Navigation au clavier pour contrôler la lecture vidéo
  const isPlayerActive = !!selectedSource;
  // Sources statiques supprimées - on utilise maintenant l'API FStream pour Vidzy
  const episodeSources: any[] = [
    // Movix TMDB sources (Vidzy/VidMoly from tmdb path)
    ...(movixTmdbSeries?.processedSources?.map((source: any, index: number) => ({
      id: `movix-tmdb-${source.provider}-${index}`,
      name: source.quality,
      provider: source.provider === 'vidzy' ? 'Vidzy' : source.provider === 'vidmoly' ? 'VidMoly' : source.provider,
      url: source.url,
      type: 'm3u8' as const,
      isFStream: source.provider === 'vidzy', // Vidzy needs extraction
      isMovixDownload: false,
      isVidMoly: source.provider === 'vidmoly',
      isDarki: source.provider === 'darki',
      isMovixTmdb: true,
      quality: source.quality,
      language: source.language
    })) || []),
    ...(universalVOSources?.files?.map((source: any, index: number) => ({
      id: `universal-${source.provider}-${index}`,
      name: `${source.provider}`,
      provider: source.provider || 'UniversalVO',
      url: source.file,
      type: source.type === 'hls' ? 'm3u8' as const : 'mp4' as const,
      isFStream: false,
      isMovixDownload: false,
      isVidMoly: false,
      isDarki: false,
      isUniversal: true,
      quality: 'HD',
      language: 'VO',
      headers: source.headers
    })) || []),
    ...(afterDarkSources?.sources?.map((source: any, index: number) => ({
      id: `afterdark-${index}`,
      name: source.server || 'AfterDark',
      provider: 'AfterDark',
      url: source.url,
      type: source.type === 'm3u8' ? 'm3u8' as const : 'mp4' as const,
      isFStream: false,
      isMovixDownload: false,
      isVidMoly: false,
      isDarki: false,
      isAfterDark: true,
      quality: source.quality || 'HD',
      language: 'VF'
    })) || []),
    ...(animeAPISources?.map((source: any, index: number) => ({
      id: `animeapi-${index}`,
      name: 'AnimeAPI',
      provider: 'AnimeAPI',
      // Use our internal anime m3u8-proxy (spoofs headers for netmagcdn)
      url: `/api/anime?action=m3u8-proxy&url=${encodeURIComponent(source.url)}`,
      type: source.type === 'hls' ? 'm3u8' as const : 'mp4' as const,
      isFStream: false,
      isMovixDownload: false,
      isVidMoly: false,
      isDarki: false,
      isAnimeAPI: true,
      quality: source.quality || 'HD',
      language: 'VO',
      tracks: source.tracks // Pass subtitles to player
    })) || []),
    ...(extractVidMolyFromAnime(movixAnime, series, selectedSeasonNumber, relativeEpisode || 0, seriesId).map((source: any) => ({
      ...source,
      id: `movix-anime-${source.id}`
    })))
  ];

  // Debug episodeSources
  useEffect(() => {
    console.log('📦 [DEBUG EPISODE SOURCES] Total sources:', episodeSources.length);
    console.log('📦 [DEBUG EPISODE SOURCES] Sources:', episodeSources);
    const vidMolySources = episodeSources.filter((s: any) => s.isVidMoly);
    console.log('📦 [DEBUG EPISODE SOURCES] VidMoly sources:', vidMolySources.length, vidMolySources);
    const animeAPISources = episodeSources.filter((s: any) => s.isAnimeAPI);
    console.log('📦 [DEBUG EPISODE SOURCES] AnimeAPI sources:', animeAPISources.length, animeAPISources);
    if (animeAPISources.length > 0) {
      console.log('📦 [DEBUG EPISODE SOURCES] AnimeAPI first source tracks:', (animeAPISources[0] as any)?.tracks);
    }
  }, [episodeSources, selectedSeasonNumber, selectedEpisode]);

  const handleSourceClick = async (source: {
    url: string;
    type: "m3u8" | "mp4" | "embed";
    name: string;
    isFStream?: boolean;
    isMovixDownload?: boolean;
    isDarki?: boolean;
    isVidMoly?: boolean;
    isAnimeAPI?: boolean;
    quality?: string;
    language?: string;
    tracks?: Array<{ file: string; label: string; kind?: string; default?: boolean }>;
  }) => {
    if (!series || !selectedEpisode) return;
    // Si l'URL est déjà fournie (MovixDownload, Darki ou autres sources directes), on l'utilise directement
    // EXCEPTION: VidMoly et Vidzy (isFStream) doivent passer par l'extraction
    if (source.url && (source.type === "mp4" || source.type === "embed" || source.type === "m3u8" || source.isMovixDownload || source.isDarki || source.isAnimeAPI) && !source.isVidMoly && !source.isFStream) {
      console.log(`🎌 [handleSourceSelect] Setting source with tracks:`, source.tracks);
      setSelectedSource({
        url: source.url,
        type: source.isMovixDownload || source.isDarki || source.isAnimeAPI ? "m3u8" : (source.type === "embed" ? "m3u8" : source.type),
        name: source.name,
        isDarki: source.isDarki,
        quality: source.quality,
        language: source.language,
        tracks: source.tracks // Preserve subtitle tracks
      });
      setIsLoadingSource(false); // Remettre à false pour les sources directes
      return;
    }
    // Pour VidMoly, utiliser directement le lecteur VidMoly qui gère l'extraction
    if (source.isVidMoly) {
      console.log('🎬 Source VidMoly détectée, utilisation du VidMolyPlayer:', source.url);
      setSelectedSource({
        url: source.url, // Lien embed original
        type: "embed",
        name: source.name,
        isVidMoly: true,
        quality: source.quality,
        language: source.language
      });
      setIsLoadingSource(false);
      return;
    }
    // Pour Vidzy (via FStream), on utilise le scraper
    if (source.url && source.type === "m3u8" && source.isFStream) {
      setIsLoadingSource(true);
      try {
        console.log("🎬 Extraction Vidzy pour:", source.url);
        const m3u8Url = await extractVidzyM3u8(source.url);
        console.log("🎬 Résultat extraction Vidzy:", m3u8Url);

        if (!m3u8Url) {
          console.warn("⚠️ Aucun lien m3u8 trouvé pour Vidzy");
          alert("Aucun lien de streaming trouvé pour cette source Vidzy");
          return;
        }

        setSelectedSource({
          url: m3u8Url,
          type: "m3u8",
          name: source.name
        });
        console.log("✅ Source Vidzy chargée avec succès:", m3u8Url);
      } catch (error) {
        console.error("Erreur lors du chargement de la source:", error);
        const errorMessage = error instanceof Error ? error.message : "Erreur lors du chargement de la source";
        alert(`Erreur Vidzy: ${errorMessage}`);
      } finally {
        setIsLoadingSource(false);
      }
      return;
    }
    // Logic moved to StreamingSources.tsx to handle proxy wrapping and extensions
    // We now treat Vixsrc as a standard source
    if ((source as any).isVixsrc && source.url) {
      setSelectedSource({
        url: source.url,
        type: "m3u8",
        name: source.name,
        quality: source.quality,
        language: source.language,
        provider: 'vixsrc'
      });
      setIsLoadingSource(false);
      return;
    }

    // Plus de sources statiques à gérer - toutes les sources viennent des APIs
  };
  const backdropUrl = series?.backdrop_path ? getImageUrl(series.backdrop_path, 'original') : "";
  const handleRefresh = () => {
    window.location.reload();
  };

  if (isLoadingSeries) {
    return (
      <CommonLayout showSearch={true} onRefresh={handleRefresh}>
        <NativeHeader title={t("nav.series")} showBackButton={true} defaultHref="/tabs/home" />
        <div className="container mx-auto px-4 md:px-8 lg:px-12 py-8">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Chargement de la série...</p>
          </div>
        </div>

      </CommonLayout>
    );
  }

  if (!series) {
    return (
      <CommonLayout showSearch={true} onRefresh={handleRefresh}>

        <div className="container mx-auto px-4 md:px-8 lg:px-12 py-8">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Série non trouvée</p>
          </div>
        </div>

      </CommonLayout>
    );
  }

  return (
    <CommonLayout showSearch={true} onRefresh={handleRefresh}>
      <NativeHeader title={series.name} showBackButton={true} defaultHref="/tabs/home" />
      <div className="container mx-auto px-4 md:px-8 lg:px-12 py-8 -mt-12 md:mt-0">
        <div className="grid md:grid-cols-[300px_1fr] gap-8">
          <div className="hidden md:block">
            {series.poster_path && (
              <img
                src={getImageUrl(series.poster_path, 'w500')}
                alt={series.name}
                className="w-full rounded-lg shadow-2xl"
              />
            )}
          </div>
          <div className="space-y-6">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">{series.name}</h1>
              <div className="flex flex-wrap items-center gap-4 mb-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{new Date(series.first_air_date).getFullYear()}</span>
                  <span>•</span>
                  <span>{series.number_of_seasons} Saisons</span>
                  {series.episode_run_time && series.episode_run_time.length > 0 && (
                    <>
                      <span>•</span>
                      <span>{formatDuration(series.episode_run_time[0])}</span>
                    </>
                  )}
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                    <span>{series.vote_average.toFixed(1)}</span>
                  </div>
                </div>
              </div>
              <div className="w-full flex flex-wrap gap-2 mb-6">
                {series.genres?.map((genre: any) => (
                  <Badge key={genre.id} variant="secondary">
                    {genre.name}
                  </Badge>
                ))}
              </div>

              {/* Country of origin */}
              <div className="w-full flex flex-wrap gap-2 mb-6">
                {series.origin_country?.map((countryCode: string) => (
                  <Badge key={countryCode} variant="outline" className="border-blue-500 text-blue-400">
                    {getCountryFlag(countryCode)} {countryCode}
                  </Badge>
                ))}
              </div>

              <WatchProviders providers={series["watch/providers"] || additionalProviders} className="mb-6" />

              <h2 className="text-xl font-semibold mb-3">Synopsis</h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                {series.overview || "Aucun synopsis disponible."}
              </p>
              {/* Boutons d'action */}
              <div className="flex gap-3 mb-6">
                <Button
                  variant={isFavorite(seriesId, 'series') ? "default" : "outline"}
                  size="lg"
                  className="flex items-center gap-2"
                  onClick={() => {
                    if (series) {
                      toggleFavorite({
                        id: seriesId,
                        title: series.name,
                        posterPath: series.poster_path,
                        rating: series.vote_average,
                        year: series.first_air_date ? new Date(series.first_air_date).getFullYear().toString() : '',
                        mediaType: 'series'
                      });
                    }
                  }}
                >
                  <Heart
                    className={`w-5 h-5 ${isFavorite(seriesId, 'series') ? 'fill-current' : ''}`}
                  />
                  {isFavorite(seriesId, 'series') ? 'Retiré des favoris' : 'Ajouter aux favoris'}
                </Button>
              </div>
            </div>
            <Tabs value={`season-${selectedSeasonNumber}`} className="w-full" onValueChange={(value) => {
              const seasonNum = parseInt(value.replace('season-', ''));
              // Si on change de saison et qu'un lecteur est ouvert, le fermer
              if (selectedSeasonNumber !== seasonNum && selectedSource) {
                console.log('🔄 Fermeture du lecteur actuel pour changer de saison');
                setSelectedSource(null);
                setIsLoadingSource(false);
              }
              setSelectedSeasonNumber(seasonNum);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}>
              <TabsList className="flex-wrap h-auto">
                {sortedSeasons.map((season: any) => (
                  <TabsTrigger
                    key={season.id}
                    value={`season-${season.season_number}`}
                    className="min-w-[100px]"
                  >
                    {season.season_number === 0 ? t("detail.specials") : `${t("detail.season")} ${season.season_number}`}
                  </TabsTrigger>
                ))}
              </TabsList>
              {sortedSeasons.map((season: any) => (
                <TabsContent key={season.id} value={`season-${season.season_number}`} className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">{season.season_number === 0 ? t("detail.specials") : `${t("detail.season")} ${season.season_number}`}</h3>
                    <p className="text-muted-foreground mb-4">{season.overview || "Aucune description disponible."}</p>
                    {(() => {
                      const isSelectedSeason = seasonDetails?.season_number === season.season_number;
                      const validEpisodeCount = isSelectedSeason && seasonDetails?.episodes
                        ? seasonDetails.episodes.filter((episode: any) => {
                          if (!episode.air_date) return true;
                          const today = new Date();
                          const year = today.getFullYear();
                          const month = String(today.getMonth() + 1).padStart(2, '0');
                          const day = String(today.getDate()).padStart(2, '0');
                          const todayStr = `${year}-${month}-${day}`;
                          return episode.air_date <= todayStr;
                        }).length
                        : season.episode_count;

                      return (
                        <p className="text-sm text-muted-foreground">{validEpisodeCount} épisode{validEpisodeCount > 1 ? 's' : ''}</p>
                      );
                    })()}
                  </div>
                  {trailer && (
                    <div className="space-y-3">
                      <h3 className="text-lg font-medium">Bande-annonce</h3>
                      <div className="aspect-video max-w-md rounded-lg overflow-hidden bg-muted">
                        <iframe
                          width="100%"
                          height="100%"
                          src={`https://www.youtube.com/embed/${trailer.key}`}
                          title="Trailer"
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Épisodes</h3>
                    {isLoadingSeason && selectedSeasonNumber === season.season_number ? (
                      <div className="flex justify-center p-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {seasonError && selectedSeasonNumber === season.season_number && (
                          <div className="text-center p-8 text-red-500 bg-red-500/10 rounded-lg mb-4">
                            <p>Erreur lors du chargement des épisodes : {seasonError.message || "Erreur inconnue"}</p>
                            <Button variant="outline" size="sm" className="mt-2" onClick={() => window.location.reload()}>
                              Réessayer
                            </Button>
                          </div>
                        )}
                        {seasonDetails?.season_number == season.season_number ? (
                          seasonDetails?.episodes && seasonDetails.episodes.length > 0 ? (
                            seasonDetails.episodes
                              .filter((episode: any) => {
                                if (!episode.air_date) return true;
                                const today = new Date();
                                const year = today.getFullYear();
                                const month = String(today.getMonth() + 1).padStart(2, '0');
                                const day = String(today.getDate()).padStart(2, '0');
                                const todayStr = `${year}-${month}-${day}`;
                                return episode.air_date <= todayStr;
                              })
                              .length === 0 ? (
                              <p className="text-muted-foreground italic">Aucun épisode disponible pour le moment.</p>
                            ) : (
                              seasonDetails.episodes
                                .filter((episode: any) => {
                                  if (!episode.air_date) return true;
                                  const today = new Date();
                                  const year = today.getFullYear();
                                  const month = String(today.getMonth() + 1).padStart(2, '0');
                                  const day = String(today.getDate()).padStart(2, '0');
                                  const todayStr = `${year}-${month}-${day}`;
                                  return episode.air_date <= todayStr;
                                })
                                .map((episode: any) => {
                                  const episodeProgress = getMediaProgress(seriesId, 'tv', selectedSeasonNumber, episode.episode_number);

                                  return (
                                    <Card
                                      key={episode.id}
                                      className="p-4 hover-elevate active-elevate-2 cursor-pointer relative"
                                      onClick={() => {
                                        console.log('🔍 Clic sur épisode:', episode.episode_number);
                                        setSelectedEpisode(episode.episode_number);
                                      }}
                                      data-testid={`card-episode-${episode.episode_number}`}
                                    >
                                      {episodeProgress && episodeProgress.progress > 0 && (
                                        <div className="absolute top-0 left-0 right-0 h-1 bg-red-500 rounded-t-lg"
                                          style={{ width: `${episodeProgress.progress}%` }} />
                                      )}

                                      <div className="flex justify-between items-start gap-4">
                                        {/* Thumbnail Image */}
                                        <div className="relative w-32 sm:w-40 aspect-video flex-shrink-0 bg-muted rounded-md overflow-hidden border border-border/50">
                                          {episode.still_path ? (
                                            <img
                                              src={getImageUrl(episode.still_path, 'w500')}
                                              alt={episode.name}
                                              className="w-full h-full object-cover transition-transform hover:scale-105"
                                              loading="lazy"
                                            />
                                          ) : (
                                            <div className="flex items-center justify-center h-full bg-secondary/50">
                                              <Play className="w-8 h-8 text-muted-foreground/30" />
                                            </div>
                                          )}
                                        </div>

                                        <div className="flex-1">
                                          <h4 className="font-semibold mb-1 line-clamp-1">
                                            {episode.episode_number}. {(episode.name && !episode.name.match(/^(Episode|Épisode|Episodio) \d+$/i) && episode.name !== `Episode ${episode.episode_number}`) ? episode.name : (episode.original_name || episode.name)}
                                          </h4>
                                          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                                            {episode.overview || "Aucune description disponible."}
                                          </p>
                                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            {episode.runtime && (
                                              <span>{episode.runtime} min</span>
                                            )}
                                          </div>
                                        </div>
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            console.log('🔍 Clic sur bouton Play épisode:', episode.episode_number);
                                            if (selectedEpisode !== episode.episode_number && selectedSource) {
                                              console.log('🔄 Fermeture du lecteur actuel pour ouvrir un nouvel épisode');
                                              setSelectedSource(null);
                                              setIsLoadingSource(false);
                                            }
                                            setSelectedEpisode(episode.episode_number);
                                          }}
                                        >
                                          <Play className="w-4 h-4" />
                                        </Button>
                                      </div>
                                      {selectedEpisode === episode.episode_number && (
                                        <div className="mt-4 pt-4 border-t space-y-3">
                                          {!selectedSource ? (
                                            <StreamingSources
                                              type="tv"
                                              id={seriesId}
                                              title={series?.name || ''}
                                              sources={episodeSources}
                                              genres={series?.genres}
                                              onSourceClick={handleSourceClick}
                                              isLoadingSource={isLoadingSource}
                                              isLoadingExternal={isLoadingUniversalVOSources || isLoadingAfterDark || isLoadingAnimeAPI}
                                              season={selectedSeasonNumber}
                                              episode={relativeEpisode || episode.episode_number}
                                              imdbId={series?.external_ids?.imdb_id}
                                            />
                                          ) : (
                                            <div className="space-y-4">
                                              {/* Close button */}
                                              <div className="flex justify-end">
                                                <Button
                                                  variant="ghost"
                                                  size="icon"
                                                  onClick={() => {
                                                    setSelectedSource(null);
                                                    setIsLoadingSource(false);
                                                  }}
                                                  className="text-muted-foreground hover:text-foreground"
                                                >
                                                  <X className="w-5 h-5" />
                                                </Button>
                                              </div>
                                              {selectedSource.isVidMoly ? (

                                                <VidMolyPlayer
                                                  vidmolyUrl={selectedSource.url}
                                                  posterPath={series.backdrop_path}
                                                  title={`${series.name} - S${selectedSeasonNumber}E${episode.episode_number}`}
                                                  onClose={() => {
                                                    console.log('Fermeture lecteur VidMoly');
                                                    setSelectedSource(null);
                                                    setIsLoadingSource(false);
                                                  }}
                                                  mediaId={seriesId}
                                                  mediaType="tv"
                                                  seasonNumber={selectedSeasonNumber}
                                                  episodeNumber={episode.episode_number}
                                                  imdbId={series?.external_ids?.imdb_id}
                                                />
                                              ) : selectedSource.isDarki ? (
                                                <DarkiPlayer
                                                  darkiUrl={selectedSource.url}
                                                  title={`${series.name} - S${selectedSeasonNumber}E${episode.episode_number}`}
                                                  mediaId={seriesId}
                                                  mediaType="tv"
                                                  onClose={() => {
                                                    console.log('Fermeture lecteur Darki');
                                                    setSelectedSource(null);
                                                    setIsLoadingSource(false);
                                                  }}
                                                />
                                              ) : (
                                                <>
                                                  {console.log('🎥 [SeriesDetail] Rendering VideoPlayer with tracks:', (selectedSource as any).tracks)}
                                                  <VideoPlayer
                                                    src={selectedSource.url}
                                                    type={selectedSource.type === "embed" ? "m3u8" : selectedSource.type}
                                                    posterPath={series.backdrop_path}
                                                    title={`${series.name} - S${selectedSeasonNumber}E${episode.episode_number}`}
                                                    onClose={() => {
                                                      console.log('Fermeture lecteur VideoPlayer std');
                                                      setSelectedSource(null);
                                                      setIsLoadingSource(false);
                                                    }}
                                                    mediaId={seriesId}
                                                    mediaType="tv"
                                                    seasonNumber={selectedSeasonNumber}
                                                    episodeNumber={episode.episode_number}
                                                    imdbId={series?.external_ids?.imdb_id}
                                                    tracks={(selectedSource as any).tracks}
                                                    provider={(selectedSource as any).provider}
                                                    hasNextEpisode={(() => {
                                                      // Check if there's a next episode in the same season
                                                      const episodes = seasonDetails?.episodes || [];
                                                      const currentIndex = episodes.findIndex((e: any) => e.episode_number === episode.episode_number);
                                                      if (currentIndex < episodes.length - 1) return true;

                                                      // Check if there's a next season
                                                      const currentSeasonIndex = sortedSeasons.findIndex((s: any) => s.season_number === selectedSeasonNumber);
                                                      return currentSeasonIndex < sortedSeasons.length - 1;
                                                    })()}
                                                  />
                                                </>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </Card>
                                  );
                                })
                            )
                          ) : (
                            <div className="text-center p-4 text-muted-foreground">
                              Aucun épisode disponible pour cette saison.
                            </div>
                          )
                        ) : (
                          <div className="text-center p-4 text-muted-foreground text-sm">
                            Chargement des données de la saison...
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </div>
        {similarSeries.length > 0 && (
          <div className="mt-16">
            <MediaCarousel
              title="Séries similaires"
              items={similarSeries.slice(0, 10)}
              onItemClick={(item) => navigate(navPaths.seriesDetail(item.id))}
            />
          </div>
        )}
      </div>

    </CommonLayout >
  );
}
