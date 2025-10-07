import { useState } from "react";
import SearchBar from "@/components/SearchBar";
import MediaCard from "@/components/MediaCard";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageToggle from "@/components/LanguageToggle";
import CategorySection from "@/components/CategorySection";

export default function Series() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Tous");

  const categories = [
    "Tous",
    "Action",
    "Comédie",
    "Drame",
    "Science-Fiction",
    "Crime",
    "Fantastique",
    "Thriller",
    "Mystère",
    "Animation",
    "Documentaire",
    "Western",
  ];

  // todo: remove mock functionality
  const mockSeries = [
    { id: 1, title: "Breaking Bad", posterPath: "/ggFHVNu6YYI5L9pCfOacjizRGt.jpg", rating: 9.5, year: "2008", mediaType: "tv" as const },
    { id: 2, title: "Game of Thrones", posterPath: "/7WUHnWGx5OO145IRxPDUkQSh4C7.jpg", rating: 9.3, year: "2011", mediaType: "tv" as const },
    { id: 3, title: "The Wire", posterPath: "/4lbclFySvugI51fwsyxBTOm4DqK.jpg", rating: 9.3, year: "2002", mediaType: "tv" as const },
    { id: 4, title: "True Detective", posterPath: "/aowr4xpLP5sRCL50TkuADomJ98T.jpg", rating: 8.9, year: "2014", mediaType: "tv" as const },
    { id: 5, title: "Stranger Things", posterPath: "/49WJfeN0moxb9IPfGn8AIqMGskD.jpg", rating: 8.7, year: "2016", mediaType: "tv" as const },
    { id: 6, title: "The Crown", posterPath: "/1M876KPjulVwppEpldhdc8V4o68.jpg", rating: 8.6, year: "2016", mediaType: "tv" as const },
    { id: 7, title: "Westworld", posterPath: "/8MfgyFHf7XEboZJPZXCIDqqiz6e.jpg", rating: 8.5, year: "2016", mediaType: "tv" as const },
    { id: 8, title: "The Mandalorian", posterPath: "/sWgBv7LV2PRoQgkxwlibdGXKz1S.jpg", rating: 8.7, year: "2019", mediaType: "tv" as const },
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
                onSelect={(item) => console.log("Selected:", item)}
              />
            </div>
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-8 lg:px-12 py-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-6">Séries</h1>
        
        <div className="mb-8">
          <CategorySection
            categories={categories}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
          />
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
          {mockSeries.map((series) => (
            <MediaCard
              key={series.id}
              {...series}
              onClick={() => console.log("Clicked:", series)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
