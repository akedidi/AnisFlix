import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Clock, Star, Calendar } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageToggle from "@/components/LanguageToggle";
import MediaCarousel from "@/components/MediaCarousel";

export default function MovieDetail() {
  const { id } = useParams();

  // todo: fetch from TMDB API
  const mockMovie = {
    id: parseInt(id || "1"),
    title: "Inception",
    overview: "Dom Cobb est un voleur expérimenté – le meilleur qui soit dans l'art périlleux de l'extraction : sa spécialité consiste à s'approprier les secrets les plus précieux d'un individu, enfouis au plus profond de son subconscient, pendant qu'il rêve et que son esprit est particulièrement vulnérable.",
    backdropPath: "/s3TBrRGB1iav7gFOCNx3H31MoES.jpg",
    posterPath: "/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg",
    rating: 8.8,
    runtime: 148,
    releaseDate: "2010-07-16",
    genres: ["Action", "Science-Fiction", "Aventure"],
    trailerKey: "YoHD9XEInc0",
    sources: [
      { id: 1, name: "VidSrc", url: "https://vidsrc.to/embed/movie/27205" },
      { id: 2, name: "VidSrc Pro", url: "https://vidsrc.pro/embed/movie/27205" },
      { id: 3, name: "SuperEmbed", url: "https://multiembed.mov/?video_id=27205&tmdb=1" },
    ],
  };

  const mockSimilar = [
    { id: 2, title: "Interstellar", posterPath: "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg", rating: 8.6, year: "2014", mediaType: "movie" as const },
    { id: 3, title: "The Matrix", posterPath: "/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg", rating: 8.7, year: "1999", mediaType: "movie" as const },
    { id: 4, title: "The Prestige", posterPath: "/5MXyQfz8xUP3dIFPTubhTsbFY6N.jpg", rating: 8.5, year: "2006", mediaType: "movie" as const },
  ];

  const backdropUrl = mockMovie.backdropPath
    ? `https://image.tmdb.org/t/p/original${mockMovie.backdropPath}`
    : "";

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
          <img
            src={backdropUrl}
            alt={mockMovie.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-8 lg:px-12 -mt-32 relative z-10">
        <div className="grid md:grid-cols-[300px_1fr] gap-8">
          <div className="hidden md:block">
            <img
              src={`https://image.tmdb.org/t/p/w500${mockMovie.posterPath}`}
              alt={mockMovie.title}
              className="w-full rounded-lg shadow-2xl"
            />
          </div>

          <div className="space-y-6">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">{mockMovie.title}</h1>
              
              <div className="flex flex-wrap items-center gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                  <span className="text-lg font-semibold">{mockMovie.rating}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  <span>{mockMovie.runtime} min</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  <span>{new Date(mockMovie.releaseDate).getFullYear()}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-6">
                {mockMovie.genres.map((genre) => (
                  <Badge key={genre} variant="secondary">
                    {genre}
                  </Badge>
                ))}
              </div>

              <h2 className="text-xl font-semibold mb-3">Synopsis</h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                {mockMovie.overview}
              </p>

              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Bande-annonce</h2>
                <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                  <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.youtube.com/embed/${mockMovie.trailerKey}`}
                    title="Trailer"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Sources de visionnage</h2>
                <div className="grid gap-3">
                  {mockMovie.sources.map((source) => (
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

        <div className="mt-16">
          <MediaCarousel
            title="Films similaires"
            items={mockSimilar}
            onItemClick={(item) => console.log("Clicked:", item)}
          />
        </div>
      </div>
    </div>
  );
}
