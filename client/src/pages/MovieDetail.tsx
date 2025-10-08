import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Clock, Star, Calendar } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageToggle from "@/components/LanguageToggle";
import MediaCarousel from "@/components/MediaCarousel";
import { useMovieDetails, useMovieVideos, useSimilarMovies } from "@/hooks/useTMDB";
import { getImageUrl } from "@/lib/tmdb";

export default function MovieDetail() {
  const { id } = useParams();
  const movieId = parseInt(id || "0");
  
  // Fetch data from TMDB
  const { data: movie, isLoading: isLoadingMovie } = useMovieDetails(movieId);
  const { data: videos } = useMovieVideos(movieId);
  const { data: similarMovies = [] } = useSimilarMovies(movieId);

  // Find trailer from videos
  const trailer = videos?.results?.find(
    (video: any) => video.type === "Trailer" && video.site === "YouTube"
  );
  
  // Generate streaming sources
  const sources = movie ? [
    { id: 1, name: "VidSrc", url: `https://vidsrc.to/embed/movie/${movie.id}` },
    { id: 2, name: "VidSrc Pro", url: `https://vidsrc.pro/embed/movie/${movie.id}` },
    { id: 3, name: "SuperEmbed", url: `https://multiembed.mov/?video_id=${movie.id}&tmdb=1` },
  ] : [];
  
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
    <div className="min-h-screen pb-20 md:pb-0">
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="container mx-auto px-4 md:px-8 lg:px-12 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl md:text-3xl font-bold">Détail du film</h1>
            <div className="flex items-center gap-2">
              <LanguageToggle />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>

      <div className="relative h-[50vh] md:h-[60vh]">
        <div className="absolute inset-0">
          {backdropUrl && (
            <img
              src={backdropUrl}
              alt={movie.title}
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-8 lg:px-12 -mt-32 relative z-10">
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

              {trailer && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold">Bande-annonce</h2>
                  <div className="aspect-video rounded-lg overflow-hidden bg-muted">
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

              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Sources de visionnage</h2>
                <div className="grid gap-3">
                  {sources.map((source) => (
                    <Button
                      key={source.id}
                      variant="outline"
                      className="justify-between h-auto py-3"
                      onClick={() => window.open(source.url, '_blank')}
                      data-testid={`button-source-${source.name.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <span className="flex items-center gap-2">
                        <Play className="w-4 h-4" />
                        {source.name}
                      </span>
                      <span className="text-xs text-muted-foreground">Regarder</span>
                    </Button>
                  ))}
                </div>
              </div>
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
    </div>
  );
}
