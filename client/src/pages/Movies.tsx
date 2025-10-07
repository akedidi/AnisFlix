import { useState } from "react";
import SearchBar from "@/components/SearchBar";
import MediaCard from "@/components/MediaCard";
import ThemeToggle from "@/components/ThemeToggle";

export default function Movies() {
  const [searchQuery, setSearchQuery] = useState("");

  // todo: remove mock functionality
  const mockMovies = [
    { id: 1, title: "The Shawshank Redemption", posterPath: "/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg", rating: 9.3, year: "1994", mediaType: "movie" as const },
    { id: 2, title: "The Godfather", posterPath: "/3bhkrj58Vtu7enYsRolD1fZdja1.jpg", rating: 9.2, year: "1972", mediaType: "movie" as const },
    { id: 3, title: "The Dark Knight", posterPath: "/qJ2tW6WMUDux911r6m7haRef0WH.jpg", rating: 9.0, year: "2008", mediaType: "movie" as const },
    { id: 4, title: "Pulp Fiction", posterPath: "/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg", rating: 8.9, year: "1994", mediaType: "movie" as const },
    { id: 5, title: "Forrest Gump", posterPath: "/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg", rating: 8.8, year: "1994", mediaType: "movie" as const },
    { id: 6, title: "Inception", posterPath: "/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg", rating: 8.8, year: "2010", mediaType: "movie" as const },
    { id: 7, title: "The Matrix", posterPath: "/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg", rating: 8.7, year: "1999", mediaType: "movie" as const },
    { id: 8, title: "Interstellar", posterPath: "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg", rating: 8.6, year: "2014", mediaType: "movie" as const },
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
            <ThemeToggle />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-8 lg:px-12 py-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-8">Films</h1>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
          {mockMovies.map((movie) => (
            <MediaCard
              key={movie.id}
              {...movie}
              onClick={() => console.log("Clicked:", movie)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
