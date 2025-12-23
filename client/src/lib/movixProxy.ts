/**
 * Client proxy pour l'API Movix
 * Remplace les appels directs vers api.movix.site pour éviter les erreurs CORS/403
 */

export class MovixProxyClient {
  private baseUrl: string;

  constructor() {
    // En mode natif Capacitor, TOUJOURS utiliser l'URL de production Vercel
    const isCapacitor = typeof window !== 'undefined' &&
      (window as any).Capacitor !== undefined;

    // Vérifier si nous sommes en développement local
    const isLocalDev = typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

    if (isCapacitor) {
      // En mode natif Capacitor, toujours utiliser l'URL de production Vercel
      this.baseUrl = 'https://anisflix.vercel.app';
      console.log('🔍 MovixProxyClient - Utilisation du proxy Vercel (mode natif)');
    } else if (isLocalDev) {
      // En développement local web, utiliser localhost
      this.baseUrl = 'http://localhost:3000';
      console.log('🔍 MovixProxyClient - Utilisation du proxy local (mode développement)');
    } else {
      // En production web, utiliser Vercel
      this.baseUrl = 'https://anisflix.vercel.app';
      console.log('🔍 MovixProxyClient - Utilisation du proxy Vercel (mode web)');
    }

    console.log('🔍 MovixProxyClient - baseUrl:', this.baseUrl);
  }

  /**
   * Effectue une requête vers l'API Movix via le proxy
   */
  async request(path: string, queryParams: Record<string, string | number> = {}): Promise<any> {
    const url = new URL(`${this.baseUrl}/api/movix-proxy`);
    url.searchParams.append('path', path);

    // Ajouter les query parameters
    Object.entries(queryParams).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });

    console.log(`🌐 Movix Proxy Request: ${url.toString()}`);

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      console.log(`📡 Movix Proxy Response: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Movix Proxy Error: ${response.status} - ${errorData.message || response.statusText}`);
      }

      return await response.json();
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
}


// Instance singleton
export const movixProxy = new MovixProxyClient();
