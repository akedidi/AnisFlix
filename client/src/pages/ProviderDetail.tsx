import { useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import MediaCarousel from "@/components/MediaCarousel";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import {
  useMoviesByProvider,
  useSeriesByProvider,
  useMoviesByProviderAndGenre,
  useSeriesByProviderAndGenre,
} from "@/hooks/useTMDB";
import { useScrollPosition } from "@/hooks/useScrollPosition";
import CommonLayout from "@/components/CommonLayout";

// Types
interface Provider {
  id: number;
  name: string;
  logoPath: string | null;
  description?: string;
}

// Providers
const providers: Record<number, Provider> = {
  8: {
    id: 8,
    name: "Netflix",
    logoPath: "/pbpMk2JmcoNnQwx5JGpXngfoWtp.jpg",
    description:
      "Netflix est une plateforme de streaming qui propose une vaste sélection de films, séries télévisées et documentaires.",
  },
  9: {
    id: 9,
    name: "Amazon Prime Video",
    logoPath: "/pvske1MyAoymrs5bguRfVqYiM9a.jpg",
    description:
      "Amazon Prime Video offre un catalogue étendu de films et séries originales exclusives.",
  },
  350: {
    id: 350,
    name: "Apple TV+",
    logoPath: "/6uhKBfmtzFqOcLousHwZuzcrScK.jpg",
    description:
      "Apple TV+ présente des contenus originaux de haute qualité, films et séries primés.",
  },
  531: {
    id: 531,
    name: "Paramount+",
    logoPath: "/h5DcR0J2EESLitnhR8xLG1QymTE.jpg",
    description:
      "Paramount+ propose des films et séries de Paramount Pictures et autres studios.",
  },
  337: {
    id: 337,
    name: "Disney+",
    logoPath: "/7rwgEs15tFwyR9NPQ5vpzxTj19Q.jpg",
    description:
      "Disney+ regroupe les films Disney, Marvel, Star Wars, Pixar et National Geographic.",
  },
  1899: {
    id: 1899,
    name: "HBO Max",
    logoPath: "/jbe4gVSfRlbPTdESXhEKpornsfu.jpg",
    description:
      "HBO Max offre des séries primées, films et contenus exclusifs Warner Bros.",
  },
};

export default function ProviderDetail() {
  const { t } = useLanguage();
  const [, params] = useRoute("/provider/:id");
  const [, navigate] = useLocation();

  const providerId = params?.id ? Number(params.id) : NaN;
  const provider = Number.isFinite(providerId) ? providers[providerId] : undefined;

  const { restoreScrollPosition } = useScrollPosition(`provider-${providerId}`);

  // Guard: provider inconnu
  if (!provider) {
  const handleRefresh = () => {
    window.location.reload();
  };


    return (

      <CommonLayout showSearch={true} onRefresh={handleRefresh}>

        
        <div className="container mx-auto px-4 md:px-8 lg:px-12 py-12">
          <h1 className="text-2xl font-semibold mb-2">{t("provider.notFound") || "Fournisseur introuvable"}</h1>
          <p className="text-muted-foreground">
            {t("provider.chooseAnother") || "Veuillez sélectionner un autre fournisseur."}
          </p>
        </div>
          

        </CommonLayout>

      );

      }

  const imageUrl = provider.logoPath
    ? `https://image.tmdb.org/t/p/w185${provider.logoPath}`
    : "/placeholder.svg";

  // Fetch data
  const { data: moviesData, isLoading: moviesLoading } = useMoviesByProvider(provider.id);
  const { data: seriesData, isLoading: seriesLoading } = useSeriesByProvider(provider.id);

  const movies = moviesData?.results ?? [];
  const series = seriesData?.results ?? [];

  // Language change → reload
  useEffect(() => {
    const handleLanguageChange = () => window.location.reload();
    window.addEventListener("languageChange", handleLanguageChange);
    return () => window.removeEventListener("languageChange", handleLanguageChange);
  }, []);

  // Restore scroll quand les listes sont prêtes
  useEffect(() => {
    if (!moviesLoading && !seriesLoading) {
      const timer = setTimeout(() => restoreScrollPosition(), 0);
      return () => clearTimeout(timer);
    }
  }, [moviesLoading, seriesLoading, restoreScrollPosition]);

  // Movies by genre
  const { data: actionMoviesData } = useMoviesByProviderAndGenre(provider.id, 28);
  const { data: adventureMoviesData } = useMoviesByProviderAndGenre(provider.id, 12);
  const { data: comedyMoviesData } = useMoviesByProviderAndGenre(provider.id, 35);
  const { data: dramaMoviesData } = useMoviesByProviderAndGenre(provider.id, 18);
  const { data: fantasyMoviesData } = useMoviesByProviderAndGenre(provider.id, 14);
  const { data: sciFiMoviesData } = useMoviesByProviderAndGenre(provider.id, 878);
  const { data: horrorMoviesData } = useMoviesByProviderAndGenre(provider.id, 27);
  const { data: thrillerMoviesData } = useMoviesByProviderAndGenre(provider.id, 53);
  const { data: crimeMoviesData } = useMoviesByProviderAndGenre(provider.id, 80);
  const { data: romanceMoviesData } = useMoviesByProviderAndGenre(provider.id, 10749);
  const { data: animationMoviesData } = useMoviesByProviderAndGenre(provider.id, 16);

  // Series by genre
  const { data: actionSeriesData } = useSeriesByProviderAndGenre(provider.id, 10759);
  const { data: adventureSeriesData } = useSeriesByProviderAndGenre(provider.id, 12);
  const { data: comedySeriesData } = useSeriesByProviderAndGenre(provider.id, 35);
  const { data: dramaSeriesData } = useSeriesByProviderAndGenre(provider.id, 18);
  const { data: fantasySeriesData } = useSeriesByProviderAndGenre(provider.id, 14);
  const { data: sciFiSeriesData } = useSeriesByProviderAndGenre(provider.id, 878);
  const { data: horrorSeriesData } = useSeriesByProviderAndGenre(provider.id, 27);
  const { data: thrillerSeriesData } = useSeriesByProviderAndGenre(provider.id, 53);
  const { data: crimeSeriesData } = useSeriesByProviderAndGenre(provider.id, 80);
  const { data: romanceSeriesData } = useSeriesByProviderAndGenre(provider.id, 10749);
  const { data: animationSeriesData } = useSeriesByProviderAndGenre(provider.id, 16);

  return (
    <CommonLayout showSearch>
      <div className="container mx-auto px-4 md:px-8 lg:px-12 py-8">
        {/* Provider Header */}
        <div className="flex items-center gap-6 mb-8">
          <img
            src={imageUrl}
            alt={provider.name}
            className="w-16 h-16 object-contain rounded-lg"
          />
          <div>
            <h1 className="text-3xl font-bold mb-2">{provider.name}</h1>
            <p className="text-muted-foreground">{provider.description}</p>
          </div>
        </div>

        {/* Movies Section */}
        {movies.length > 0 && (
          <div className="mb-12">
            <MediaCarousel
              title="Films"
              items={movies}
              onItemClick={(item) => navigate(`/movie/${item.id}`)}
              showSeeAllButton={true}
              sectionId={`provider/${provider.id}/movies`}
            />
          </div>
        )}

        {/* Series Section */}
        {series.length > 0 && (
          <div className="mb-12">
            <MediaCarousel
              title="Séries"
              items={series}
              onItemClick={(item) => navigate(`/series/${item.id}`)}
              showSeeAllButton={true}
              sectionId={`provider/${provider.id}/series`}
            />
          </div>
        )}

        {/* Movies by Genre */}
        {actionMoviesData?.results && actionMoviesData.results.length > 0 && (
          <div className="mb-8">
            <MediaCarousel
              title="Films d'Action"
              items={actionMoviesData.results}
              onItemClick={(item) => navigate(`/movie/${item.id}`)}
              showSeeAllButton={true}
              sectionId={`provider/${provider.id}/movies/action`}
            />
          </div>
        )}

        {dramaMoviesData?.results && dramaMoviesData.results.length > 0 && (
          <div className="mb-8">
            <MediaCarousel
              title="Films de Drame"
              items={dramaMoviesData.results}
              onItemClick={(item) => navigate(`/movie/${item.id}`)}
              showSeeAllButton={true}
              sectionId={`provider/${provider.id}/movies/drama`}
            />
          </div>
        )}

        {comedyMoviesData?.results && comedyMoviesData.results.length > 0 && (
          <div className="mb-8">
            <MediaCarousel
              title="Films de Comédie"
              items={comedyMoviesData.results}
              onItemClick={(item) => navigate(`/movie/${item.id}`)}
              showSeeAllButton={true}
              sectionId={`provider/${provider.id}/movies/comedy`}
            />
          </div>
        )}

        {/* Series by Genre */}
        {actionSeriesData?.results && actionSeriesData.results.length > 0 && (
          <div className="mb-8">
            <MediaCarousel
              title="Séries d'Action"
              items={actionSeriesData.results}
              onItemClick={(item) => navigate(`/series/${item.id}`)}
              showSeeAllButton={true}
              sectionId={`provider/${provider.id}/series/action`}
            />
          </div>
        )}

        {dramaSeriesData?.results && dramaSeriesData.results.length > 0 && (
          <div className="mb-8">
            <MediaCarousel
              title="Séries de Drame"
              items={dramaSeriesData.results}
              onItemClick={(item) => navigate(`/series/${item.id}`)}
              showSeeAllButton={true}
              sectionId={`provider/${provider.id}/series/drama`}
            />
          </div>
        )}

        {comedySeriesData?.results && comedySeriesData.results.length > 0 && (
          <div className="mb-8">
            <MediaCarousel
              title="Séries de Comédie"
              items={comedySeriesData.results}
              onItemClick={(item) => navigate(`/series/${item.id}`)}
              showSeeAllButton={true}
              sectionId={`provider/${provider.id}/series/comedy`}
            />
          </div>
        )}
      </div>
    </CommonLayout>
  );
}
