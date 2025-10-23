/**
 * Client proxy pour l'API Movix
 * Remplace les appels directs vers api.movix.site pour éviter les erreurs CORS/403
 */

export class MovixProxyClient {
  private baseUrl: string;

  constructor() {
    // Toujours utiliser le proxy Vercel pour éviter les blocages FAI
    this.baseUrl = 'https://anisflix.vercel.app';
    
    console.log('🔍 MovixProxyClient - baseUrl:', this.baseUrl);
    console.log('🔍 MovixProxyClient - Utilisation du proxy Vercel pour éviter les blocages FAI');
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
   * Récupère les liens TopStream
   */
  async getTopStream(type: 'movie' | 'tv', id: number): Promise<any> {
    return this.request(`topstream/${type}/${id}`);
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
    const path = season ? `wiflix/${type}/${id}/season/${season}` : `wiflix/${type}/${id}`;
    return this.request(path);
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
    console.log('🔍 MovixProxy - Recherche anime avec titre:', cleanTitle);
    
    // Essayer d'abord l'endpoint anime/search
    try {
      const animeResult = await this.request(`anime/search/${encodeURIComponent(cleanTitle)}`, {
        includeSeasons: includeSeasons.toString(),
        includeEpisodes: includeEpisodes.toString()
      });
      console.log('✅ MovixProxy - Endpoint anime/search fonctionne');
      return animeResult;
    } catch (error) {
      console.log('⚠️ MovixProxy - Endpoint anime/search échoué, utilisation de search');
      // Fallback vers l'endpoint search
      return this.request('search', {
        title: cleanTitle
      });
    }
  }

  /**
   * Récupère les détails d'une série anime
   */
  async getSeriesDetails(seriesId: number): Promise<any> {
    return this.request(`anime/${seriesId}`);
  }
}

// Instance singleton
export const movixProxy = new MovixProxyClient();
