import { useState } from "react";
import SearchBar from "@/components/SearchBar";
import MediaCarousel from "@/components/MediaCarousel";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageToggle from "@/components/LanguageToggle";

export default function Movies() {
  const [searchQuery, setSearchQuery] = useState("");

  // todo: remove mock functionality
  const mockLatestMovies = [
    { id: 1, title: "The Shawshank Redemption", posterPath: "/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg", rating: 9.3, year: "1994", mediaType: "movie" as const },
    { id: 2, title: "The Godfather", posterPath: "/3bhkrj58Vtu7enYsRolD1fZdja1.jpg", rating: 9.2, year: "1972", mediaType: "movie" as const },
    { id: 3, title: "The Dark Knight", posterPath: "/qJ2tW6WMUDux911r6m7haRef0WH.jpg", rating: 9.0, year: "2008", mediaType: "movie" as const },
  ];

  const mockActionMovies = [
    { id: 4, title: "The Dark Knight", posterPath: "/qJ2tW6WMUDux911r6m7haRef0WH.jpg", rating: 9.0, year: "2008", mediaType: "movie" as const },
    { id: 5, title: "Inception", posterPath: "/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg", rating: 8.8, year: "2010", mediaType: "movie" as const },
    { id: 6, title: "Mad Max: Fury Road", posterPath: "/hA2ple9q4qnwxp3hKVNhroipsir.jpg", rating: 8.1, year: "2015", mediaType: "movie" as const },
  ];

  const mockDramaMovies = [
    { id: 7, title: "The Shawshank Redemption", posterPath: "/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg", rating: 9.3, year: "1994", mediaType: "movie" as const },
    { id: 8, title: "The Godfather", posterPath: "/3bhkrj58Vtu7enYsRolD1fZdja1.jpg", rating: 9.2, year: "1972", mediaType: "movie" as const },
    { id: 9, title: "Forrest Gump", posterPath: "/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg", rating: 8.8, year: "1994", mediaType: "movie" as const },
  ];

  const mockCrimeMovies = [
    { id: 10, title: "Pulp Fiction", posterPath: "/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg", rating: 8.9, year: "1994", mediaType: "movie" as const },
    { id: 11, title: "The Godfather", posterPath: "/3bhkrj58Vtu7enYsRolD1fZdja1.jpg", rating: 9.2, year: "1972", mediaType: "movie" as const },
    { id: 12, title: "The Dark Knight", posterPath: "/qJ2tW6WMUDux911r6m7haRef0WH.jpg", rating: 9.0, year: "2008", mediaType: "movie" as const },
  ];

  const mockMysteryMovies = [
    { id: 13, title: "Inception", posterPath: "/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg", rating: 8.8, year: "2010", mediaType: "movie" as const },
    { id: 14, title: "Shutter Island", posterPath: "/52d7CAy5LlPrjPd87dQM5lH7gR2.jpg", rating: 8.2, year: "2010", mediaType: "movie" as const },
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
                onSelect={(item) => window.location.href = `/movie/${item.id}`}
              />
            </div>
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-8 lg:px-12 py-8 space-y-8 md:space-y-12">
        <h1 className="text-3xl md:text-4xl font-bold">Films</h1>

        <MediaCarousel
          title="Derniers films"
          items={mockLatestMovies}
          onItemClick={(item) => window.location.href = `/movie/${item.id}`}
          seeAllLink="/latest-movies"
        />

        <MediaCarousel
          title="Action"
          items={mockActionMovies}
          onItemClick={(item) => window.location.href = `/movie/${item.id}`}
        />

        <MediaCarousel
          title="Drame"
          items={mockDramaMovies}
          onItemClick={(item) => window.location.href = `/movie/${item.id}`}
        />

        <MediaCarousel
          title="Crime"
          items={mockCrimeMovies}
          onItemClick={(item) => window.location.href = `/movie/${item.id}`}
        />

        <MediaCarousel
          title="Mystère"
          items={mockMysteryMovies}
          onItemClick={(item) => window.location.href = `/movie/${item.id}`}
        />
      </div>
    </div>
  );
}
