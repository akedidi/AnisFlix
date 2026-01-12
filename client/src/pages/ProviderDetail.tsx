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
  384: {
    id: 384,
    name: "HBO Max",
    logoPath: "/jbe4gVSfRlbPTdESXhEKpornsfu.jpg",
    description:
      "HBO Max offre des séries primées, films et contenus exclusifs Warner Bros.",
  },
  283: {
    id: 283,
    name: "Crunchyroll",
    logoPath: "/fzN5Jok5Ig1eJ7gyNGoMhnLSCfh.jpg",
    description:
      "Crunchyroll est la plateforme de référence pour l'anime, proposant des milliers de séries et films d'animation japonaise.",
  },
  381: {
    id: 381,
    name: "Canal+",
    logoPath: "/geOzgeKZWpZC3lymAVEHVIk3X0q.jpg",
    description: "Canal+ propose une large sélection de films récents, de séries originales Création Originale et de sports.",
  },
  415: {
    id: 415,
    name: "ADN",
    logoPath: "/w86FOwg0bbgUSHWWnjOTuEjsUvq.jpg",
    description: "Animation Digital Network (ADN) est dédié à l'animation japonaise et franco-belge en streaming.",
  },
  234: {
    id: 234,
    name: "Arte",
    logoPath: "/vPZrjHe7wvALuwJEXT2kwYLi0gV.jpg",
    description: "Arte offre des programmes culturels, des documentaires, et du cinéma d'auteur européen et international.",
  },
  11: {
    id: 11,
    name: "MUBI",
    logoPath: "/x570VpH2C9EKDf1riP83rYc5dnL.jpg",
    description: "MUBI est un service de streaming de films d’auteur, classiques et indépendants, choisis par des experts.",
  },
  1754: {
    id: 1754,
    name: "TF1+",
    logoPath: "/blrBF9R2ONYu04ifGkYEb3k779N.jpg",
    description: "TF1+ est la plateforme de streaming du groupe TF1, proposant replay, films et séries exclusifs.",
  },
  147: {
    id: 147,
    name: "M6+",
    logoPath: "/tmYzlEKeiWStvXwC1QdpXIASpN4.jpg",
    description: "M6+ est la plateforme de streaming du groupe M6, avec replay, direct et contenus inédits.",
  },
  386: {
    id: 386,
    name: "Peacock",
    logoPath: "/2aGrp1xw3qhwCYvNGAJZPdjfeeX.jpg",
    description: "Peacock est un service de streaming américain de NBCUniversal, offrant des films, séries et événements sportifs.",
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

  // Logic Region: iOS Strategy
  // Amazon (9) -> US, Others -> FR
  // Peacock (386) -> US
  const region = (provider.id === 9 || provider.id === 386) ? "US" : "FR";

  // Fetch data with specific region
  const { data: moviesData, isLoading: moviesLoading } = useMoviesByProvider(provider.id, 1, region);
  const { data: seriesData, isLoading: seriesLoading } = useSeriesByProvider(provider.id, 1, region);

  const movies = moviesData?.results ?? [];
  const series = seriesData?.results ?? [];

  // Movies by genre (Action 28, Drama 18, Comedy 35)
  const { data: actionMoviesData } = useMoviesByProviderAndGenre(provider.id, 28, 1, region);
  const { data: dramaMoviesData } = useMoviesByProviderAndGenre(provider.id, 18, 1, region);
  const { data: comedyMoviesData } = useMoviesByProviderAndGenre(provider.id, 35, 1, region);

  // Series by genre (Action 10759, Drama 18, Comedy 35)
  const { data: actionSeriesData } = useSeriesByProviderAndGenre(provider.id, 10759, 1, region);
  const { data: dramaSeriesData } = useSeriesByProviderAndGenre(provider.id, 18, 1, region);
  const { data: comedySeriesData } = useSeriesByProviderAndGenre(provider.id, 35, 1, region);

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

  return (
    <CommonLayout showSearch>
      <div className="container mx-auto px-4 md:px-8 lg:px-12 pt-2 pb-8 md:py-8 -mt-12 md:mt-0">
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

        {/* 1. Films */}
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

        {/* 2. Series */}
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

        {/* 3. Films Action */}
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

        {/* 4. Films Drame */}
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

        {/* 5. Films Comédie */}
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

        {/* 6. Series Action */}
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

        {/* 7. Series Drame */}
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

        {/* 8. Series Comédie */}
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
