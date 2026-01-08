
import { cn } from "@/lib/utils";
import { getImageUrl } from "@/lib/tmdb";

interface WatchProvider {
    provider_id: number;
    provider_name: string;
    logo_path: string;
}

interface WatchProvidersProps {
    providers?: {
        results?: {
            [key: string]: {
                link?: string;
                flatrate?: WatchProvider[];
                rent?: WatchProvider[];
                buy?: WatchProvider[];
            };
        };
    };
    className?: string;
}

export default function WatchProviders({ providers, className }: WatchProvidersProps) {
    if (!providers?.results) return null;

    // Priority: FR -> US -> First available
    const regionCode =
        providers.results["FR"] ? "FR" :
            providers.results["US"] ? "US" :
                providers.results["CA"] ? "CA" :
                    Object.keys(providers.results)[0];

    const regionData = providers.results[regionCode];

    // Combine unique providers from flatrate, rent, and buy
    // Often users just want to know where to watch, regardless of monetization
    // But flatrate (subscription) is most important.
    const allProviders = new Map<number, WatchProvider>();

    // Add flatrate first
    regionData?.flatrate?.forEach(p => allProviders.set(p.provider_id, p));
    // Then rent/buy if needed (optional: we can just show flatrate to declutter)
    // Let's show everything but distinct by ID
    regionData?.rent?.forEach(p => allProviders.set(p.provider_id, p));
    regionData?.buy?.forEach(p => allProviders.set(p.provider_id, p));

    const uniqueProviders = Array.from(allProviders.values());

    if (uniqueProviders.length === 0) return null;

    // We should link to the TMDB provider page if possible, or just display logos
    const link = regionData?.link;

    return (
        <div className={cn("space-y-3", className)}>
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Disponible sur {regionCode === 'FR' ? '(France)' : `(${regionCode})`}
            </h3>
            <div className="flex flex-wrap gap-3">
                {uniqueProviders.map((provider) => (
                    <div
                        key={provider.provider_id}
                        className="relative group cursor-pointer"
                        title={provider.provider_name}
                        onClick={() => link && window.open(link, '_blank')}
                    >
                        <img
                            src={getImageUrl(provider.logo_path, "original")}
                            alt={provider.provider_name}
                            className="w-12 h-12 rounded-lg shadow-md transition-transform hover:scale-105"
                        />
                        {/* Tooltip on hover */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black/80 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                            {provider.provider_name}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
