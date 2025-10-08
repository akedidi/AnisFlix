import { useState } from "react";
import { Button } from "@/components/ui/button";
import MediaCard from "@/components/MediaCard";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageToggle from "@/components/LanguageToggle";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function LatestSeries() {
  const [currentPage, setCurrentPage] = useState(1);

  // todo: fetch from TMDB API with pagination
  const mockSeries = [
    { id: 1, title: "Breaking Bad", posterPath: "/ggFHVNu6YYI5L9pCfOacjizRGt.jpg", rating: 9.5, year: "2008", mediaType: "tv" as const },
    { id: 2, title: "Game of Thrones", posterPath: "/7WUHnWGx5OO145IRxPDUkQSh4C7.jpg", rating: 9.3, year: "2011", mediaType: "tv" as const },
    { id: 3, title: "Stranger Things", posterPath: "/49WJfeN0moxb9IPfGn8AIqMGskD.jpg", rating: 8.7, year: "2016", mediaType: "tv" as const },
  ];

  const totalPages = 10; // todo: get from API

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="container mx-auto px-4 md:px-8 lg:px-12 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl md:text-3xl font-bold">Dernières séries</h1>
            <div className="flex items-center gap-2">
              <LanguageToggle />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-8 lg:px-12 py-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
          {mockSeries.map((series) => (
            <MediaCard
              key={series.id}
              {...series}
              onClick={() => window.location.href = `/series/${series.id}`}
            />
          ))}
        </div>

        <div className="flex items-center justify-center gap-2 mt-8">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            data-testid="button-prev-page"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = i + 1;
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(pageNum)}
                  data-testid={`button-page-${pageNum}`}
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            data-testid="button-next-page"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
