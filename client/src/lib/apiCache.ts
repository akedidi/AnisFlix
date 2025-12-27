/**
 * Simple in-memory cache with TTL (Time To Live) for API responses
 */

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number; // in milliseconds
}

class APICache {
    private cache = new Map<string, CacheEntry<unknown>>();
    private defaultTTL = 5 * 60 * 1000; // 5 minutes

    /**
     * Get a cached value if it exists and hasn't expired
     */
    get<T>(key: string): T | null {
        const entry = this.cache.get(key) as CacheEntry<T> | undefined;

        if (!entry) {
            console.log(`🗄️ [APICache] ❌ MISS: ${key}`);
            return null;
        }

        // Check if entry has expired
        const age = Date.now() - entry.timestamp;
        if (age > entry.ttl) {
            this.cache.delete(key);
            console.log(`🗄️ [APICache] ⏰ EXPIRED: ${key}`);
            return null;
        }

        const remainingTTL = Math.round((entry.ttl - age) / 1000);
        console.log(`🗄️ [APICache] ✅ HIT: ${key} (${remainingTTL}s remaining)`);
        return entry.data;
    }

    /**
     * Set a value in the cache with optional custom TTL
     */
    set<T>(key: string, data: T, ttl?: number): void {
        const actualTTL = ttl ?? this.defaultTTL;
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl: actualTTL,
        });
        console.log(`🗄️ [APICache] 💾 STORED: ${key} (TTL: ${Math.round(actualTTL / 1000)}s)`);
    }

    /**
     * Check if a key exists and hasn't expired
     */
    has(key: string): boolean {
        return this.get(key) !== null;
    }

    /**
     * Delete a specific entry
     */
    delete(key: string): void {
        this.cache.delete(key);
    }

    /**
     * Clear all cached entries
     */
    clear(): void {
        this.cache.clear();
    }

    /**
     * Clear expired entries (can be called periodically)
     */
    clearExpired(): void {
        const now = Date.now();
        const entries = Array.from(this.cache.entries());
        for (const [key, entry] of entries) {
            if (now - entry.timestamp > entry.ttl) {
                this.cache.delete(key);
            }
        }
    }

    /**
     * Get cache statistics
     */
    getStats(): { size: number; keys: string[] } {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys()),
        };
    }
}

// Singleton instance
export const apiCache = new APICache();

// Cache key generators for common API calls
export const cacheKeys = {
    popularMovies: (page: number) => `tmdb:movies:popular:${page}`,
    popularSeries: (page: number) => `tmdb:series:popular:${page}`,
    trendingMovies: (timeWindow: string, page: number) => `tmdb:movies:trending:${timeWindow}:${page}`,
    trendingSeries: (timeWindow: string, page: number) => `tmdb:series:trending:${timeWindow}:${page}`,
    movieDetails: (id: number) => `tmdb:movie:${id}`,
    seriesDetails: (id: number) => `tmdb:series:${id}`,
    searchMulti: (query: string, page: number) => `tmdb:search:${query}:${page}`,
    anime: (type: string, page: number) => `tmdb:anime:${type}:${page}`,
};

// TTL constants (in milliseconds)
export const cacheTTL = {
    short: 2 * 60 * 1000,      // 2 minutes - for frequently changing data
    medium: 5 * 60 * 1000,     // 5 minutes - default
    long: 30 * 60 * 1000,      // 30 minutes - for stable data like movie details
    veryLong: 60 * 60 * 1000,  // 1 hour - for rarely changing data
};

// Clean expired entries every 5 minutes
if (typeof window !== 'undefined') {
    setInterval(() => {
        apiCache.clearExpired();
    }, 5 * 60 * 1000);
}
