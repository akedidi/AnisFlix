import { useState } from "react";
import { useRoute } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Play, Download, Heart, Star, ArrowLeft, Youtube } from "lucide-react";
import MediaCarousel from "@/components/MediaCarousel";
import DesktopSidebar from "@/components/DesktopSidebar";
import { useDeviceType } from "@/hooks/useDeviceType";

export default function MediaDetail() {
  const [, params] = useRoute("/detail/:type/:id");
  const [isFavorite, setIsFavorite] = useState(false);
  const { isNative } = useDeviceType();

  // todo: remove mock functionality
  const mockMedia = {
    id: 1,
    title: "Inception",
    overview: "Dom Cobb est un voleur expérimenté – le meilleur qui soit dans l'art périlleux de l'extraction : sa spécialité consiste à s'approprier les secrets les plus précieux d'un individu, enfouis au plus profond de son subconscient, pendant qu'il rêve et que son esprit est particulièrement vulnérable.",
    posterPath: "/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg",
    backdropPath: "/s3TBrRGB1iav7gFOCNx3H31MoES.jpg",
    rating: 8.8,
    year: "2010",
    runtime: "148 min",
    genres: ["Action", "Science-Fiction", "Thriller"],
    director: "Christopher Nolan",
    cast: ["Leonardo DiCaprio", "Marion Cotillard", "Tom Hardy"],
  };

  const mockSources = [
    { id: 1, name: "VidSrc", qualities: ["1080p", "720p", "480p"] },
    { id: 2, name: "VidSrc.me", qualities: ["1080p", "720p"] },
    { id: 3, name: "Backup", qualities: ["720p", "480p"] },
  ];

  const mockSimilar = [
    { id: 2, title: "Interstellar", posterPath: "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg", rating: 8.6, year: "2014", mediaType: "movie" as const },
    { id: 3, title: "The Matrix", posterPath: "/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg", rating: 8.7, year: "1999", mediaType: "movie" as const },
    { id: 4, title: "The Prestige", posterPath: "/bdN3gXuIZYaJP7ftKK2sU0nPtEA.jpg", rating: 8.5, year: "2006", mediaType: "movie" as const },
  ];

  return (
    <div className="min-h-screen fade-in-up">
      {/* Desktop Sidebar */}
      <DesktopSidebar />
      
      {/* Main Content */}
      <div className="md:ml-64">
        <div className="relative w-full h-[40vh] md:h-[60vh] overflow-hidden">
          <div className="absolute inset-0">
            <img
              src={`https://image.tmdb.org/t/p/original${mockMedia.backdropPath}`}
              alt={mockMedia.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
          </div>

          <div className="relative h-full">
            <div className="container mx-auto px-4 md:px-8 lg:px-12 py-6">
              <Button
                variant="ghost"
                onClick={() => window.history.back()}
                className="gap-2 text-white hover:bg-white/10"
                data-testid="button-back"
              >
                <ArrowLeft className="w-4 h-4" />
                Retour
              </Button>
            </div>
          </div>
        </div>

      <div className="container mx-auto px-4 md:px-8 lg:px-12 -mt-32 relative z-10">
        <div className="grid md:grid-cols-[300px_1fr] gap-8">
          <div>
            <img
              src={`https://image.tmdb.org/t/p/w500${mockMedia.posterPath}`}
              alt={mockMedia.title}
              className="w-full rounded-lg shadow-2xl"
            />
          </div>

          <div className="space-y-6">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4 text-white md:text-foreground">
                {mockMedia.title}
              </h1>
              
              <div className="flex flex-wrap items-center gap-4 mb-4">
                <div className="flex items-center gap-1">
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold">{mockMedia.rating.toFixed(1)}</span>
                </div>
                <span>{mockMedia.year}</span>
                <span>{mockMedia.runtime}</span>
              </div>

              <div className="flex flex-wrap gap-2 mb-6">
                {mockMedia.genres.map((genre) => (
                  <Badge key={genre} variant="secondary">{genre}</Badge>
                ))}
              </div>

              <p className="text-lg mb-6">{mockMedia.overview}</p>

              <div className="space-y-2 mb-6">
                <p><strong>Réalisateur:</strong> {mockMedia.director}</p>
                <p><strong>Acteurs:</strong> {mockMedia.cast.join(", ")}</p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button size="lg" className="gap-2" data-testid="button-play">
                  <Play className="w-5 h-5 fill-current" />
                  Lecture
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="gap-2"
                  data-testid="button-trailer"
                >
                  <Youtube className="w-5 h-5" />
                  Bande-annonce
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="gap-2"
                  onClick={() => setIsFavorite(!isFavorite)}
                  data-testid="button-favorite"
                >
                  <Heart className={`w-5 h-5 ${isFavorite ? "fill-primary text-primary" : ""}`} />
                  {isFavorite ? "Favori" : "Ajouter"}
                </Button>
                {isNative && (
                  <Button
                    size="lg"
                    variant="outline"
                    className="gap-2"
                    data-testid="button-download"
                  >
                    <Download className="w-5 h-5" />
                    Télécharger
                  </Button>
                )}
              </div>
            </div>

            <Card className="p-6">
              <Tabs defaultValue="sources">
                <TabsList className="mb-4">
                  <TabsTrigger value="sources">Sources & Qualités</TabsTrigger>
                </TabsList>

                <TabsContent value="sources" className="space-y-4">
                  {mockSources.map((source) => (
                    <div key={source.id} className="space-y-2">
                      <h3 className="font-semibold">{source.name}</h3>
                      <div className="flex flex-wrap gap-2">
                        {source.qualities.map((quality) => (
                          <Button
                            key={quality}
                            variant="outline"
                            size="sm"
                            onClick={() => console.log("Play:", source.name, quality)}
                            data-testid={`button-quality-${quality}`}
                          >
                            {quality}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ))}
                </TabsContent>
              </Tabs>
            </Card>
          </div>
        </div>

        <div className="mt-12">
          <MediaCarousel
            title="Contenu similaire"
            items={mockSimilar}
            onItemClick={(item) => console.log("Clicked:", item)}
          />
        </div>
      </div>
      
    </div>
  );
}
