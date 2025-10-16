import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Star, Calendar, X, Heart } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageSelect from "@/components/LanguageSelect";
import MediaCarousel from "@/components/MediaCarousel";
import SearchBar from "@/components/SearchBar";
import DesktopSidebar from "@/components/DesktopSidebar";
import { useSeriesByGenre, useMultiSearch } from "@/hooks/useTMDB";
import { useFavorites } from "@/hooks/useFavorites";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useScrollPosition } from "@/hooks/useScrollPosition";

export default function AnimeSeriesLatest() {
  const [searchQuery, setSearchQuery] = useState("");
  const [, setLocation] = useLocation();
  const { t } = useLanguage();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { scrollY } = useScrollPosition();
  
  // Fetch anime series (genre 16 = Animation)
  const { data: animeSeriesData } = useSeriesByGenre(16);
  const { data: searchResults = [] } = useMultiSearch(searchQuery);
  
  const animeSeries = animeSeriesData?.results || [];

  return (
    <div className="min-h-screen bg-background">
      <DesktopSidebar />
      
      <div className="lg:pl-64">
        {/* Header fixe */}
        <div className={`sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b transition-all duration-200 ${scrollY > 10 ? 'shadow-sm' : ''}`}>
          <div className="container mx-auto px-4 md:px-8 lg:px-12">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLocation('/')}
                  className="flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Retour
                </Button>
                <h1 className="text-xl font-semibold">Dernières séries anime</h1>
              </div>
              
              <div className="flex items-center gap-2">
                <SearchBar
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Rechercher des séries anime..."
                />
                <LanguageSelect />
                <ThemeToggle />
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 md:px-8 lg:px-12 py-8 space-y-8 md:space-y-12">
          {animeSeries.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
              {animeSeries.map((series) => (
                <div key={series.id} className="w-full">
                  <div
                    className="group relative overflow-hidden cursor-pointer content-card bg-card rounded-lg shadow-sm hover:shadow-lg transition-all duration-200"
                    onClick={() => setLocation(`/series/${series.id}`)}
                  >
                    <div className="relative aspect-[2/3]">
                      <img
                        src={`https://image.tmdb.org/t/p/w342${series.poster_path}`}
                        alt={series.name}
                        className="w-full h-full object-cover object-center image-zoom"
                        loading="lazy"
                      />
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/50 hover:bg-black/70 text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite({
                            id: series.id,
                            title: series.name,
                            posterPath: series.poster_path,
                            rating: series.vote_average,
                            year: series.first_air_date?.split('-')[0] || '',
                            mediaType: 'series'
                          });
                        }}
                      >
                        <Heart 
                          className={`w-4 h-4 ${isFavorite(series.id, 'series') ? 'fill-red-500 text-red-500' : ''}`} 
                        />
                      </Button>
                    </div>
                    
                    <div className="p-3">
                      <h3 className="font-semibold text-sm line-clamp-2 mb-1">
                        {series.name}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          <span>{series.vote_average.toFixed(1)}</span>
                        </div>
                        {series.first_air_date && (
                          <span>{series.first_air_date.split('-')[0]}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Aucune série anime trouvée</p>
            </div>
          )}
        </div>
      </div>
      
    </div>
  );
}
