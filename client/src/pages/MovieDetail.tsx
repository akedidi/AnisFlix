import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Clock, Star, Calendar, X, Heart } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageSelect from "@/components/LanguageSelect";
import MediaCarousel from "@/components/MediaCarousel";
import VideoPlayer from "@/components/VideoPlayer";
import StreamingSources from "@/components/StreamingSources";
import SearchBar from "@/components/SearchBar";
import BottomNav from "@/components/BottomNav";
import DesktopSidebar from "@/components/DesktopSidebar";
import { useMovieDetails, useMovieVideos, useSimilarMovies } from "@/hooks/useTMDB";
import { getImageUrl } from "@/lib/tmdb";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { getMovieStream, extractVidzyM3u8 } from "@/lib/movix";
import { useFavorites } from "@/hooks/useFavorites";

export default function MovieDetail() {
  const { id } = useParams();
  const movieId = parseInt(id || "0");
  const { t } = useLanguage();
  const [, setLocation] = useLocation();
  const [selectedSource, setSelectedSource] = useState<{ url: string; type: "m3u8" | "mp4"; name: string } | null>(null);
  const [isLoadingSource, setIsLoadingSource] = useState(false);
  const { isFavorite, toggleFavorite } = useFavorites();
  
  // Fetch data from TMDB
  const { data: movie, isLoading: isLoadingMovie } = useMovieDetails(movieId);
  const { data: videos } = useMovieVideos(movieId);
  const { data: similarMovies = [] } = useSimilarMovies(movieId);

  // Find trailer from videos
  const trailer = videos?.results?.find(
    (video: any) => video.type === "Trailer" && video.site === "YouTube"
  );
  
  // Sources statiques supprimées - on utilise maintenant l'API FStream pour Vidzy
  const sources: any[] = [];

  const handleSourceClick = async (source: { 
    url: string; 
    type: "m3u8" | "mp4" | "embed"; 
    name: string;
    isTopStream?: boolean;
    isFStream?: boolean;
    isMovixDownload?: boolean;
  }) => {
    if (!movie) return;
    
    // Si l'URL est déjà fournie (TopStream, MovixDownload ou autres sources directes), on l'utilise directement
    if (source.url && (source.type === "mp4" || source.type === "embed" || source.isTopStream || source.isMovixDownload)) {
      setSelectedSource({
        url: source.url,
        type: source.isMovixDownload ? "m3u8" : (source.type === "embed" ? "m3u8" : source.type),
        name: source.name
      });
      return;
    }
    
    // Pour Vidzy (via FStream), on utilise le scraper
    if (source.url && source.type === "m3u8" && source.isFStream) {
      setIsLoadingSource(true);
      try {
        const m3u8Url = await extractVidzyM3u8(source.url);
        
        if (!m3u8Url) {
          throw new Error("Impossible d'extraire le lien m3u8 depuis Vidzy");
        }
        
        setSelectedSource({
          url: m3u8Url,
          type: "m3u8",
          name: source.name
        });
      } catch (error) {
        console.error("Erreur lors du chargement de la source:", error);
        alert(error instanceof Error ? error.message : "Erreur lors du chargement de la source");
      } finally {
        setIsLoadingSource(false);
      }
      return;
    }
    
    // Plus de sources statiques à gérer - toutes les sources viennent des APIs
  };
  
  const backdropUrl = movie?.backdrop_path ? getImageUrl(movie.backdrop_path, 'original') : "";
  
  if (isLoadingMovie) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl">Chargement...</div>
        </div>
      </div>
    );
  }
  
  if (!movie) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl">Film non trouvé</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen fade-in-up">
      {/* Desktop Sidebar */}
      <DesktopSidebar />
      
      {/* Main Content */}
      <div className="md:ml-64">
        <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
          <div className="container mx-auto px-4 md:px-8 lg:px-12 py-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <SearchBar onNavigate={setLocation} />
              </div>
              <div className="flex items-center gap-2">
                <LanguageSelect />
                <ThemeToggle />
              </div>
            </div>
          </div>
        </div>

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

              <h2 className="text-xl font-semibold mb-3">Synopsis</h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                {movie.overview || "Aucun synopsis disponible."}
              </p>

              {/* Boutons d'action */}
              <div className="flex gap-3 mb-6">
                <Button
                  variant="default"
                  size="lg"
                  className="flex items-center gap-2"
                  onClick={() => {
                    // Scroll vers les sources de streaming
                    const sourcesSection = document.querySelector('[data-testid="streaming-sources"]');
                    sourcesSection?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  <Play className="w-5 h-5" />
                  Regarder
                </Button>
                <Button
                  variant={isFavorite(movieId, 'movie') ? "default" : "outline"}
                  size="lg"
                  className="flex items-center gap-2"
                  onClick={() => {
                    if (movie) {
                      toggleFavorite({
                        id: movieId,
                        title: movie.title,
                        posterPath: movie.poster_path,
                        rating: movie.vote_average,
                        year: movie.release_date ? new Date(movie.release_date).getFullYear().toString() : '',
                        mediaType: 'movie'
                      });
                    }
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
                    title={movie?.title || ''}
                    sources={sources}
                    onSourceClick={handleSourceClick}
                    isLoadingSource={isLoadingSource}
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">Lecture - {selectedSource.name}</h2>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedSource(null)}
                      data-testid="button-close-player"
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                  <VideoPlayer
                    src={selectedSource.url}
                    type={selectedSource.type}
                    title={movie?.title || "Vidéo"}
                    mediaId={movie.id}
                    mediaType="movie"
                    posterPath={movie.poster_path}
                    backdropPath={movie.backdrop_path}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {similarMovies.length > 0 && (
          <div className="mt-16">
            <MediaCarousel
              title="Films similaires"
              items={similarMovies.slice(0, 10)}
              onItemClick={(item) => window.location.href = `/movie/${item.id}`}
            />
          </div>
        )}
      </div>
      
      {/* Mobile Bottom Navigation */}
      <BottomNav />
      </div>
    </div>
  );
}
