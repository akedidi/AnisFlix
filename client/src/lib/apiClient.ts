import { Capacitor } from '@capacitor/core';

/**
 * Client API adaptatif pour Capacitor et web
 */
export class ApiClient {
  private baseUrl: string;

  constructor() {
    // Déterminer l'URL de base selon la plateforme
    if (Capacitor.isNativePlatform()) {
      // En mode natif, utiliser l'URL de production Vercel
      this.baseUrl = 'https://anisflix.vercel.app';
    } else {
      // En mode web, utiliser l'origine actuelle
      this.baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    }
  }

  /**
   * Effectue une requête API avec gestion automatique de l'URL
   */
  async request(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}`;
    
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

    console.log(`🌐 API Request: ${config.method || 'GET'} ${url}`);
    
    try {
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
  async extractVidMoly(url: string): Promise<any> {
    const response = await this.post('/api/vidmoly-test', { url });
    
    if (!response.ok) {
      throw new Error(`VidMoly extraction failed: ${response.status}`);
    }
    
    return response.json();
  }

  /**
   * Extrait Vidzy avec gestion Capacitor
   */
  async extractVidzy(url: string): Promise<any> {
    const response = await this.post('/api/vidzy/extract', { url });
    
    if (!response.ok) {
      throw new Error(`Vidzy extraction failed: ${response.status}`);
    }
    
    return response.json();
  }

  /**
   * Extrait VidSrc avec gestion Capacitor
   */
  async extractVidSrc(url: string): Promise<any> {
    const response = await this.post('/api/vidsrc/extract', { url });
    
    if (!response.ok) {
      throw new Error(`VidSrc extraction failed: ${response.status}`);
    }
    
    return response.json();
  }

  /**
   * Proxy VidMoly avec gestion Capacitor
   */
  getVidMolyProxyUrl(url: string, referer?: string): string {
    const params = new URLSearchParams({
      url: encodeURIComponent(url),
      referer: encodeURIComponent(referer || 'https://vidmoly.net/')
    });
    
    return `${this.baseUrl}/api/vidmoly-proxy?${params.toString()}`;
  }
}

// Instance singleton
export const apiClient = new ApiClient();
