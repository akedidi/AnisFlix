import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getOptimizedImageUrl } from "@/lib/imageOptimization";

// Fonction pour détecter si on est sur mobile natif (Capacitor)
const isCapacitor = () => {
  return typeof window !== 'undefined' && (window as any).Capacitor !== undefined;
};

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
  placeholder?: string;
}

export default function SearchBar({ onSearch, onSelect, suggestions = [], placeholder = "Rechercher..." }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const updateDropdownPosition = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  };

  const handleChange = (value: string) => {
    setQuery(value);
    if (value.trim()) {
      updateDropdownPosition();
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && query.trim()) {
      // Sur iOS natif, déclencher la recherche quand on appuie sur Entrée
      if (isCapacitor()) {
        setShowSuggestions(false);
        onSearch?.(query.trim());
      }
    }
  };

  return (
    <div ref={searchRef} className="relative w-full" data-testid="search-bar-container">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          type="search"
          placeholder={placeholder}
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className="pl-10 pr-10"
          data-testid="input-search"
          // Attributs pour iOS natif
          {...(isCapacitor() && {
            inputMode: "search",
            enterKeyHint: "search",
            autoComplete: "off",
            autoCorrect: "off",
            autoCapitalize: "off",
            spellCheck: false
          })}
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

      {showSuggestions && suggestions.length > 0 && createPortal(
        <Card 
          className="fixed max-h-96 overflow-y-auto p-2 shadow-2xl border-2 border-border/50" 
          style={{ 
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width,
            zIndex: 2147483647,
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            backdropFilter: 'blur(20px)'
          }}
        >
          {suggestions.map((item) => (
            <div
              key={`${item.mediaType}-${item.id}`}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelectItem(item);
              }}
              className="flex items-center gap-3 p-2 rounded-md hover:bg-white/10 active:bg-white/20 cursor-pointer transition-colors"
              data-testid={`search-result-${item.id}`}
            >
              <img
                src={getOptimizedImageUrl(item.posterPath, 'w92')}
                alt={item.title}
                className="w-12 h-18 object-cover rounded"
              />
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm truncate text-white">{item.title}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs bg-white/20 text-white border-white/30">
                    {item.mediaType === "tv" ? "Série" : item.mediaType === "anime" ? "Anime" : item.mediaType === "documentary" ? "Doc" : "Film"}
                  </Badge>
                  {item.year && (
                    <span className="text-xs text-gray-300">{item.year}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </Card>,
        document.body
      )}
    </div>
  );
}
