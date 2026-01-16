/**
 * Client API adaptatif pour Capacitor et web
 */
export class ApiClient {
  private baseUrl: string;

  constructor() {
    // Initialiser avec l'URL par défaut
    // Sera recalculé au moment de la première requête
    this.baseUrl = this.determineBaseUrl();
  }

  /**
   * Détermine l'URL de base selon la plateforme
   * Appelé à chaque requête pour être sûr d'avoir les bonnes infos
   */
  private determineBaseUrl(): string {
    // Déterminer l'URL de base selon la plateforme
    const isCapacitor = typeof window !== 'undefined' &&
      (window as any).Capacitor !== undefined;

    console.log('🔍 [API CLIENT] determineBaseUrl called at:', new Date().toISOString());

    // Vérifier si nous sommes en développement local
    const isLocalDev = typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

    // Vérifier si nous sommes dans Capacitor en développement
    const isCapacitorDev = typeof window !== 'undefined' &&
      window.location.href.includes('capacitor://localhost');

    console.log(`[API CLIENT] Platform detection:`, {
      isCapacitor,
      isLocalDev,
      isCapacitorDev,
      hostname: typeof window !== 'undefined' ? window.location.hostname : 'undefined',
      href: typeof window !== 'undefined' ? window.location.href : 'undefined'
    });

    // En développement local (web uniquement), utiliser l'URL locale
    if (isLocalDev && !isCapacitor) {
      const url = 'http://localhost:3000';
      console.log(`[API CLIENT] Using local development server: ${url}`);
      return url;
    } else if (isCapacitor) {
      // En mode natif Capacitor, toujours utiliser l'URL de production Vercel (même en dev)
      const url = 'https://anisflix.vercel.app';
      console.log(`[API CLIENT] Using production server: ${url}`);
      return url;
    } else {
      // En mode web, utiliser l'origine actuelle
      const url = typeof window !== 'undefined' ? window.location.origin : 'https://anisflix.vercel.app';
      console.log(`[API CLIENT] Using current origin: ${url}`);
      return url;
    }
  }

  /**
   * Obtient l'URL de base (recalculée à chaque appel)
   */
  private getBaseUrl(): string {
    return this.determineBaseUrl();
  }

  /**
   * Effectue une requête API avec gestion automatique de l'URL
   */
  async request(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const baseUrl = this.getBaseUrl();
    const url = `${baseUrl}${endpoint}`;

    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    // Debug log pour voir si on passe ici
    console.log(`🌐 [API CLIENT] request() called with endpoint: ${endpoint}`);
    console.log(`🌐 [API CLIENT] Calculated URL: ${url}`);
    console.log(`🌐 API Request: ${config.method || 'GET'} ${url}`);

    // Vérifier si nous sommes dans Capacitor
    const isCapacitor = typeof window !== 'undefined' &&
      (window as any).Capacitor !== undefined;
    console.log(`🔍 [API CLIENT] isCapacitor: ${isCapacitor}`);

    try {
      console.log(`🔍 [API CLIENT] About to call fetch...`);
      const response = await fetch(url, config);
      console.log(`📡 API Response: ${response.status} ${response.statusText}`);
      return response;
    } catch (error) {
      console.error(`❌ API Error for ${url}:`, error);
      throw error;
    }
  }

  /**
   * POST request helper
   */
  async post(endpoint: string, data: any): Promise<Response> {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * GET request helper
   */
  async get(endpoint: string): Promise<Response> {
    return this.request(endpoint, {
      method: 'GET',
    });
  }

  /**
   * Extrait VidMoly avec gestion Capacitor
   */
  async extractVidMoly(url: string, method: string = 'auto'): Promise<any> {
    // Skip if URL is already an m3u8 (already extracted)
    if (url.includes('.m3u8')) {
      console.log('⏭️ [API CLIENT] Skipping extraction - URL is already m3u8:', url);
      return { success: true, m3u8Url: url, skipped: true };
    }

    // Skip if URL is not a vidmoly embed URL
    if (!url.includes('vidmoly') && !url.includes('vmwesa')) {
      console.log('⏭️ [API CLIENT] Skipping extraction - URL is not vidmoly:', url);
      return { success: false, error: 'Not a vidmoly URL' };
    }

    const response = await this.post('/api/extract', { type: 'vidmoly', url });

    if (!response.ok) {
      throw new Error(`VidMoly extraction failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Extrait Vidzy avec gestion Capacitor
   */
  async extractVidzy(url: string): Promise<any> {
    const response = await this.post('/api/extract', { type: 'vidzy', url });

    if (!response.ok) {
      throw new Error(`Vidzy extraction failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Extrait VidSrc avec gestion Capacitor
   */
  async extractVidSrc(url: string): Promise<any> {
    const response = await this.post('/api/extract', { type: 'vidsrc', url });

    if (!response.ok) {
      throw new Error(`VidSrc extraction failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Extrait Luluvid avec gestion Capacitor
   */
  async extractLuluvid(url: string): Promise<any> {
    // Note: Utiliser 'luluvid' ou 'lulustream' comme type
    const response = await this.post('/api/extract', { type: 'luluvid', url });

    if (!response.ok) {
      throw new Error(`Luluvid extraction failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Proxy VidMoly avec gestion Capacitor
   */
  getVidMolyProxyUrl(url: string, referer?: string): string {
    const baseUrl = this.getBaseUrl();
    const params = new URLSearchParams({
      url: encodeURIComponent(url),
      referer: encodeURIComponent(referer || 'https://vidmoly.net/')
    });

    return `${baseUrl}/api/vidmoly?${params.toString()}`;
  }

  /**
   * Obtient l'URL de base appropriée pour les requêtes
   * (accessible publiquement pour les cas où on a besoin de l'URL)
   */
  getPublicBaseUrl(): string {
    return this.getBaseUrl();
  }
}

// Instance singleton
export const apiClient = new ApiClient();
