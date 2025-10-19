import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Star, Calendar, X, Heart } from "lucide-react";
import MediaCarousel from "@/components/MediaCarousel";
import VideoPlayer from "@/components/VideoPlayer";
import VidMolyPlayer from "@/components/VidMolyPlayer";
import StreamingSources from "@/components/StreamingSources";
import CommonLayout from "@/components/CommonLayout";
import PullToRefresh from "@/components/PullToRefresh";
import { useMovieDetails, useMovieVideos, useSimilarMovies, useMultiSearch, useMovixPlayerLinks } from "@/hooks/useTMDB";
import { getImageUrl } from "@/lib/tmdb";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { getMovieStream, extractVidzyM3u8 } from "@/lib/movix";
import { useFavorites } from "@/hooks/useFavorites";

export default function MovieDetail() {
  const { id } = useParams();
  const movieId = parseInt(id || "0");
  const { t } = useLanguage();
  const [, setLocation] = useLocation();
  const [selectedSource, setSelectedSource] = useState<{ url: string; type: "m3u8" | "mp4" | "embed"; name: string; isVidMoly?: boolean } | null>(null);
  const [isLoadingSource, setIsLoadingSource] = useState(false);

  const { isFavorite, toggleFavorite } = useFavorites();

  // Fetch data from TMDB
  const { data: movie, isLoading: isLoadingMovie } = useMovieDetails(movieId);
  const { data: videos } = useMovieVideos(movieId);
  const { data: similarMovies = [] } = useSimilarMovies(movieId);

  // Fetch Movix player links
  const { data: movixLinks } = useMovixPlayerLinks(movieId.toString(), 'movie');

  // Get trailer
  const trailer = videos?.results?.find((video: any) => video.type === 'Trailer' && video.site === 'YouTube');

  // Generate sources from Movix links
  const sources = movixLinks ? [
    ...(movixLinks?.player_links || []).map((link: any) => ({
      id: `fstream-${link.id}`,
      name: link.name,
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
      name: link.name,
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
      name: link.name,
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

  const handleSourceSelect = async (source: { url: string; type: "m3u8" | "mp4" | "embed"; name: string; isVidMoly?: boolean }) => {
    setIsLoadingSource(true);
    setSelectedSource(source);
    setIsLoadingSource(false);
  };

  const handleClosePlayer = () => {
    setSelectedSource(null);
    setIsLoadingSource(false);
  };

  const backdropUrl = movie?.backdrop_path ? getImageUrl(movie.backdrop_path, 'original') : "";

  const handleRefresh = () => {
    window.location.reload();
  };

  // Loading state
  if (isLoadingMovie) {
    return (
      <CommonLayout showSearch={true} onRefresh={handleRefresh}>
        <PullToRefresh onRefresh={handleRefresh}>
          <div className="container mx-auto px-4 md:px-8 lg:px-12 py-8">
            <div className="text-center py-12">
              <p className="text-muted-foreground">Chargement du film...</p>
            </div>
          </div>
        </PullToRefresh>
      </CommonLayout>
    );
  }

  // No movie found
  if (!movie) {
    return (
      <CommonLayout showSearch={true} onRefresh={handleRefresh}>
        <PullToRefresh onRefresh={handleRefresh}>
          <div className="container mx-auto px-4 md:px-8 lg:px-12 py-8">
            <div className="text-center py-12">
              <p className="text-muted-foreground">Film non trouvé</p>
            </div>
          </div>
        </PullToRefresh>
      </CommonLayout>
    );
  }

  // Main content
  return (
    <CommonLayout showSearch={true} onRefresh={handleRefresh}>
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="container mx-auto px-4 md:px-8 lg:px-12 py-8">
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
                  {movie.runtime && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      <span>{movie.runtime} min</span>
                    </div>
                  )}
                  {movie.release_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      <span>{new Date(movie.release_date).getFullYear()}</span>
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
                  {/* Sources de streaming unifiées */}
                  <StreamingSources
                    type="movie"
                    id={movieId}
                    title={movie.title}
                    sources={sources}
                    genres={movie.genres}
                    onSourceClick={handleSourceSelect}
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
                  {selectedSource.type === 'embed' ? (
                    <VidMolyPlayer
                      vidmolyUrl={selectedSource.url}
                      title={movie.title}
                      mediaId={movieId}
                      mediaType="movie"
                      posterPath={movie.poster_path}
                      backdropPath={movie.backdrop_path}
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
                onItemClick={(item) => setLocation(`/movie/${item.id}`)}
              />
            </div>
          )}
        </div>
      </PullToRefresh>
    </CommonLayout>
  );
}
