import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
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
import { useSeriesDetails, useSeriesVideos, useSeasonDetails, useSimilarSeries, useMultiSearch, useMovixPlayerLinks } from "@/hooks/useTMDB";
import { getImageUrl } from "@/lib/tmdb";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { getSeriesStream, extractVidzyM3u8 } from "@/lib/movix";
import { useFavorites } from "@/hooks/useFavorites";
export default function SeriesDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const [selectedEpisode, setSelectedEpisode] = useState<number | null>(null);
  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState<number>(1);
  const [selectedSource, setSelectedSource] = useState<{ url: string; type: "m3u8" | "mp4" | "embed"; name: string; isVidMoly?: boolean; isDarki?: boolean; quality?: string; language?: string } | null>(null);
  const [isLoadingSource, setIsLoadingSource] = useState(false);
    const seriesId = parseInt(id || "0");
  const { t } = useLanguage();
  const { isFavorite, toggleFavorite } = useFavorites();
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
  const { data: videos } = useSeriesVideos(seriesId);
  const { data: seasonDetails } = useSeasonDetails(seriesId, selectedSeasonNumber);
  const { data: similarSeries = [] } = useSimilarSeries(seriesId);
  // Fetch Movix player links
  const { data: movixLinks, isLoading: isLoadingMovixLinks } = useMovixPlayerLinks(
    series?.imdb_id || null,
    'tv'
  );
  // Log Movix links for debugging (will be removed later)
  if (movixLinks && !isLoadingMovixLinks) {
    console.log('Movix player links for series:', series?.name, movixLinks);
  }
  // Find trailer from videos
  const trailer = videos?.results?.find(
    (video: any) => video.type === "Trailer" && video.site === "YouTube"
  );
  // Sources statiques supprimées - on utilise maintenant l'API FStream pour Vidzy
  const episodeSources: any[] = [];
  const handleSourceClick = async (source: {
    url: string;
    type: "m3u8" | "mp4" | "embed";
    name: string;
    isTopStream?: boolean;
    isFStream?: boolean;
    isMovixDownload?: boolean;
    isDarki?: boolean;
    isVidMoly?: boolean;
    quality?: string;
    language?: string;
  }) => {
    if (!series || !selectedEpisode) return;
    // Si l'URL est déjà fournie (TopStream, MovixDownload, Darki ou autres sources directes), on l'utilise directement
    // EXCEPTION: VidMoly doit toujours passer par l'API d'extraction
    if (source.url && (source.type === "mp4" || source.type === "embed" || source.isTopStream || source.isMovixDownload || source.isDarki) && !source.isVidMoly) {
      setSelectedSource({
        url: source.url,
        type: source.isMovixDownload || source.isDarki ? "m3u8" : (source.type === "embed" ? "m3u8" : source.type),
        name: source.name,
        isDarki: source.isDarki,
        quality: source.quality,
        language: source.language
      });
      setIsLoadingSource(false); // Remettre à false pour les sources directes
      return;
    }
      // Pour VidMoly, passer le lien embed original au VidMolyPlayer
      if (source.isVidMoly) {
        console.log('🎬 Source VidMoly détectée, passage au VidMolyPlayer:', source.url);
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
        const m3u8Url = await extractVidzyM3u8(source.url);
        if (!m3u8Url) {
          throw new Error("Aucun lien m3u8 trouvé");
        }
        setSelectedSource({
          url: m3u8Url,
          type: "m3u8",
          name: source.name
        });
      } catch (error) {
        console.error("Erreur lors du chargement de la source:", error);
        const errorMessage = error instanceof Error ? error.message : "Erreur lors du chargement de la source";
        alert(`Erreur Vidzy: ${errorMessage}`);
      } finally {
        setIsLoadingSource(false);
      }
      return;
    }
    // Plus de sources statiques à gérer - toutes les sources viennent des APIs
  };
  const backdropUrl = series?.backdrop_path ? getImageUrl(series.backdrop_path, 'original') : "";
  if (isLoadingSeries) {
    return (
      <CommonLayout showSearch={true}>
      <div className="container mx-auto px-4 md:px-8 lg:px-12 py-8">
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
            <Tabs defaultValue="season-1" className="w-full" onValueChange={(value) => {
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
                    <div className="space-y-3">
                      {seasonDetails?.episodes?.map((episode: any) => (
                        <Card
                          key={episode.id}
                          className="p-4 hover-elevate active-elevate-2 cursor-pointer"
                          onClick={() => {
                            console.log('🔍 Clic sur épisode:', episode.episode_number);
                            setSelectedEpisode(episode.episode_number);
                          }}
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
                                console.log('🔍 Clic sur bouton Play épisode:', episode.episode_number);
                                // Si un épisode différent est sélectionné, fermer le lecteur actuel
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
                                <>
                                  {/* Sources de streaming unifiées */}
                                  <StreamingSources
                                    type="tv"
                                    id={seriesId}
                                    title={`${series?.name} - Saison ${selectedSeasonNumber} Épisode ${episode.episode_number}`}
                                    sources={episodeSources}
                                    genres={series?.genres}
                                    onSourceClick={handleSourceClick}
                                    isLoadingSource={isLoadingSource}
                                    season={selectedSeasonNumber}
                                    episode={episode.episode_number}
                                    imdbId={series?.imdb_id}
                                  />
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
                                  {selectedSource.isVidMoly ? (
                                    <VidMolyPlayer
                                      vidmolyUrl={selectedSource.url}
                                      title={`${series?.name || "Série"} - S${selectedSeasonNumber}E${selectedEpisode}`}
                                      posterPath={series.poster_path}
                                      mediaId={series?.id}
                                      mediaType="tv"
                                      backdropPath={series?.backdrop_path}
                                      seasonNumber={selectedSeasonNumber}
                                      episodeNumber={selectedEpisode}
                                    />
                                  ) : selectedSource.isDarki ? (
                                    <DarkiPlayer
                                      m3u8Url={selectedSource.url}
                                      title={`${series?.name || "Série"} - S${selectedSeasonNumber}E${selectedEpisode}`}
                                      posterPath={series.poster_path}
                                      quality={selectedSource.quality}
                                      language={selectedSource.language}
                                    />
                                  ) : (
                                    <VideoPlayer
                                      src={selectedSource.url}
                                      type={selectedSource.type}
                                      title={`${series?.name || "Série"} - S${selectedSeasonNumber}E${selectedEpisode}`}
                                      mediaId={series.id}
                                      mediaType="tv"
                                      posterPath={series.poster_path}
                                      backdropPath={series.backdrop_path}
                                      seasonNumber={selectedSeasonNumber}
                                      episodeNumber={selectedEpisode || undefined}
                                    />
                                  )}
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
              onItemClick={(item) => setLocation(`/series/${item.id}`)}
            />
          </div>
        )}
          </div>
    </CommonLayout>
  );
}
