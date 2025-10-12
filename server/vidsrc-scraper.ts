import axios from 'axios';

interface VidSrcPlayer {
  name: string;
  url: string;
  type: 'm3u8' | 'mp4' | 'embed';
}

interface VidSrcResult {
  success: boolean;
  m3u8Url?: string;
  players?: VidSrcPlayer[];
  error?: string;
}

/**
 * Scraper pour VidSrc.io
 * Extrait les liens de streaming depuis les pages VidSrc
 */
export class VidSrcScraper {
  private baseUrl = 'https://vidsrc.io';
  private userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  /**
   * Extrait les liens de streaming depuis une URL VidSrc
   */
  async extractStreamingLinks(url: string): Promise<VidSrcResult> {
    try {
      console.log(`[VidSrc] Extraction depuis: ${url}`);
      
      // Vérifier que l'URL est bien VidSrc
      if (!url.includes('vidsrc.io')) {
        throw new Error('URL VidSrc invalide');
      }

      // Récupérer le contenu de la page
      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        timeout: 15000,
      });

      if (response.status !== 200) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const html = response.data;
      console.log(`[VidSrc] Page récupérée (${html.length} caractères)`);

      // Extraire les liens de streaming
      const players = this.extractPlayers(html);
      console.log(`[VidSrc] ${players.length} lecteurs trouvés`);

      // Essayer d'extraire directement un lien m3u8
      let m3u8Url = this.extractDirectM3u8(html);
      
      // Si pas trouvé, essayer via l'API VidSrc
      if (!m3u8Url) {
        const tmdbId = this.extractTmdbId(html);
        if (tmdbId) {
          console.log(`[VidSrc] Tentative d'extraction via API pour TMDB: ${tmdbId}`);
          m3u8Url = await this.extractViaVidSrcAPI(tmdbId, 'movie');
        }
      }
      
      // Si pas trouvé, essayer depuis les lecteurs
      if (!m3u8Url && players.length > 0) {
        console.log(`[VidSrc] Tentative d'extraction depuis ${players.length} lecteurs`);
        for (const player of players) {
          const playerM3u8 = await this.extractM3u8FromPlayer(player.url);
          if (playerM3u8) {
            m3u8Url = playerM3u8;
            console.log(`[VidSrc] Lien m3u8 trouvé via lecteur ${player.name}: ${m3u8Url}`);
            break;
          }
        }
      }

      if (m3u8Url) {
        console.log(`[VidSrc] Lien m3u8 final trouvé: ${m3u8Url}`);
        return {
          success: true,
          m3u8Url,
          players
        };
      }

      // Si pas de lien m3u8, retourner les lecteurs disponibles
      return {
        success: true,
        players
      };

    } catch (error) {
      console.error('[VidSrc] Erreur lors de l\'extraction:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Extrait les lecteurs disponibles depuis le HTML
   */
  private extractPlayers(html: string): VidSrcPlayer[] {
    const players: VidSrcPlayer[] = [];

    // Rechercher les divs avec classe "server" et data-hash (structure VidSrc)
    const serverRegex = /<div[^>]*class="[^"]*server[^"]*"[^>]*data-hash="([^"]*)"[^>]*>([^<]*)<\/div>/gi;
    let match;

    while ((match = serverRegex.exec(html)) !== null) {
      const playerName = match[2].trim();
      const playerHash = match[1];
      
      if (playerHash && playerName) {
        // Construire l'URL du lecteur avec le hash
        const playerUrl = `${this.baseUrl}/embed/movie?tmdb=${this.extractTmdbId(html)}&hash=${playerHash}`;
        
        players.push({
          name: playerName,
          url: playerUrl,
          type: 'embed'
        });
      }
    }

    // Rechercher l'iframe principal
    const iframeRegex = /<iframe[^>]*id="player_iframe"[^>]*src="([^"]*)"[^>]*>/gi;
    const iframeMatch = iframeRegex.exec(html);
    
    if (iframeMatch && iframeMatch[1]) {
      const iframeSrc = iframeMatch[1];
      players.push({
        name: 'Player Principal',
        url: this.resolveUrl(iframeSrc),
        type: 'embed'
      });
    }

    // Rechercher les boutons de lecteurs (fallback)
    const buttonRegex = /<button[^>]*data-player="([^"]*)"[^>]*>([^<]*)<\/button>/gi;
    
    while ((match = buttonRegex.exec(html)) !== null) {
      const playerName = match[2].trim();
      const playerUrl = match[1];
      
      if (playerUrl && playerName && !players.some(p => p.url === playerUrl)) {
        players.push({
          name: playerName,
          url: this.resolveUrl(playerUrl),
          type: this.detectPlayerType(playerUrl)
        });
      }
    }

    return players;
  }

  /**
   * Extrait un lien m3u8 direct depuis le HTML
   */
  private extractDirectM3u8(html: string): string | null {
    // Rechercher les liens m3u8 dans les scripts
    const m3u8Regex = /(https?:\/\/[^"'\s]+\.m3u8[^"'\s]*)/gi;
    const matches = html.match(m3u8Regex);
    
    if (matches && matches.length > 0) {
      // Retourner le premier lien m3u8 trouvé
      return matches[0];
    }

    // Rechercher dans les variables JavaScript
    const jsM3u8Regex = /(?:src|url|link)\s*[:=]\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/gi;
    const jsMatch = jsM3u8Regex.exec(html);
    
    if (jsMatch) {
      return jsMatch[1];
    }

    return null;
  }

  /**
   * Résout une URL relative en URL absolue
   */
  private resolveUrl(url: string): string {
    if (url.startsWith('http')) {
      return url;
    }
    
    if (url.startsWith('//')) {
      return `https:${url}`;
    }
    
    if (url.startsWith('/')) {
      return `${this.baseUrl}${url}`;
    }
    
    return `${this.baseUrl}/${url}`;
  }

  /**
   * Extrait l'ID TMDB depuis l'URL ou le HTML
   */
  private extractTmdbId(html: string): string | null {
    // Essayer d'extraire depuis l'URL dans le HTML
    const urlMatch = html.match(/tmdb=(\d+)/);
    if (urlMatch) {
      return urlMatch[1];
    }
    
    // Essayer d'extraire depuis le titre
    const titleMatch = html.match(/<title>([^<]+)<\/title>/);
    if (titleMatch) {
      // VidSrc utilise parfois l'ID dans le titre
      const titleIdMatch = titleMatch[1].match(/\((\d{4})\)/);
      if (titleIdMatch) {
        return titleIdMatch[1];
      }
    }
    
    return null;
  }

  /**
   * Détecte le type de lecteur basé sur l'URL
   */
  private detectPlayerType(url: string): 'm3u8' | 'mp4' | 'embed' {
    if (url.includes('.m3u8')) {
      return 'm3u8';
    }
    
    if (url.includes('.mp4')) {
      return 'mp4';
    }
    
    return 'embed';
  }

  /**
   * Extrait le lien m3u8 depuis un lecteur VidSrc
   */
  async extractM3u8FromPlayer(playerUrl: string): Promise<string | null> {
    try {
      console.log(`[VidSrc] Extraction m3u8 depuis le lecteur: ${playerUrl}`);
      
      const response = await axios.get(playerUrl, {
        headers: {
          'User-Agent': this.userAgent,
          'Referer': this.baseUrl,
        },
        timeout: 15000,
      });

      const html = response.data;
      
      // Rechercher le lien m3u8 dans le lecteur
      const m3u8Url = this.extractDirectM3u8(html);
      
      if (m3u8Url) {
        console.log(`[VidSrc] Lien m3u8 extrait du lecteur: ${m3u8Url}`);
        return m3u8Url;
      }

      // Rechercher dans les scripts du lecteur
      const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
      let scriptMatch;
      
      while ((scriptMatch = scriptRegex.exec(html)) !== null) {
        const scriptContent = scriptMatch[1];
        const m3u8InScript = this.extractDirectM3u8(scriptContent);
        
        if (m3u8InScript) {
          console.log(`[VidSrc] Lien m3u8 trouvé dans le script: ${m3u8InScript}`);
          return m3u8InScript;
        }
      }

      // Pour les iframes VidSrc, essayer d'extraire depuis l'URL de l'iframe
      if (playerUrl.includes('cloudnestra.com') || playerUrl.includes('2embed')) {
        // Ces services utilisent souvent des URLs encodées
        const decodedUrl = this.tryDecodeVidSrcUrl(playerUrl);
        if (decodedUrl) {
          console.log(`[VidSrc] URL décodée: ${decodedUrl}`);
          return decodedUrl;
        }
      }

      // Essayer d'extraire depuis les iframes imbriqués
      const iframeRegex = /<iframe[^>]*src="([^"]*)"[^>]*>/gi;
      let iframeMatch;
      
      while ((iframeMatch = iframeRegex.exec(html)) !== null) {
        const iframeSrc = iframeMatch[1];
        console.log(`[VidSrc] Iframe trouvé: ${iframeSrc}`);
        
        // Essayer d'extraire depuis cet iframe
        const iframeM3u8 = await this.extractFromIframe(iframeSrc);
        if (iframeM3u8) {
          return iframeM3u8;
        }
      }

      return null;
    } catch (error) {
      console.error('[VidSrc] Erreur lors de l\'extraction du lecteur:', error);
      return null;
    }
  }

  /**
   * Extrait le m3u8 depuis un iframe
   */
  private async extractFromIframe(iframeSrc: string): Promise<string | null> {
    try {
      console.log(`[VidSrc] Extraction depuis iframe: ${iframeSrc}`);
      
      // Résoudre l'URL relative
      const fullUrl = this.resolveUrl(iframeSrc);
      
      const response = await axios.get(fullUrl, {
        headers: {
          'User-Agent': this.userAgent,
          'Referer': this.baseUrl,
        },
        timeout: 10000,
      });

      const html = response.data;
      
      // Rechercher le m3u8 dans l'iframe
      const m3u8Url = this.extractDirectM3u8(html);
      if (m3u8Url) {
        console.log(`[VidSrc] M3u8 trouvé dans iframe: ${m3u8Url}`);
        return m3u8Url;
      }

      // Rechercher dans les scripts de l'iframe
      const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
      let scriptMatch;
      
      while ((scriptMatch = scriptRegex.exec(html)) !== null) {
        const scriptContent = scriptMatch[1];
        const m3u8InScript = this.extractDirectM3u8(scriptContent);
        
        if (m3u8InScript) {
          console.log(`[VidSrc] M3u8 trouvé dans script iframe: ${m3u8InScript}`);
          return m3u8InScript;
        }
      }

      return null;
    } catch (error) {
      console.error('[VidSrc] Erreur extraction iframe:', error);
      return null;
    }
  }

  /**
   * Essaie d'extraire le m3u8 via l'API VidSrc
   */
  private async extractViaVidSrcAPI(tmdbId: string, type: 'movie' | 'tv' = 'movie'): Promise<string | null> {
    try {
      console.log(`[VidSrc] Tentative d'extraction via API pour TMDB: ${tmdbId}`);
      
      // VidSrc utilise parfois des APIs directes
      const apiUrls = [
        `https://vidsrc.me/embed/${type}/${tmdbId}/`,
        `https://vidsrc.to/embed/${type}/${tmdbId}/`,
        `https://vidsrc.net/embed/${type}/${tmdbId}/`
      ];

      for (const apiUrl of apiUrls) {
        try {
          const response = await axios.get(apiUrl, {
            headers: {
              'User-Agent': this.userAgent,
              'Referer': this.baseUrl,
            },
            timeout: 10000,
          });

          const html = response.data;
          const m3u8Url = this.extractDirectM3u8(html);
          
          if (m3u8Url) {
            console.log(`[VidSrc] M3u8 trouvé via API: ${m3u8Url}`);
            return m3u8Url;
          }
        } catch (error) {
          // Continuer avec l'URL suivante
          continue;
        }
      }

      return null;
    } catch (error) {
      console.error('[VidSrc] Erreur extraction API:', error);
      return null;
    }
  }

  /**
   * Essaie de décoder une URL VidSrc encodée
   */
  private tryDecodeVidSrcUrl(encodedUrl: string): string | null {
    try {
      // VidSrc utilise souvent du base64 ou d'autres encodages
      const urlParts = encodedUrl.split('/');
      const encodedPart = urlParts[urlParts.length - 1];
      
      // Essayer de décoder en base64
      try {
        const decoded = Buffer.from(encodedPart, 'base64').toString('utf-8');
        console.log(`[VidSrc] Tentative de décodage base64: ${decoded}`);
        
        // Chercher un lien m3u8 dans le texte décodé
        const m3u8Match = decoded.match(/(https?:\/\/[^\s]+\.m3u8[^\s]*)/);
        if (m3u8Match) {
          return m3u8Match[1];
        }
      } catch (e) {
        // Pas du base64, continuer
      }
      
      return null;
    } catch (error) {
      console.error('[VidSrc] Erreur lors du décodage:', error);
      return null;
    }
  }
}

// Instance singleton
export const vidsrcScraper = new VidSrcScraper();

/**
 * Fonction utilitaire pour extraire un lien m3u8 depuis VidSrc
 */
export async function extractVidSrcM3u8(url: string): Promise<string | null> {
  const result = await vidsrcScraper.extractStreamingLinks(url);
  
  if (result.success && result.m3u8Url) {
    return result.m3u8Url;
  }
  
  if (result.success && result.players) {
    // Essayer d'extraire depuis le premier lecteur disponible
    for (const player of result.players) {
      if (player.type === 'embed') {
        const m3u8Url = await vidsrcScraper.extractM3u8FromPlayer(player.url);
        if (m3u8Url) {
          return m3u8Url;
        }
      } else if (player.type === 'm3u8') {
        return player.url;
      }
    }
  }
  
  return null;
}
