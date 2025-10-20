import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SearchSuggestion {
  id: number;
  title: string;
  posterPath: string | null;
  mediaType: "movie" | "tv" | "anime" | "documentary";
  year?: string;
}

interface SearchBarProps {
  onSearch?: (query: string) => void;
  onSelect?: (item: SearchSuggestion) => void;
  suggestions?: SearchSuggestion[];
}

export default function SearchBar({ onSearch, onSelect, suggestions = [] }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleChange = (value: string) => {
    setQuery(value);
    if (value.trim()) {
      setShowSuggestions(true);
      onSearch?.(value);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleClear = () => {
    setQuery("");
    setShowSuggestions(false);
  };

  const handleSelectItem = (item: SearchSuggestion) => {
    setQuery(item.title);
    setShowSuggestions(false);
    onSelect?.(item);
  };

  return (
    <div ref={searchRef} className="relative w-full" data-testid="search-bar-container">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          type="search"
          placeholder="Rechercher des films, séries, animes..."
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          className="pl-10 pr-10"
          data-testid="input-search"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            data-testid="button-clear-search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <Card className="absolute top-full mt-2 w-full max-h-96 overflow-y-auto z-50 p-2">
          {suggestions.map((item) => (
            <div
              key={`${item.mediaType}-${item.id}`}
              onClick={() => handleSelectItem(item)}
              className="flex items-center gap-3 p-2 rounded-md hover-elevate active-elevate-2 cursor-pointer"
              data-testid={`search-result-${item.id}`}
            >
              <img
                src={
                  item.posterPath
                    ? `https://image.tmdb.org/t/p/w92${item.posterPath}`
                    : "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='92' height='138'%3E%3Crect fill='%23334155' width='92' height='138'/%3E%3C/svg%3E"
                }
                alt={item.title}
                className="w-12 h-18 object-cover rounded"
              />
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm truncate">{item.title}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    {item.mediaType === "tv" ? "Série" : item.mediaType === "anime" ? "Anime" : item.mediaType === "documentary" ? "Doc" : "Film"}
                  </Badge>
                  {item.year && (
                    <span className="text-xs text-muted-foreground">{item.year}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
