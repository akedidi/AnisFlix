import { useState } from "react";
import SearchBar from "@/components/SearchBar";
import MediaCarousel from "@/components/MediaCarousel";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageToggle from "@/components/LanguageToggle";

export default function Series() {
  const [searchQuery, setSearchQuery] = useState("");

  // todo: remove mock functionality
  const mockLatestSeries = [
    { id: 1, title: "Breaking Bad", posterPath: "/ggFHVNu6YYI5L9pCfOacjizRGt.jpg", rating: 9.5, year: "2008", mediaType: "tv" as const },
    { id: 2, title: "Game of Thrones", posterPath: "/7WUHnWGx5OO145IRxPDUkQSh4C7.jpg", rating: 9.3, year: "2011", mediaType: "tv" as const },
    { id: 3, title: "Stranger Things", posterPath: "/49WJfeN0moxb9IPfGn8AIqMGskD.jpg", rating: 8.7, year: "2016", mediaType: "tv" as const },
  ];

  const mockActionSeries = [
    { id: 4, title: "The Boys", posterPath: "/2zmTngn1tYC1AvfnrFLhxeD82hz.jpg", rating: 8.7, year: "2019", mediaType: "tv" as const },
    { id: 5, title: "Jack Ryan", posterPath: "/6ovk8dHjcrDWPh33LW0MzA8HoXL.jpg", rating: 8.0, year: "2018", mediaType: "tv" as const },
  ];

  const mockDramaSeries = [
    { id: 6, title: "Breaking Bad", posterPath: "/ggFHVNu6YYI5L9pCfOacjizRGt.jpg", rating: 9.5, year: "2008", mediaType: "tv" as const },
    { id: 7, title: "Better Call Saul", posterPath: "/fC2HDm5t0kHl7mTm7jxMR31b7by.jpg", rating: 8.9, year: "2015", mediaType: "tv" as const },
    { id: 8, title: "The Crown", posterPath: "/1M876KPjulVwppEpldhdc8V4o68.jpg", rating: 8.6, year: "2016", mediaType: "tv" as const },
  ];

  const mockCrimeSeries = [
    { id: 9, title: "True Detective", posterPath: "/aowr4xpLP5sRCL50TkuADomJ98T.jpg", rating: 8.9, year: "2014", mediaType: "tv" as const },
    { id: 10, title: "Mindhunter", posterPath: "/fbKE87mojKIJfPfOcRYcl9Pt7Xy.jpg", rating: 8.6, year: "2017", mediaType: "tv" as const },
  ];

  const mockAnimeSeries = [
    { id: 11, title: "Attack on Titan", posterPath: "/hTP1DtLGFamjfu8WqjnuQdP1n4i.jpg", rating: 9.0, year: "2013", mediaType: "tv" as const },
    { id: 12, title: "Death Note", posterPath: "/4RLOuqCbXO1KxqK9SgcCgj7E7Pc.jpg", rating: 9.0, year: "2006", mediaType: "tv" as const },
    { id: 13, title: "One Punch Man", posterPath: "/iE3s0lG5QVdEHOEZnoAxjmMtvne.jpg", rating: 8.7, year: "2015", mediaType: "tv" as const },
  ];

  const mockSearchSuggestions = [
    { id: 1, title: "Breaking Bad", posterPath: "/ggFHVNu6YYI5L9pCfOacjizRGt.jpg", mediaType: "tv" as const, year: "2008" },
    { id: 2, title: "Stranger Things", posterPath: "/49WJfeN0moxb9IPfGn8AIqMGskD.jpg", mediaType: "tv" as const, year: "2016" },
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
                onSelect={(item) => window.location.href = `/series/${item.id}`}
              />
            </div>
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-8 lg:px-12 py-8 space-y-8 md:space-y-12">
        <h1 className="text-3xl md:text-4xl font-bold">Séries</h1>

        <MediaCarousel
          title="Dernières séries"
          items={mockLatestSeries}
          onItemClick={(item) => window.location.href = `/series/${item.id}`}
          seeAllLink="/latest-series"
        />

        <MediaCarousel
          title="Action"
          items={mockActionSeries}
          onItemClick={(item) => window.location.href = `/series/${item.id}`}
        />

        <MediaCarousel
          title="Drame"
          items={mockDramaSeries}
          onItemClick={(item) => window.location.href = `/series/${item.id}`}
        />

        <MediaCarousel
          title="Crime"
          items={mockCrimeSeries}
          onItemClick={(item) => window.location.href = `/series/${item.id}`}
        />

        <MediaCarousel
          title="Anime"
          items={mockAnimeSeries}
          onItemClick={(item) => window.location.href = `/series/${item.id}`}
        />
      </div>
    </div>
  );
}
