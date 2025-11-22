import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { IonPage } from '@ionic/react';
import NativeHeader from "@/components/NativeHeader";
import { useRouteParams } from "@/hooks/useRouteParams";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Star, Calendar, X, Heart } from "lucide-react";
import MediaCarousel from "@/components/MediaCarousel";
import VideoPlayer from "@/components/VideoPlayer";
import VidMolyPlayer from "@/components/VidMolyPlayer";
import DarkiPlayer from "@/components/DarkiPlayer";
import StreamingSources from "@/components/StreamingSources";
import CommonLayout from "@/components/CommonLayout";
import { useMovieDetails, useMovieVideos, useSimilarMovies, useMultiSearch, useMovixPlayerLinks } from "@/hooks/useTMDB";
import { useMovixTmdbSources } from "@/hooks/useMovixTmdbSources";
import { getImageUrl } from "@/lib/tmdb";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { getMovieStream, extractVidzyM3u8 } from "@/lib/movix";
import { useFavorites } from "@/hooks/useFavorites";
import { useWatchProgress } from "@/hooks/useWatchProgress";
import { useKeyboardNavigation } from "@/hooks/useKeyboardNavigation";
import { navPaths } from "@/lib/nativeNavigation";
import { cn, formatDuration } from "@/lib/utils";
import { useAppNavigation } from "@/lib/useAppNavigation";

export default function MovieDetail() {
  const { id } = useRouteParams<{ id: string }>();
  const movieId = parseInt(id || "0");
  console.log('🔍 [MOVIE DETAIL] Component rendering with movieId:', movieId, 'id param:', id);
  const { t } = useLanguage();
  const { navigate } = useAppNavigation();
  const [selectedSource, setSelectedSource] = useState<{ url: string; type: "m3u8" | "mp4" | "embed"; name: string; isVidMoly?: boolean; isDarki?: boolean } | null>(null);
  const [isLoadingSource, setIsLoadingSource] = useState(false);

  const { isFavorite, toggleFavorite } = useFavorites();
  const { getMediaProgress } = useWatchProgress();

  // Fetch data from TMDB
  const { data: movie, isLoading: isLoadingMovie } = useMovieDetails(movieId);
  const { data: videos } = useMovieVideos(movieId);
  const { data: similarMovies = [] } = useSimilarMovies(movieId);

  // Fetch Movix player links
  const { data: movixLinks } = useMovixPlayerLinks(movieId.toString(), 'movie');

  // Fetch Movix TMDB sources (VidMoly, Darkibox, etc.)
  console.log('🔍 [MOVIE DETAIL] About to call useMovixTmdbSources with movieId:', movieId);
  const { data: movixTmdbSources } = useMovixTmdbSources(movieId);
  console.log('🔍 [MOVIE DETAIL] useMovixTmdbSources result:', {
    hasData: !!movixTmdbSources,
    processedSources: movixTmdbSources?.processedSources?.length || 0
  });

  // Récupérer les sources films/download en cherchant par titre d'abord
  const { data: searchResults } = useQuery({
    queryKey: ['search-movie', movie?.original_title || movie?.title],
    queryFn: async () => {
      if (!movie) return null;

      // Essayer d'abord avec le titre original, puis le titre si nécessaire
      const searchTitle = movie.original_title || movie.title;
      console.log(`🔍 [FILMS DOWNLOAD] Searching for movie: "${searchTitle}"`);
      const response = await fetch(`/api/movix-proxy?path=search&title=${encodeURIComponent(searchTitle)}`);
      if (!response.ok) return null;

      const data = await response.json();
      console.log(`🔍 [FILMS DOWNLOAD] Search results:`, data);
      return data;
    },
    enabled: !!movie,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000
  });

  // Chercher le résultat qui correspond au TMDB ID du film (pas forcément le premier)
  const matchingResult = searchResults?.results?.find((result: any) => result.tmdb_id === movieId);
  const shouldFetchFilmsDownload = !!matchingResult && matchingResult.tmdb_id === movieId;

  console.log(`🔍 [FILMS DOWNLOAD] Debug:`, {
    movieTitle: movie?.title,
    movieOriginalTitle: movie?.original_title,
    movieId: movieId,
    matchingResult: matchingResult,
    matchingResultTmdbId: matchingResult?.tmdb_id,
    matchingResultMovixId: matchingResult?.id,
    shouldFetch: shouldFetchFilmsDownload,
    allResults: searchResults?.results?.map((r: any) => ({ id: r.id, tmdb_id: r.tmdb_id, name: r.name }))
  });

  // BLOQUER explicitement si matchingResult n'existe pas ou ne correspond pas
  if (matchingResult && matchingResult.tmdb_id !== movieId) {
    console.error(`❌ [FILMS DOWNLOAD] CRITICAL: matchingResult tmdb_id (${matchingResult.tmdb_id}) does not match movieId (${movieId})`);
  }
  if (!matchingResult && searchResults?.results?.length > 0) {
    console.error(`❌ [FILMS DOWNLOAD] CRITICAL: No matching result found for movieId ${movieId}. Available tmdb_ids:`, searchResults.results.map((r: any) => r.tmdb_id));
  }

  // Ne PAS appeler films/download si les tmdb_id ne correspondent pas
  const { data: filmsDownloadSources } = useQuery({
    queryKey: ['films-download', movieId, matchingResult?.id, matchingResult?.tmdb_id],
    queryFn: async () => {
      // TRIPLE vérification pour s'assurer qu'on a le bon résultat
      if (!matchingResult) {
        console.error(`❌ [FILMS DOWNLOAD] FATAL: No matching result found`);
        throw new Error('No matching result found in search');
      }

      if (matchingResult.tmdb_id !== movieId) {
        console.error(`❌ [FILMS DOWNLOAD] FATAL: tmdb_id mismatch (${matchingResult.tmdb_id} !== ${movieId})`);
        throw new Error(`TMDB ID mismatch: search returned ${matchingResult.tmdb_id} but expected ${movieId}`);
      }

      // Utiliser l'ID Movix du résultat correspondant
      const movixId = matchingResult.id;
      if (!movixId) {
        console.error(`❌ [FILMS DOWNLOAD] FATAL: No Movix ID found`);
        throw new Error('No Movix ID found in matching result');
      }

      // Dernière vérification avant l'appel API
      console.log(`✅ [FILMS DOWNLOAD] Confirmed: Using Movix ID ${movixId} for TMDB ID ${movieId}`);
      const response = await fetch(`/api/movix-proxy?path=films/download/${movixId}`);
      if (!response.ok) {
        console.log(`❌ [FILMS DOWNLOAD] Response not OK: ${response.status}`);
        throw new Error(`API returned ${response.status}`);
      }

      const data = await response.json();
      console.log(`✅ [FILMS DOWNLOAD] Sources retrieved:`, data);

      // Vérifier que la réponse ne contient pas un tmdb_id différent
      if (data.tmdb_id && data.tmdb_id !== movieId) {
        console.log(`❌ [FILMS DOWNLOAD] Response tmdb_id mismatch (${data.tmdb_id} !== ${movieId})`);
        throw new Error(`TMDB ID mismatch in response: ${data.tmdb_id} !== ${movieId}`);
      }

      return data;
    },
    enabled: !!movieId && !!matchingResult && matchingResult.tmdb_id === movieId && !!matchingResult.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: false // Ne pas réessayer si ça échoue
  });

  // Get trailer
  const trailer = videos?.results?.find((video: any) => video.type === 'Trailer' && video.site === 'YouTube');

  // Navigation au clavier pour contrôler la lecture vidéo
  const isPlayerActive = !!selectedSource;

  // Generate sources from Movix links
  const sources = movixLinks ? [
    ...(movixLinks?.player_links || []).map((link: any) => ({
      id: `fstream-${link.id}`,
      name: 'FStream',
      provider: 'FStream',
      url: link.url,
      type: 'm3u8' as const,
      isTopStream: false,
      isFStream: true,
      isMovixDownload: false,
      isVidMoly: false,
      isDarki: false,
      quality: link.quality || 'HD',
      language: link.language || 'Français'
    })),
    ...(movixLinks?.player_links || []).map((link: any) => ({
      id: `topstream-${link.id}`,
      name: 'TopStream',
      provider: 'TopStream',
      url: link.url,
      type: 'mp4' as const,
      isTopStream: true,
      isFStream: false,
      isMovixDownload: false,
      isVidMoly: false,
      isDarki: false,
      quality: link.quality || 'HD',
      language: link.language || 'Français'
    })),
    ...(movixLinks?.player_links || []).map((link: any) => ({
      id: `wiflix-${link.id}`,
      name: 'Wiflix',
      provider: 'Wiflix',
      url: link.url,
      type: 'm3u8' as const,
      isTopStream: false,
      isFStream: false,
      isMovixDownload: false,
      isVidMoly: false,
      isDarki: false,
      quality: link.quality || 'HD',
      language: link.language || 'Français'
    }))
  ] : [];

  // Add Movix TMDB sources (VidMoly, Darkibox, etc.) using processed sources
  const tmdbSources = movixTmdbSources?.processedSources?.map((source: any, index: number) => {
    const isVidMoly = source.provider === 'vidmoly';
    const isVidzy = source.provider === 'vidzy';
    const isDarki = source.provider === 'darki';

    return {
      id: `tmdb-${source.provider}-${index}`,
      name: source.quality, // Utiliser le nom du provider déjà formaté
      provider: source.provider.toUpperCase(),
      url: source.url,
      type: 'embed' as const,
      isTopStream: false,
      isFStream: false,
      isMovixDownload: false,
      isVidMoly: isVidMoly,
      isVidzy: isVidzy,
      isDarki: isDarki,
      quality: source.quality,
      language: source.language,
      originalQuality: source.originalQuality
    };
  }) || [];

  // Ajouter les sources films/download si disponibles
  const filmsDownloadSourcesList = filmsDownloadSources?.sources?.map((source: any, index: number) => ({
    id: `films-download-${index}`,
    name: 'Films Download',
    provider: 'Films Download',
    url: source.m3u8 || source.src,
    type: 'm3u8' as const,
    isTopStream: false,
    isFStream: false,
    isMovixDownload: true,
    isVidMoly: false,
    isVidzy: false,
    isDarki: false,
    quality: source.quality || 'HD',
    language: source.language || 'Français'
  })) || [];

  // Filtrer les sources pour exclure celles avec isDarki (mais garder les sources darkibox normales)
  const allSources = [...sources, ...tmdbSources, ...filmsDownloadSourcesList].filter(source => !source.isDarki);

  // Debug logs pour les sources TMDB
  console.log('🔍 [MOVIE DETAIL] Movix TMDB Sources Debug:', {
    hasData: !!movixTmdbSources,
    processedSources: movixTmdbSources?.processedSources?.length || 0,
    tmdbSources: tmdbSources.length,
    allSources: allSources.length,
    rawData: movixTmdbSources
  });

  // Log détaillé des sources TMDB
  if (movixTmdbSources?.processedSources) {
    console.log('📊 [MOVIE DETAIL] Sources TMDB détaillées:', movixTmdbSources.processedSources);
  }

  // Log des sources finales
  console.log('🎯 [MOVIE DETAIL] Sources finales (allSources):', allSources);

  // Log spécifique pour les sources VidMoly et Darki
  const vidMolySources = allSources.filter(s => s.isVidMoly);
  const darkiSources = allSources.filter(s => s.isDarki);
  console.log('🎬 [MOVIE DETAIL] VidMoly sources:', vidMolySources);
  console.log('🌑 [MOVIE DETAIL] Darki sources:', darkiSources);

  const handleSourceSelect = async (source: { url: string; type: "m3u8" | "mp4" | "embed"; name: string; isVidMoly?: boolean; isFStream?: boolean; isDarki?: boolean }) => {
    setIsLoadingSource(true);
    try {
      // Pour VidMoly, passer le lien embed original au VidMolyPlayer
      if (source.isVidMoly) {
        console.log('🎬 Source VidMoly détectée, passage au VidMolyPlayer:', source.url);
        setSelectedSource({
          url: source.url, // Lien embed original
          type: "embed",
          name: source.name,
          isVidMoly: true
        });
        setIsLoadingSource(false);
        return;
      }

      // Pour Darki, utiliser le DarkiPlayer avec l'URL embed originale
      if (source.isDarki) {
        console.log('🌑 Source Darki détectée, passage au DarkiPlayer:', source.url);
        setSelectedSource({
          url: source.url, // Lien embed original
          type: "embed",
          name: source.name,
          isDarki: true
        });
        setIsLoadingSource(false);
        return;
      }

      // Si c'est une source Vidzy via FStream (type marqué m3u8 mais url = page embed), extraire d'abord le vrai m3u8
      if (source.url && source.type === "m3u8" && source.isFStream) {
        console.log("🎬 Extraction Vidzy pour:", source.url);
        const m3u8Url = await extractVidzyM3u8(source.url);
        console.log("🎬 Résultat extraction Vidzy:", m3u8Url);
        if (!m3u8Url) {
          console.warn("⚠️ Aucun lien m3u8 trouvé pour Vidzy");
          alert("Aucun lien de streaming trouvé pour cette source Vidzy");
          return;
        }
        setSelectedSource({ url: m3u8Url, type: "m3u8", name: source.name });
        return;
      }

      // Cas général
      setSelectedSource(source);
    } catch (error) {
      console.error("Erreur lors du chargement de la source:", error);
      const errorMessage = error instanceof Error ? error.message : "Erreur lors du chargement de la source";
      alert(`Erreur Vidzy: ${errorMessage}`);
    } finally {
      setIsLoadingSource(false);
    }
  };

  const handleClosePlayer = () => {
    setSelectedSource(null);
    setIsLoadingSource(false);
  };

  const backdropUrl = movie?.backdrop_path ? getImageUrl(movie.backdrop_path, 'original') : "";

  // Récupérer la progression du film
  const movieProgress = movie ? getMediaProgress(movie.id, 'movie') : null;

  const handleRefresh = () => {
    window.location.reload();
  };

  // Loading state
  if (isLoadingMovie) {
    return (
      <CommonLayout showSearch={true} onRefresh={handleRefresh}>
        <NativeHeader title={t("nav.movies")} showBackButton={true} defaultHref="/tabs/home" />
        <div className="container mx-auto px-4 md:px-8 lg:px-12 py-8">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Chargement du film...</p>
          </div>
        </div>

      </CommonLayout>
    );
  }

  // No movie found
  if (!movie) {
    return (
      <CommonLayout showSearch={true} onRefresh={handleRefresh}>

        <div className="container mx-auto px-4 md:px-8 lg:px-12 py-8">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Film non trouvé</p>
          </div>
        </div>

      </CommonLayout>
    );
  }

  // Main content
  return (
    <CommonLayout showSearch={true} onRefresh={handleRefresh}>
      <NativeHeader title={movie.title} showBackButton={true} defaultHref="/tabs/home" />
      <div className="container mx-auto px-4 md:px-8 lg:px-12 py-8 -mt-12 md:mt-0">
        <div className="grid md:grid-cols-[300px_1fr] gap-8">
          <div className="hidden md:block">
            {movie.poster_path && (
              <img
                src={getImageUrl(movie.poster_path, 'w500')}
                alt={movie.title}
                className="w-full rounded-lg shadow-2xl"
              />
            )}
          </div>
          <div className="space-y-6">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">{movie.title}</h1>

              <div className="flex flex-wrap items-center gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                  <span className="text-lg font-semibold">
                    {Math.round(movie.vote_average * 10) / 10}
                  </span>
                </div>
                {movie.release_date && movie.runtime && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{new Date(movie.release_date).getFullYear()}</span>
                    <span>•</span>
                    <span>{formatDuration(movie.runtime)}</span>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                      <span>{movie.vote_average.toFixed(1)}</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2 mb-6">
                {movie.genres?.map((genre: any) => (
                  <Badge key={genre.id} variant="secondary">
                    {genre.name}
                  </Badge>
                ))}
              </div>
              <p className="text-lg leading-relaxed text-muted-foreground mb-6">
                {movie.overview}
              </p>
            </div>

            <div className="flex gap-4">
              <Button
                onClick={() => {
                  if (movie.imdb_id) {
                    window.open(`https://www.imdb.com/title/${movie.imdb_id}`, '_blank');
                  }
                }}
                variant="outline"
                className="flex items-center gap-2"
              >
                <span>Voir sur IMDb</span>
              </Button>
            </div>

            {/* Boutons d'action */}
            <div className="flex gap-3 mb-6">
              <Button
                variant={isFavorite(movieId, 'movie') ? "default" : "outline"}
                size="lg"
                className="flex items-center gap-2"
                onClick={() => {
                  toggleFavorite({
                    id: movieId,
                    title: movie.title,
                    posterPath: movie.poster_path,
                    rating: movie.vote_average,
                    year: movie.release_date ? new Date(movie.release_date).getFullYear().toString() : '',
                    mediaType: 'movie'
                  });
                }}
              >
                <Heart
                  className={`w-5 h-5 ${isFavorite(movieId, 'movie') ? 'fill-current' : ''}`}
                />
                {isFavorite(movieId, 'movie') ? 'Retiré des favoris' : 'Ajouter aux favoris'}
              </Button>
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
            {!selectedSource ? (
              <div className="space-y-6">
                {/* Barre de progression du film */}
                {movieProgress && movieProgress.progress > 0 && (
                  <div className="w-full bg-gray-200 rounded-full h-1">
                    <div
                      className="bg-red-500 h-1 rounded-full transition-all duration-300"
                      style={{ width: `${movieProgress.progress}%` }}
                    />
                  </div>
                )}

                {/* Sources de streaming unifiées */}
                <StreamingSources
                  type="movie"
                  id={movieId}
                  title={movie.title}
                  sources={allSources}
                  genres={movie.genres}
                  onSourceClick={handleSourceSelect}
                  isLoadingSource={isLoadingSource}
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Lecture en cours</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClosePlayer}
                    className="flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Fermer
                  </Button>
                </div>
                {selectedSource.type === 'embed' && selectedSource.isVidMoly ? (
                  <VidMolyPlayer
                    vidmolyUrl={selectedSource.url}
                    title={movie.title}
                    mediaId={movieId}
                    mediaType="movie"
                    posterPath={movie.poster_path}
                    backdropPath={movie.backdrop_path}
                    imdbId={movie.imdb_id}
                  />
                ) : selectedSource.type === 'embed' && selectedSource.isDarki ? (
                  <DarkiPlayer
                    darkiUrl={selectedSource.url}
                    title={movie.title}
                    mediaId={movieId}
                    mediaType="movie"
                    posterPath={movie.poster_path}
                    backdropPath={movie.backdrop_path}
                    onClose={handleClosePlayer}
                  />
                ) : (
                  <VideoPlayer
                    src={selectedSource.url}
                    type={selectedSource.type as "m3u8" | "mp4"}
                    title={movie.title}
                    mediaId={movieId}
                    mediaType="movie"
                    posterPath={movie.poster_path}
                    backdropPath={movie.backdrop_path}
                    imdbId={movie.imdb_id}
                  />
                )}
              </div>
            )}
          </div>
        </div>
        {similarMovies.length > 0 && (
          <div className="mt-16">
            <MediaCarousel
              title="Films similaires"
              items={similarMovies.slice(0, 10)}
              onItemClick={(item) => navigate(navPaths.movie(item.id))}
            />
          </div>
        )}
      </div>

    </CommonLayout>
  );
}
