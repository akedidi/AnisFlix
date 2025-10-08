import { useState } from "react";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Play, Star, Calendar } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageToggle from "@/components/LanguageToggle";
import MediaCarousel from "@/components/MediaCarousel";

export default function SeriesDetail() {
  const { id } = useParams();
  const [selectedEpisode, setSelectedEpisode] = useState<number | null>(null);

  // todo: fetch from TMDB API
  const mockSeries = {
    id: parseInt(id || "1"),
    title: "Breaking Bad",
    overview: "Walter White, 50 ans, est professeur de chimie dans un lycée du Nouveau-Mexique. Pour subvenir aux besoins de Skyler, sa femme enceinte, et de Walt Jr, son fils handicapé, il est obligé de travailler doublement.",
    backdropPath: "/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg",
    posterPath: "/ggFHVNu6YYI5L9pCfOacjizRGt.jpg",
    rating: 9.5,
    firstAirDate: "2008-01-20",
    numberOfSeasons: 5,
    genres: ["Drame", "Crime", "Thriller"],
    seasons: [
      {
        id: 1,
        seasonNumber: 1,
        name: "Saison 1",
        overview: "Walter White commence sa descente aux enfers en fabricant de la méthamphétamine.",
        episodeCount: 7,
        trailerKey: "HhesaQXLuRY",
        episodes: [
          { id: 1, episodeNumber: 1, name: "Chute libre", overview: "Un professeur de chimie découvre qu'il a un cancer du poumon et décide de fabriquer de la drogue.", runtime: 58 },
          { id: 2, episodeNumber: 2, name: "Le choix", overview: "Walter et Jesse tentent de se débarrasser du corps.", runtime: 48 },
        ],
      },
      {
        id: 2,
        seasonNumber: 2,
        name: "Saison 2",
        overview: "Les conséquences des actions de Walter commencent à se faire sentir.",
        episodeCount: 13,
        trailerKey: "HhesaQXLuRY",
        episodes: [
          { id: 3, episodeNumber: 1, name: "Traqués", overview: "Walter et Jesse doivent gérer les conséquences.", runtime: 47 },
        ],
      },
    ],
  };

  const mockSimilar = [
    { id: 2, title: "Better Call Saul", posterPath: "/fC2HDm5t0kHl7mTm7jxMR31b7by.jpg", rating: 8.9, year: "2015", mediaType: "tv" as const },
    { id: 3, title: "The Wire", posterPath: "/4lbclFySvugI51fwsyxBTOm4DqK.jpg", rating: 9.3, year: "2002", mediaType: "tv" as const },
  ];

  const backdropUrl = mockSeries.backdropPath
    ? `https://image.tmdb.org/t/p/original${mockSeries.backdropPath}`
    : "";

  const episodeSources = [
    { id: 1, name: "VidSrc", url: "https://vidsrc.to/embed/tv/1396" },
    { id: 2, name: "VidSrc Pro", url: "https://vidsrc.pro/embed/tv/1396" },
  ];

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="container mx-auto px-4 md:px-8 lg:px-12 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl md:text-3xl font-bold">Détail de la série</h1>
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
            alt={mockSeries.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-8 lg:px-12 -mt-32 relative z-10">
        <div className="grid md:grid-cols-[300px_1fr] gap-8">
          <div className="hidden md:block">
            <img
              src={`https://image.tmdb.org/t/p/w500${mockSeries.posterPath}`}
              alt={mockSeries.title}
              className="w-full rounded-lg shadow-2xl"
            />
          </div>

          <div className="space-y-6">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">{mockSeries.title}</h1>
              
              <div className="flex flex-wrap items-center gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                  <span className="text-lg font-semibold">{mockSeries.rating}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  <span>{new Date(mockSeries.firstAirDate).getFullYear()}</span>
                </div>
                <Badge variant="secondary">{mockSeries.numberOfSeasons} saisons</Badge>
              </div>

              <div className="flex flex-wrap gap-2 mb-6">
                {mockSeries.genres.map((genre) => (
                  <Badge key={genre} variant="secondary">
                    {genre}
                  </Badge>
                ))}
              </div>

              <h2 className="text-xl font-semibold mb-3">Synopsis</h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                {mockSeries.overview}
              </p>
            </div>

            <Tabs defaultValue="season-1" className="w-full">
              <TabsList className="flex-wrap h-auto">
                {mockSeries.seasons.map((season) => (
                  <TabsTrigger
                    key={season.id}
                    value={`season-${season.seasonNumber}`}
                    data-testid={`tab-season-${season.seasonNumber}`}
                  >
                    {season.name}
                  </TabsTrigger>
                ))}
              </TabsList>

              {mockSeries.seasons.map((season) => (
                <TabsContent key={season.id} value={`season-${season.seasonNumber}`} className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">{season.name}</h3>
                    <p className="text-muted-foreground mb-4">{season.overview}</p>
                    <p className="text-sm text-muted-foreground">{season.episodeCount} épisodes</p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3">Bande-annonce</h3>
                    <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                      <iframe
                        width="100%"
                        height="100%"
                        src={`https://www.youtube.com/embed/${season.trailerKey}`}
                        title={`${season.name} Trailer`}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3">Épisodes</h3>
                    <div className="space-y-3">
                      {season.episodes.map((episode) => (
                        <Card
                          key={episode.id}
                          className="p-4 hover-elevate active-elevate-2 cursor-pointer"
                          onClick={() => setSelectedEpisode(episode.id)}
                          data-testid={`card-episode-${episode.episodeNumber}`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="font-semibold mb-1">
                                {episode.episodeNumber}. {episode.name}
                              </h4>
                              <p className="text-sm text-muted-foreground mb-2">
                                {episode.overview}
                              </p>
                              <p className="text-xs text-muted-foreground">{episode.runtime} min</p>
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEpisode(episode.id);
                              }}
                            >
                              <Play className="w-4 h-4" />
                            </Button>
                          </div>

                          {selectedEpisode === episode.id && (
                            <div className="mt-4 pt-4 border-t space-y-2">
                              <h5 className="font-semibold text-sm">Sources de visionnage</h5>
                              {episodeSources.map((source) => (
                                <Button
                                  key={source.id}
                                  variant="outline"
                                  size="sm"
                                  className="w-full justify-between"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(`${source.url}/${season.seasonNumber}/${episode.episodeNumber}`, '_blank');
                                  }}
                                  data-testid={`button-episode-source-${source.name.toLowerCase()}`}
                                >
                                  <span className="flex items-center gap-2">
                                    <Play className="w-3 h-3" />
                                    {source.name}
                                  </span>
                                  <span className="text-xs">Regarder</span>
                                </Button>
                              ))}
                            </div>
                          )}
                        </Card>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </div>

        <div className="mt-16">
          <MediaCarousel
            title="Séries similaires"
            items={mockSimilar}
            onItemClick={(item) => console.log("Clicked:", item)}
          />
        </div>
      </div>
    </div>
  );
}
