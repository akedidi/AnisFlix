import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, Trash2, Play } from "lucide-react";
import MediaCard from "@/components/MediaCard";
import CommonLayout from "@/components/CommonLayout";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useMultiSearch } from "@/hooks/useTMDB";
import { useFavorites } from "@/hooks/useFavorites";

export default function Favorites() {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<'movies' | 'series'>('movies');
  const [, setLocation] = useLocation();
  const { data: searchResults = [] } = useMultiSearch(searchQuery);
  
  const {
    favorites,
    removeFromFavorites,
    getFavoritesByType,
    getFavoritesCount
  } = useFavorites();

  // Filtrer les favoris par type
  const movieFavorites = getFavoritesByType('movie');
  const seriesFavorites = getFavoritesByType('series');

  // Filtrer les résultats de recherche
  const movieSearchResults = searchResults.filter((item: any) => item.mediaType === 'movie');
  const seriesSearchResults = searchResults.filter((item: any) => item.mediaType === 'series');

  const handleTabChange = (tab: 'movies' | 'series') => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <CommonLayout title="Mes Favoris" showSearch={true}>
      <div className="container mx-auto px-4 md:px-8 lg:px-12 py-8">
          <div className="flex items-center gap-3 mb-8">
            <Heart className="w-8 h-8 text-red-500" />
            <h1 className="text-3xl md:text-4xl font-bold">Mes Favoris</h1>
          </div>

          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="movies" className="flex items-center gap-2">
                <Play className="w-4 h-4" />
                Films ({getFavoritesCount('movie')})
              </TabsTrigger>
              <TabsTrigger value="series" className="flex items-center gap-2">
                <Play className="w-4 h-4" />
                Séries ({getFavoritesCount('series')})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="movies" className="space-y-6">
              {movieFavorites.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                  {movieFavorites.map((movie) => (
                    <div key={`movie-${movie.id}`} className="relative group">
                      <MediaCard
                        id={movie.id}
                        title={movie.title}
                        posterPath={movie.posterPath}
                        rating={movie.rating}
                        year={movie.year}
                        mediaType="movie"
                        onItemClick={() => setLocation(`/movie/${movie.id}`)}
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFromFavorites(movie.id, 'movie');
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Heart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Aucun film favori</h3>
                  <p className="text-muted-foreground mb-4">
                    Ajoutez des films à vos favoris en cliquant sur l'icône cœur
                  </p>
                  <Button onClick={() => setLocation('/movies')}>
                    Découvrir des films
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="series" className="space-y-6">
              {seriesFavorites.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                  {seriesFavorites.map((series) => (
                    <div key={`series-${series.id}`} className="relative group">
                      <MediaCard
                        id={series.id}
                        title={series.title}
                        posterPath={series.posterPath}
                        rating={series.rating}
                        year={series.year}
                        mediaType="series"
                        onItemClick={() => setLocation(`/series/${series.id}`)}
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFromFavorites(series.id, 'series');
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Heart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Aucune série favorite</h3>
                  <p className="text-muted-foreground mb-4">
                    Ajoutez des séries à vos favoris en cliquant sur l'icône cœur
                  </p>
                  <Button onClick={() => setLocation('/series')}>
                    Découvrir des séries
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
    </CommonLayout>
  );
}
