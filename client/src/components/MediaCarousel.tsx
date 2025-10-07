import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
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
}

export default function MediaCarousel({ title, items, onItemClick }: MediaCarouselProps) {
  return (
    <div className="space-y-4" data-testid={`carousel-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <h2 className="text-2xl md:text-3xl font-semibold">{title}</h2>
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
