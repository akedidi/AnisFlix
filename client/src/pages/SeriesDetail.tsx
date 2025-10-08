import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Play, Star, Calendar, X } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageSelect from "@/components/LanguageSelect";
import MediaCarousel from "@/components/MediaCarousel";
import VideoPlayer from "@/components/VideoPlayer";
import { useSeriesDetails, useSeriesVideos, useSeasonDetails, useSimilarSeries } from "@/hooks/useTMDB";
import { getImageUrl } from "@/lib/tmdb";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { getSeriesStream, extractVidzyM3u8 } from "@/lib/movix";

export default function SeriesDetail() {
  const { id } = useParams();
  const [selectedEpisode, setSelectedEpisode] = useState<number | null>(null);
  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState<number>(1);
  const [selectedSource, setSelectedSource] = useState<{ url: string; type: "m3u8" | "mp4"; name: string } | null>(null);
  const [isLoadingSource, setIsLoadingSource] = useState(false);
  const seriesId = parseInt(id || "0");
  const { t } = useLanguage();

  // Réinitialiser la source quand l'épisode ou la saison change
  useEffect(() => {
    setSelectedSource(null);
  }, [selectedEpisode, selectedSeasonNumber]);
  
  // Fetch data from TMDB
  const { data: series, isLoading: isLoadingSeries } = useSeriesDetails(seriesId);
  const { data: videos } = useSeriesVideos(seriesId);
  const { data: seasonDetails } = useSeasonDetails(seriesId, selectedSeasonNumber);
  const { data: similarSeries = [] } = useSimilarSeries(seriesId);

  // Find trailer from videos
  const trailer = videos?.results?.find(
    (video: any) => video.type === "Trailer" && video.site === "YouTube"
  );
  
  // Generate episode sources - TopStream et Vidzy uniquement
  const episodeSources = series && selectedEpisode ? [
    { id: 1, name: "TopStream", provider: "topstream" as const },
    { id: 2, name: "Vidzy", provider: "vidzy" as const },
  ] : [];

  const handleSourceClick = async (sourceName: string, provider: "topstream" | "vidzy") => {
    if (!series || !selectedEpisode) return;
    
    setIsLoadingSource(true);
    try {
      if (provider === "topstream") {
        // TopStream retourne directement du MP4
        const response = await getSeriesStream(series.id, selectedSeasonNumber, selectedEpisode, "topstream");
        
        if (response?.sources?.[0]?.url) {
          setSelectedSource({
            url: response.sources[0].url,
            type: "mp4",
            name: sourceName
          });
        } else {
          alert("Impossible de charger la source TopStream");
        }
      } else if (provider === "vidzy") {
        // Vidzy : récupérer l'URL vidzy.org depuis Movix, puis extraire le m3u8
        const movixResponse = await fetch(`https://api.movix.site/api/vidzy/tv/${series.id}?season=${selectedSeasonNumber}&episode=${selectedEpisode}`);
        
        if (!movixResponse.ok) {
          throw new Error("Impossible de récupérer la source Vidzy depuis Movix");
        }
        
        const movixData = await movixResponse.json();
        const vidzyUrl = movixData?.sources?.[0]?.url;
        
        if (!vidzyUrl) {
          throw new Error("URL Vidzy introuvable dans la réponse Movix");
        }
        
        const m3u8Url = await extractVidzyM3u8(vidzyUrl);
        
        if (!m3u8Url) {
          throw new Error("Impossible d'extraire le lien m3u8 depuis Vidzy");
        }
        
        setSelectedSource({
          url: m3u8Url,
          type: "m3u8",
          name: sourceName
        });
      }
    } catch (error) {
      console.error("Erreur lors du chargement de la source:", error);
      alert(error instanceof Error ? error.message : "Erreur lors du chargement de la source");
    } finally {
      setIsLoadingSource(false);
    }
  };
  
  const backdropUrl = series?.backdrop_path ? getImageUrl(series.backdrop_path, 'original') : "";
  
  if (isLoadingSeries) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl">Chargement...</div>
        </div>
      </div>
    );
  }
  
  if (!series) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl">Série non trouvée</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="container mx-auto px-4 md:px-8 lg:px-12 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl md:text-3xl font-bold">Détail de la série</h1>
            <div className="flex items-center gap-2">
              <LanguageSelect />
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
              alt={series.name}
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-8 lg:px-12 -mt-32 relative z-10">
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
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                  <span className="text-lg font-semibold">
                    {Math.round(series.vote_average * 10) / 10}
                  </span>
                </div>
                {series.first_air_date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    <span>{new Date(series.first_air_date).getFullYear()}</span>
                  </div>
                )}
                <Badge variant="secondary">{series.number_of_seasons} saisons</Badge>
              </div>

              <div className="flex flex-wrap gap-2 mb-6">
                {series.genres?.map((genre: any) => (
                  <Badge key={genre.id} variant="secondary">
                    {genre.name}
                  </Badge>
                ))}
              </div>

              <h2 className="text-xl font-semibold mb-3">Synopsis</h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                {series.overview || "Aucun synopsis disponible."}
              </p>
            </div>

            <Tabs defaultValue="season-1" className="w-full" onValueChange={(value) => {
              const seasonNum = parseInt(value.replace('season-', ''));
              setSelectedSeasonNumber(seasonNum);
            }}>
              <TabsList className="flex-wrap h-auto">
                {series.seasons?.filter((s: any) => s.season_number > 0).map((season: any) => (
                  <TabsTrigger
                    key={season.id}
                    value={`season-${season.season_number}`}
                    data-testid={`tab-season-${season.season_number}`}
                  >
                    Saison {season.season_number}
                  </TabsTrigger>
                ))}
              </TabsList>

              {series.seasons?.filter((s: any) => s.season_number > 0).map((season: any) => (
                <TabsContent key={season.id} value={`season-${season.season_number}`} className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Saison {season.season_number}</h3>
                    <p className="text-muted-foreground mb-4">{season.overview || "Aucune description disponible."}</p>
                    <p className="text-sm text-muted-foreground">{season.episode_count} épisodes</p>
                  </div>

                  {trailer && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Bande-annonce</h3>
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

                  <div>
                    <h3 className="text-lg font-semibold mb-3">Épisodes</h3>
                    <div className="space-y-3">
                      {seasonDetails?.episodes?.map((episode: any) => (
                        <Card
                          key={episode.id}
                          className="p-4 hover-elevate active-elevate-2 cursor-pointer"
                          onClick={() => setSelectedEpisode(episode.episode_number)}
                          data-testid={`card-episode-${episode.episode_number}`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="font-semibold mb-1">
                                {episode.episode_number}. {episode.name}
                              </h4>
                              <p className="text-sm text-muted-foreground mb-2">
                                {episode.overview || "Aucune description disponible."}
                              </p>
                              {episode.runtime && (
                                <p className="text-xs text-muted-foreground">{episode.runtime} min</p>
                              )}
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEpisode(episode.episode_number);
                              }}
                            >
                              <Play className="w-4 h-4" />
                            </Button>
                          </div>

                          {selectedEpisode === episode.episode_number && (
                            <div className="mt-4 pt-4 border-t space-y-3">
                              {!selectedSource ? (
                                <>
                                  <h5 className="font-semibold text-sm">Sources de visionnage</h5>
                                  <div className="space-y-2">
                                    {episodeSources.map((source) => (
                                      <Button
                                        key={source.id}
                                        variant="outline"
                                        size="sm"
                                        className="w-full justify-between"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleSourceClick(source.name, source.provider);
                                        }}
                                        disabled={isLoadingSource}
                                        data-testid={`button-episode-source-${source.name.toLowerCase()}`}
                                      >
                                        <span className="flex items-center gap-2">
                                          <Play className="w-3 h-3" />
                                          {source.name}
                                        </span>
                                        <span className="text-xs">
                                          {isLoadingSource ? "Chargement..." : "Regarder"}
                                        </span>
                                      </Button>
                                    ))}
                                  </div>
                                </>
                              ) : (
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <h5 className="font-semibold text-sm">Lecture - {selectedSource.name}</h5>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedSource(null);
                                      }}
                                      data-testid="button-close-episode-player"
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </div>
                                  <VideoPlayer
                                    src={selectedSource.url}
                                    type={selectedSource.type}
                                    title={`${series?.name || "Série"} - S${selectedSeasonNumber}E${selectedEpisode}`}
                                    mediaId={series.id}
                                    mediaType="tv"
                                    posterPath={series.poster_path}
                                    backdropPath={series.backdrop_path}
                                    seasonNumber={selectedSeasonNumber}
                                    episodeNumber={selectedEpisode}
                                  />
                                </div>
                              )}
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

        {similarSeries.length > 0 && (
          <div className="mt-16">
            <MediaCarousel
              title="Séries similaires"
              items={similarSeries.slice(0, 10)}
              onItemClick={(item) => window.location.href = `/series/${item.id}`}
            />
          </div>
        )}
      </div>
    </div>
  );
}
