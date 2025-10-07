import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ProviderCardProps {
  id: number;
  name: string;
  logoPath: string | null;
  movieCount?: number;
  tvCount?: number;
  onClick?: () => void;
}

export default function ProviderCard({
  name,
  logoPath,
  movieCount = 0,
  tvCount = 0,
  onClick,
}: ProviderCardProps) {
  const imageUrl = logoPath
    ? `https://image.tmdb.org/t/p/original${logoPath}`
    : "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='%23334155' width='200' height='200'/%3E%3C/svg%3E";

  return (
    <Card
      className="p-4 hover-elevate active-elevate-2 cursor-pointer transition-all duration-200"
      onClick={onClick}
      data-testid={`card-provider-${name.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div className="flex flex-col items-center text-center space-y-3">
        <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center overflow-hidden p-2">
          <img
            src={imageUrl}
            alt={name}
            className="w-full h-full object-contain"
          />
        </div>
        
        <div className="space-y-1 w-full">
          <h3 className="font-semibold text-sm line-clamp-1">{name}</h3>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {movieCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {movieCount} films
              </Badge>
            )}
            {tvCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {tvCount} séries
              </Badge>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
