import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import MediaCard from "./MediaCard";

interface Media {
  id: number;
  title: string;
  posterPath: string | null;
  rating: number;
  year?: string;
  progress?: number;
  mediaType?: "movie" | "tv" | "anime" | "documentary";
}

interface MediaCarouselProps {
  title: string;
  items: Media[];
  onItemClick?: (item: Media) => void;
  seeAllLink?: string;
}

export default function MediaCarousel({ title, items, onItemClick, seeAllLink }: MediaCarouselProps) {
  return (
    <div className="space-y-4" data-testid={`carousel-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl md:text-3xl font-semibold">{title}</h2>
        {seeAllLink && (
          <Button
            variant="ghost"
            onClick={() => window.location.href = seeAllLink}
            className="gap-1"
            data-testid={`button-see-all-${title.toLowerCase().replace(/\s+/g, "-")}`}
          >
            Voir tout
            <ChevronRight className="w-4 h-4" />
          </Button>
        )}
      </div>
      <ScrollArea className="w-full">
        <div className="flex gap-4 pb-4">
          {items.map((item) => (
            <div key={item.id} className="w-40 md:w-48 flex-shrink-0">
              <MediaCard
                {...item}
                onClick={() => onItemClick?.(item)}
              />
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
