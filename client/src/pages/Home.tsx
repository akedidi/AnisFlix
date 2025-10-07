import { useState } from "react";
import HeroSection from "@/components/HeroSection";
import MediaCarousel from "@/components/MediaCarousel";
import SearchBar from "@/components/SearchBar";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageToggle from "@/components/LanguageToggle";
import ProviderCard from "@/components/ProviderCard";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");

  // todo: remove mock functionality
  const mockFeatured = {
    title: "Inception",
    overview: "Dom Cobb est un voleur expérimenté – le meilleur qui soit dans l'art périlleux de l'extraction : sa spécialité consiste à s'approprier les secrets les plus précieux d'un individu, enfouis au plus profond de son subconscient.",
    backdropPath: "/s3TBrRGB1iav7gFOCNx3H31MoES.jpg",
    rating: 8.8,
    year: "2010",
    mediaType: "movie" as const,
  };

  const mockContinueWatching = [
    { id: 1, title: "Breaking Bad", posterPath: "/ggFHVNu6YYI5L9pCfOacjizRGt.jpg", rating: 9.5, year: "2008", progress: 45, mediaType: "tv" as const },
    { id: 2, title: "Stranger Things", posterPath: "/49WJfeN0moxb9IPfGn8AIqMGskD.jpg", rating: 8.7, year: "2016", progress: 60, mediaType: "tv" as const },
  ];

  const mockMovies = [
    { id: 3, title: "The Shawshank Redemption", posterPath: "/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg", rating: 9.3, year: "1994", mediaType: "movie" as const },
    { id: 4, title: "The Godfather", posterPath: "/3bhkrj58Vtu7enYsRolD1fZdja1.jpg", rating: 9.2, year: "1972", mediaType: "movie" as const },
    { id: 5, title: "The Dark Knight", posterPath: "/qJ2tW6WMUDux911r6m7haRef0WH.jpg", rating: 9.0, year: "2008", mediaType: "movie" as const },
    { id: 6, title: "Pulp Fiction", posterPath: "/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg", rating: 8.9, year: "1994", mediaType: "movie" as const },
  ];

  const mockSeries = [
    { id: 7, title: "Game of Thrones", posterPath: "/7WUHnWGx5OO145IRxPDUkQSh4C7.jpg", rating: 9.3, year: "2011", mediaType: "tv" as const },
    { id: 8, title: "The Wire", posterPath: "/4lbclFySvugI51fwsyxBTOm4DqK.jpg", rating: 9.3, year: "2002", mediaType: "tv" as const },
    { id: 9, title: "True Detective", posterPath: "/aowr4xpLP5sRCL50TkuADomJ98T.jpg", rating: 8.9, year: "2014", mediaType: "tv" as const },
  ];

  const mockAnimes = [
    { id: 10, title: "Attack on Titan", posterPath: "/hTP1DtLGFamjfu8WqjnuQdP1n4i.jpg", rating: 9.0, year: "2013", mediaType: "anime" as const },
    { id: 11, title: "Death Note", posterPath: "/4RLOuqCbXO1KxqK9SgcCgj7E7Pc.jpg", rating: 9.0, year: "2006", mediaType: "anime" as const },
    { id: 12, title: "One Punch Man", posterPath: "/iE3s0lG5QVdEHOEZnoAxjmMtvne.jpg", rating: 8.7, year: "2015", mediaType: "anime" as const },
  ];

  const mockDocumentaries = [
    { id: 13, title: "Planet Earth II", posterPath: "/z4p0CyNL6YPxMH1JqZtFh3PpS8S.jpg", rating: 9.5, year: "2016", mediaType: "documentary" as const },
    { id: 14, title: "Blue Planet II", posterPath: "/592Uvp4JJ4XUPMmsuBzuWRAR25i.jpg", rating: 9.3, year: "2017", mediaType: "documentary" as const },
  ];

  // todo: remove mock functionality
  const mockProviders = [
    { id: 8, name: "Netflix", logoPath: "/pbpMk2JmcoNnQwx5JGpXngfoWtp.jpg", movieCount: 150, tvCount: 80 },
    { id: 9, name: "Amazon Prime", logoPath: "/emthp39XA2YScoYL1p0sdbAH2WA.jpg", movieCount: 120, tvCount: 65 },
    { id: 350, name: "Apple TV+", logoPath: "/6uhKBfmtzFqOcLousHwZuzcrScK.jpg", movieCount: 45, tvCount: 30 },
    { id: 531, name: "Paramount+", logoPath: "/xbhHHa1YgtpwhC8lb1NQ3ACVcLd.jpg", movieCount: 85, tvCount: 50 },
    { id: 337, name: "Disney+", logoPath: "/7rwgEs15tFwyR9NPQ5vpzxTj19Q.jpg", movieCount: 95, tvCount: 42 },
    { id: 384, name: "HBO Max", logoPath: "/Ajqyt5aNxNGjmF9uOfxArGrdf3X.jpg", movieCount: 70, tvCount: 55 },
  ];

  const mockSearchSuggestions = [
    { id: 1, title: "Inception", posterPath: "/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg", mediaType: "movie" as const, year: "2010" },
    { id: 2, title: "Interstellar", posterPath: "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg", mediaType: "movie" as const, year: "2014" },
  ];

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="container mx-auto px-4 md:px-8 lg:px-12 py-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <SearchBar
                onSearch={setSearchQuery}
                suggestions={searchQuery ? mockSearchSuggestions : []}
                onSelect={(item) => console.log("Selected:", item)}
              />
            </div>
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
      </div>

      <div className="space-y-8 md:space-y-12">
        <HeroSection
          {...mockFeatured}
          onFavorite={() => console.log("Favorite")}
          onInfo={() => console.log("Info")}
        />

        <div className="container mx-auto px-4 md:px-8 lg:px-12 space-y-8 md:space-y-12">
          <div className="space-y-4">
            <h2 className="text-2xl md:text-3xl font-semibold">Plateformes de streaming</h2>
            <ScrollArea className="w-full">
              <div className="flex gap-4 pb-4">
                {mockProviders.map((provider) => (
                  <div key={provider.id} className="w-40 flex-shrink-0">
                    <ProviderCard
                      {...provider}
                      onClick={() => console.log("Provider clicked:", provider.name)}
                    />
                  </div>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>

          {mockContinueWatching.length > 0 && (
            <MediaCarousel
              title="Continuer à regarder"
              items={mockContinueWatching}
              onItemClick={(item) => console.log("Clicked:", item)}
            />
          )}

          <MediaCarousel
            title="Films populaires"
            items={mockMovies}
            onItemClick={(item) => console.log("Clicked:", item)}
          />

          <MediaCarousel
            title="Séries tendances"
            items={mockSeries}
            onItemClick={(item) => console.log("Clicked:", item)}
          />

          <MediaCarousel
            title="Animes"
            items={mockAnimes}
            onItemClick={(item) => console.log("Clicked:", item)}
          />

          <MediaCarousel
            title="Documentaires"
            items={mockDocumentaries}
            onItemClick={(item) => console.log("Clicked:", item)}
          />
        </div>
      </div>
    </div>
  );
}
