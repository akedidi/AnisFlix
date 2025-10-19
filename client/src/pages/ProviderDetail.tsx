import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import {  Star  } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import MediaCarousel from "@/components/MediaCarousel";
import SearchBar from "@/components/SearchBar";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageSelect from "@/components/LanguageSelect";
import DesktopSidebar from "@/components/DesktopSidebar";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { 
  useMoviesByProvider,
  useSeriesByProvider,
  useMoviesByProviderAndGenre,
  useSeriesByProviderAndGenre,
  useMultiSearch
} from "@/hooks/useTMDB";
import { useScrollPosition } from "@/hooks/useScrollPosition";

// Interface pour les données du provider
interface Provider {
  id: number;
  name: string;
  logoPath: string | null;
  description?: string;
}

// Providers avec leurs informations détaillées
const providers: Record<number, Provider> = {
  8: {
    id: 8,
    name: "Netflix",
    logoPath: "/pbpMk2JmcoNnQwx5JGpXngfoWtp.jpg",
    description: "Netflix est une plateforme de streaming qui propose une vaste sélection de films, séries télévisées et documentaires."
  },
  9: {
    id: 9,
    name: "Amazon Prime Video",
    logoPath: "/pvske1MyAoymrs5bguRfVqYiM9a.jpg",
    description: "Amazon Prime Video offre un catalogue étendu de films et séries originales exclusives."
  },
  350: {
    id: 350,
    name: "Apple TV+",
    logoPath: "/6uhKBfmtzFqOcLousHwZuzcrScK.jpg",
    description: "Apple TV+ présente des contenus originaux de haute qualité, films et séries primés."
  },
  531: {
    id: 531,
    name: "Paramount+",
    logoPath: "/h5DcR0J2EESLitnhR8xLG1QymTE.jpg",
    description: "Paramount+ propose des films et séries de Paramount Pictures et autres studios."
  },
  337: {
    id: 337,
    name: "Disney+",
    logoPath: "/7rwgEs15tFwyR9NPQ5vpzxTj19Q.jpg",
    description: "Disney+ regroupe les films Disney, Marvel, Star Wars, Pixar et National Geographic."
  },
  1899: {
    id: 1899,
    name: "HBO Max",
    logoPath: "/jbe4gVSfRlbPTdESXhEKpornsfu.jpg",
    description: "HBO Max offre des séries primées, films et contenus exclusifs Warner Bros."
  }
};

export default function ProviderDetail() {
  const { t } = useLanguage();
  const [, params] = useRoute("/provider/:id");
  const providerId = params?.id ? parseInt(params.id) : 0;
  const provider = providers[providerId];
  const { restoreScrollPosition } = useScrollPosition(`provider-${providerId}`);

  // État pour la recherche
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch data
  const { data: moviesData, isLoading: moviesLoading } = useMoviesByProvider(providerId);
  const { data: seriesData, isLoading: seriesLoading } = useSeriesByProvider(providerId);
  const { data: searchResults = [] } = useMultiSearch(searchQuery);
  
  const movies = moviesData?.results || [];
  const series = seriesData?.results || [];

  // Listen to language changes
  useEffect(() => {
    const handleLanguageChange = () => {
      window.location.reload();
    };
    window.addEventListener('languageChange', handleLanguageChange);
    return () => window.removeEventListener('languageChange', handleLanguageChange);
  }, []);

  // Restaurer la position de scroll au chargement
  useEffect(() => {
    // Attendre que les données soient chargées
    const timer = setTimeout(() => {
      restoreScrollPosition();
    }, 500);
    
    return () => clearTimeout(timer);
  }, [restoreScrollPosition]);

  // Films par genre pour les catégories - Filtrés par provider
  const { data: actionMoviesData } = useMoviesByProviderAndGenre(providerId, 28); // Action
  const { data: adventureMoviesData } = useMoviesByProviderAndGenre(providerId, 12); // Aventure
  const { data: comedyMoviesData } = useMoviesByProviderAndGenre(providerId, 35); // Comédie
  const { data: dramaMoviesData } = useMoviesByProviderAndGenre(providerId, 18); // Drame
  const { data: fantasyMoviesData } = useMoviesByProviderAndGenre(providerId, 14); // Fantastique
  const { data: sciFiMoviesData } = useMoviesByProviderAndGenre(providerId, 878); // Science-fiction
  const { data: horrorMoviesData } = useMoviesByProviderAndGenre(providerId, 27); // Horreur
  const { data: thrillerMoviesData } = useMoviesByProviderAndGenre(providerId, 53); // Thriller
  const { data: crimeMoviesData } = useMoviesByProviderAndGenre(providerId, 80); // Policier
  const { data: romanceMoviesData } = useMoviesByProviderAndGenre(providerId, 10749); // Romance
  const { data: animationMoviesData } = useMoviesByProviderAndGenre(providerId, 16); // Animation
  const { data: documentaryMoviesData } = useMoviesByProviderAndGenre(providerId, 99); // Documentaire
  
  const actionMovies = actionMoviesData?.results || [];
  const adventureMovies = adventureMoviesData?.results || [];
  const comedyMovies = comedyMoviesData?.results || [];
  const dramaMovies = dramaMoviesData?.results || [];
  const fantasyMovies = fantasyMoviesData?.results || [];
  const sciFiMovies = sciFiMoviesData?.results || [];
  const horrorMovies = horrorMoviesData?.results || [];
  const thrillerMovies = thrillerMoviesData?.results || [];
  const crimeMovies = crimeMoviesData?.results || [];
  const romanceMovies = romanceMoviesData?.results || [];
  const animationMovies = animationMoviesData?.results || [];
  const documentaryMovies = documentaryMoviesData?.results || [];

  // Séries par genre (IDs différents des films) - Filtrées par provider
  const { data: actionSeriesData } = useSeriesByProviderAndGenre(providerId, 10759); // Action & Adventure
  const { data: adventureSeriesData } = useSeriesByProviderAndGenre(providerId, 10759); // Action & Adventure (même que Action)
  const { data: comedySeriesData } = useSeriesByProviderAndGenre(providerId, 35); // Comédie
  const { data: dramaSeriesData } = useSeriesByProviderAndGenre(providerId, 18); // Drame
  const { data: fantasySeriesData } = useSeriesByProviderAndGenre(providerId, 10765); // Sci-Fi & Fantasy
  const { data: sciFiSeriesData } = useSeriesByProviderAndGenre(providerId, 10765); // Sci-Fi & Fantasy
  const { data: thrillerSeriesData } = useSeriesByProviderAndGenre(providerId, 9648); // Mystery (pas de thriller pour les séries)
  const { data: crimeSeriesData } = useSeriesByProviderAndGenre(providerId, 80); // Crime
  const { data: romanceSeriesData } = useSeriesByProviderAndGenre(providerId, 10749); // Romance
  const { data: animationSeriesData } = useSeriesByProviderAndGenre(providerId, 16); // Animation
  const { data: documentarySeriesData } = useSeriesByProviderAndGenre(providerId, 99); // Documentaire
  
  const actionSeries = actionSeriesData?.results || [];
  const adventureSeries = adventureSeriesData?.results || [];
  const comedySeries = comedySeriesData?.results || [];
  const dramaSeries = dramaSeriesData?.results || [];
  const fantasySeries = fantasySeriesData?.results || [];
  const sciFiSeries = sciFiSeriesData?.results || [];
  const thrillerSeries = thrillerSeriesData?.results || [];
  const crimeSeries = crimeSeriesData?.results || [];
  const romanceSeries = romanceSeriesData?.results || [];
  const animationSeries = animationSeriesData?.results || [];
  const documentarySeries = documentarySeriesData?.results || [];

  if (!provider) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Provider non trouvé</h1>
          
        </div>
      </div>
    );
  }

  const imageUrl = provider.logoPath
    ? `https://image.tmdb.org/t/p/original${provider.logoPath}`
    : "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='%23334155' width='200' height='200'/%3E%3C/svg%3E";

  return (
    <div className="min-h-screen fade-in-up">
      {/* Desktop Sidebar */}
      <DesktopSidebar />
      
      {/* Main Content */}
      <div className="md:ml-64">
        {/* Content with top padding for fixed search bar */}
        <div className="pt-20 md:pt-0">
          {/* Header avec recherche et contrôles */}
          <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border relative md:relative fixed top-0 left-0 right-0 z-40 md:z-auto">
            <div className="container mx-auto px-4 md:px-8 lg:px-12 py-4">
              <div className="flex items-center gap-4">
                
              <div className="flex-1">
                <SearchBar
                  onSearch={setSearchQuery}
                  suggestions={searchQuery ? searchResults : []}
                  onSelect={(item) => {
                    const path = item.mediaType === 'movie' ? `/movie/${item.id}` : `/series/${item.id}`;
                    window.location.href = path;
                  }}
                />
              </div>
              <LanguageSelect />
              <ThemeToggle />
            </div>
          </div>
        </div>

      {/* Header avec logo et description */}
      <div className="relative bg-gradient-to-b from-primary/20 to-background">
        <div className="container mx-auto px-4 md:px-8 lg:px-12 py-8">
          <div className="flex items-start gap-6">
            <div className="w-32 h-32 rounded-2xl bg-muted flex items-center justify-center overflow-hidden p-4 flex-shrink-0">
              <img
                src={imageUrl}
                alt={provider.name}
                className="w-full h-full object-contain"
              />
            </div>
            
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl md:text-4xl font-bold mb-2">{provider.name}</h1>
              <p className="text-muted-foreground mb-4 max-w-2xl">
                {provider.description}
              </p>
              
              <div className="flex items-center gap-4 mb-6">
          <Badge variant="secondary" className="text-sm">
            {t("provider.streaming")}
          </Badge>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Contenu fusionné */}
      <div className="container mx-auto px-4 md:px-8 lg:px-12 py-8 space-y-8">
        {/* Derniers films */}
        {movies.length > 0 && (
          <MediaCarousel
            title={t("provider.latestMovies")}
            items={movies.slice(0, 20)}
            onItemClick={(item) => window.location.href = `/movie/${item.id}`}
            showSeeAllButton={true}
          />
        )}
        
        {movies.length === 0 && !moviesLoading && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Aucun film disponible sur {provider.name}</p>
          </div>
        )}

        {/* Dernières séries */}
        {series.length > 0 && (
          <MediaCarousel
            title={t("provider.latestSeries")}
            items={series.slice(0, 20)}
            onItemClick={(item) => window.location.href = `/series/${item.id}`}
            showSeeAllButton={true}
          />
        )}
        
        {series.length === 0 && !seriesLoading && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Aucune série disponible sur {provider.name}</p>
          </div>
        )}

        {/* Films par catégorie */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">{t("provider.moviesByCategory")}</h2>
          
          <MediaCarousel
            title={t("movies.action")}
            items={actionMovies.slice(0, 10)}
            onItemClick={(item) => window.location.href = `/movie/${item.id}`}
            showSeeAllButton={true}
            sectionId={`provider/${providerId}/films/category/action`}
          />
          
          <MediaCarousel
            title={t("movies.adventure")}
            items={adventureMovies.slice(0, 10)}
            onItemClick={(item) => window.location.href = `/movie/${item.id}`}
            showSeeAllButton={true}
            sectionId={`provider/${providerId}/films/category/aventure`}
          />
          
          <MediaCarousel
            title={t("movies.comedy")}
            items={comedyMovies.slice(0, 10)}
            onItemClick={(item) => window.location.href = `/movie/${item.id}`}
            showSeeAllButton={true}
            sectionId={`provider/${providerId}/films/category/comedie`}
          />
          
          <MediaCarousel
            title={t("movies.drama")}
            items={dramaMovies.slice(0, 10)}
            onItemClick={(item) => window.location.href = `/movie/${item.id}`}
            showSeeAllButton={true}
            sectionId={`provider/${providerId}/films/category/drame`}
          />
          
          <MediaCarousel
            title={t("movies.fantasy")}
            items={fantasyMovies.slice(0, 10)}
            onItemClick={(item) => window.location.href = `/movie/${item.id}`}
            showSeeAllButton={true}
            sectionId={`provider/${providerId}/films/category/fantastique`}
          />
          
          <MediaCarousel
            title={t("movies.scifi")}
            items={sciFiMovies.slice(0, 10)}
            onItemClick={(item) => window.location.href = `/movie/${item.id}`}
            showSeeAllButton={true}
            sectionId={`provider/${providerId}/films/category/science-fiction`}
          />
          
          <MediaCarousel
            title={t("movies.horror")}
            items={horrorMovies.slice(0, 10)}
            onItemClick={(item) => window.location.href = `/movie/${item.id}`}
            showSeeAllButton={true}
            sectionId={`provider/${providerId}/films/category/horreur`}
          />
          
          <MediaCarousel
            title={t("movies.thriller")}
            items={thrillerMovies.slice(0, 10)}
            onItemClick={(item) => window.location.href = `/movie/${item.id}`}
            showSeeAllButton={true}
            sectionId={`provider/${providerId}/films/category/thriller`}
          />
          
          <MediaCarousel
            title={t("movies.crime")}
            items={crimeMovies.slice(0, 10)}
            onItemClick={(item) => window.location.href = `/movie/${item.id}`}
            showSeeAllButton={true}
            sectionId={`provider/${providerId}/films/category/crime`}
          />
          
          <MediaCarousel
            title={t("movies.romance")}
            items={romanceMovies.slice(0, 10)}
            onItemClick={(item) => window.location.href = `/movie/${item.id}`}
            showSeeAllButton={true}
            sectionId={`provider/${providerId}/films/category/romance`}
          />
          
          <MediaCarousel
            title={t("movies.animation")}
            items={animationMovies.slice(0, 10)}
            onItemClick={(item) => window.location.href = `/movie/${item.id}`}
            showSeeAllButton={true}
            sectionId={`provider/${providerId}/films/category/animation`}
          />
          
          <MediaCarousel
            title={t("movies.documentary")}
            items={documentaryMovies.slice(0, 10)}
            onItemClick={(item) => window.location.href = `/movie/${item.id}`}
            showSeeAllButton={true}
            sectionId={`provider/${providerId}/films/category/documentaire`}
          />
        </div>

        {/* Séries par catégorie */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">{t("provider.seriesByCategory")}</h2>
          
          <MediaCarousel
            title={t("series.action")}
            items={actionSeries.slice(0, 10)}
            onItemClick={(item) => window.location.href = `/series/${item.id}`}
            showSeeAllButton={true}
            sectionId={`provider/${providerId}/series/category/action`}
          />
          
          <MediaCarousel
            title={t("series.adventure")}
            items={adventureSeries.slice(0, 10)}
            onItemClick={(item) => window.location.href = `/series/${item.id}`}
            showSeeAllButton={true}
            sectionId={`provider/${providerId}/series/category/aventure`}
          />
          
          <MediaCarousel
            title={t("series.comedy")}
            items={comedySeries.slice(0, 10)}
            onItemClick={(item) => window.location.href = `/series/${item.id}`}
            showSeeAllButton={true}
            sectionId={`provider/${providerId}/series/category/comedie`}
          />
          
          <MediaCarousel
            title={t("series.drama")}
            items={dramaSeries.slice(0, 10)}
            onItemClick={(item) => window.location.href = `/series/${item.id}`}
            showSeeAllButton={true}
            sectionId={`provider/${providerId}/series/category/drame`}
          />
          
          <MediaCarousel
            title={t("series.fantasy")}
            items={fantasySeries.slice(0, 10)}
            onItemClick={(item) => window.location.href = `/series/${item.id}`}
            showSeeAllButton={true}
            sectionId={`provider/${providerId}/series/category/fantastique`}
          />
          
          <MediaCarousel
            title={t("series.scifi")}
            items={sciFiSeries.slice(0, 10)}
            onItemClick={(item) => window.location.href = `/series/${item.id}`}
            showSeeAllButton={true}
            sectionId={`provider/${providerId}/series/category/science-fiction`}
          />
          
          <MediaCarousel
            title={t("series.thriller")}
            items={thrillerSeries.slice(0, 10)}
            onItemClick={(item) => window.location.href = `/series/${item.id}`}
            showSeeAllButton={true}
            sectionId={`provider/${providerId}/series/category/thriller`}
          />
          
          <MediaCarousel
            title={t("series.crime")}
            items={crimeSeries.slice(0, 10)}
            onItemClick={(item) => window.location.href = `/series/${item.id}`}
            showSeeAllButton={true}
            sectionId={`provider/${providerId}/series/category/crime`}
          />
          
          <MediaCarousel
            title={t("series.romance")}
            items={romanceSeries.slice(0, 10)}
            onItemClick={(item) => window.location.href = `/series/${item.id}`}
            showSeeAllButton={true}
            sectionId={`provider/${providerId}/series/category/romance`}
          />
          
          <MediaCarousel
            title={t("series.animation")}
            items={animationSeries.slice(0, 10)}
            onItemClick={(item) => window.location.href = `/series/${item.id}`}
            showSeeAllButton={true}
            sectionId={`provider/${providerId}/series/category/animation`}
          />
          
          <MediaCarousel
            title={t("series.documentary")}
            items={documentarySeries.slice(0, 10)}
            onItemClick={(item) => window.location.href = `/series/${item.id}`}
            showSeeAllButton={true}
            sectionId={`provider/${providerId}/series/category/documentaire`}
          />
        </div>

      </div>
        </div>
      </div>
    </div>
  );
}
