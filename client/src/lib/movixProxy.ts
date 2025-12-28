import { apiClient } from './apiClient';
import { apiCache, cacheTTL } from './apiCache';

/**
 * Client proxy pour l'API Movix
 * Remplace les appels directs vers api.movix.site pour éviter les erreurs CORS/403
 */

export class MovixProxyClient {

  constructor() {
    // Le constructeur est maintenant vide car apiClient gère l'URL de base
    console.log('🔍 MovixProxyClient - Initialisé (utilise apiClient)');
  }

  /**
   * Effectue une requête vers l'API Movix via le proxy
   * @param path - Le chemin de l'API
   * @param queryParams - Les paramètres de requête
   * @param useCache - Utiliser le cache (par défaut: true)
   * @param ttl - TTL personnalisé pour le cache (par défaut: 5 minutes)
   */
  async request(
    path: string,
    queryParams: Record<string, string | number> = {},
    useCache: boolean = true,
    ttl: number = cacheTTL.medium
  ): Promise<any> {
    const params = new URLSearchParams();
    params.append('path', path);

    // Ajouter les query parameters
    Object.entries(queryParams).forEach(([key, value]) => {
      params.append(key, String(value));
    });

    const endpoint = `/api/movix-proxy?${params.toString()}`;

    // Check cache first
    const cacheKey = `movix:${path}:${JSON.stringify(queryParams)}`;
    if (useCache) {
      const cached = apiCache.get<any>(cacheKey);
      if (cached) {
        console.log(`🔍 Movix Proxy Cache HIT: ${path}`);
        return cached;
      }
    }

    console.log(`🌐 Movix Proxy Request via ApiClient: ${endpoint}`);

    try {
      const response = await apiClient.get(endpoint);

      // Log server-side cache status from headers
      const serverCacheStatus = response.headers.get('X-Cache');
      const serverCacheKey = response.headers.get('X-Cache-Key');
      const serverCacheTTL = response.headers.get('X-Cache-TTL');

      if (serverCacheStatus) {
        const emoji = serverCacheStatus === 'HIT' ? '✅' : '❌';
        console.log(`🗄️ [Server Cache] ${emoji} ${serverCacheStatus}: ${serverCacheKey || path}${serverCacheTTL ? ` (${serverCacheTTL} remaining)` : ''}`);
      }

      console.log(`📡 Movix Proxy Response: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Movix Proxy Error: ${response.status} - ${errorData.message || response.statusText}`);
      }

      const data = await response.json();

      // Also log cache info from response body if present
      if (data?.cache) {
        const emoji = data.cache.status === 'HIT' ? '✅' : '❌';
        console.log(`🗄️ [Server Cache Body] ${emoji} ${data.cache.status}: ${data.cache.key}${data.cache.remainingTTL ? ` (${data.cache.remainingTTL}s remaining)` : ''}`);
      }

      // Cache the successful response (client-side)
      if (useCache) {
        apiCache.set(cacheKey, data, ttl);
      }

      return data;
    } catch (error) {
      console.error(`❌ Movix Proxy Error for ${path}:`, error);
      throw error;
    }
  }

  // Méthodes spécifiques pour les différents endpoints Movix

  /**
   * Recherche dans l'API Movix
   */
  async search(title: string): Promise<any> {
    return this.request('search', { title });
  }

  /**
   * Récupère les liens FStream
   */
  async getFStream(type: 'movie' | 'tv', id: number, season?: number): Promise<any> {
    const path = season ? `fstream/${type}/${id}/season/${season}` : `fstream/${type}/${id}`;
    return this.request(path);
  }

  /**
   * Récupère les liens WiFlix
   */
  async getWiFlix(type: 'movie' | 'tv', id: number, season?: number): Promise<any> {
    if (type === 'tv' && season) {
      // Pour les séries, utiliser le format wiflix/tv/{id}/{season}
      const path = `wiflix/${type}/${id}/${season}`;
      return this.request(path);
    } else {
      // Pour les films ou sans saison
      const path = `wiflix/${type}/${id}`;
      return this.request(path);
    }
  }

  /**
   * Récupère les liens par IMDB ID
   */
  async getByImdbId(imdbId: string, mediaType: 'movie' | 'tv'): Promise<any> {
    return this.request(`imdb/${mediaType}/${imdbId}`);
  }

  /**
   * Récupère les liens de téléchargement pour les films
   */
  async getMovieDownload(id: number): Promise<any> {
    return this.request(`films/download/${id}`);
  }

  /**
   * Récupère les liens de téléchargement pour les séries
   */
  async getSeriesDownload(id: number, season: number, episode: number): Promise<any> {
    return this.request(`series/download/${id}/season/${season}/episode/${episode}`);
  }

  /**
   * Recherche d'anime
   */
  async searchAnime(title: string, includeSeasons = true, includeEpisodes = true): Promise<any> {
    // Utiliser l'endpoint search avec une recherche spécifique pour anime
    const cleanTitle = title.replace(/ - Saison \d+ Épisode \d+/, '').trim();
    // Remplacer les tirets par des espaces pour correspondre à l'API
    const finalTitle = cleanTitle.replace(/-/g, ' ');
    console.log('🔍 MovixProxy - Recherche anime avec titre:', finalTitle);

    // Essayer d'abord l'endpoint anime/search
    try {
      // Ne pas encoder le titre car il sera encodé par l'URL
      const animeResult = await this.request(`anime/search/${finalTitle}`, {
        includeSeasons: includeSeasons.toString(),
        includeEpisodes: includeEpisodes.toString()
      });
      console.log('✅ MovixProxy - Endpoint anime/search fonctionne');
      return animeResult;
    } catch (error) {
      console.log('⚠️ MovixProxy - Endpoint anime/search échoué, utilisation de search');
      // Fallback vers l'endpoint search
      return this.request('search', {
        title: finalTitle
      });
    }
  }

  /**
   * Récupère les détails d'une série anime
   */
  async getSeriesDetails(seriesId: number): Promise<any> {
    return this.request(`anime/${seriesId}`);
  }
  /**
   * Récupère les liens UniversalVO (Vidsrc 2Embed/PrimeWire)
   */
  async getUniversalVO(type: 'movie' | 'tv', id: number, season?: number, episode?: number): Promise<any> {
    const params: any = { tmdbId: id, type };
    if (season) params.season = season;
    if (episode) params.episode = episode;
    return this.request('universalvo', params);
  }

  /**
   * Récupère les liens AfterDark (Sources VF)
   */
  async getAfterDark(
    type: 'movie' | 'tv',
    id: number,
    title?: string,
    year?: string,
    originalTitle?: string,
    season?: number,
    episode?: number
  ): Promise<any> {
    const params: any = { tmdbId: id, type };
    if (title) params.title = title;
    if (year) params.year = year;
    if (originalTitle) params.originalTitle = originalTitle;
    if (season) params.season = season;
    if (episode) params.episode = episode;
    return this.request('afterdark', params);

  }


}

// Instance singleton
export const movixProxy = new MovixProxyClient();
