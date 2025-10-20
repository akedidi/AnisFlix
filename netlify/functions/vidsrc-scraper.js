const axios = require('axios');

class VidSrcScraper {
  constructor() {
    this.baseUrl = 'https://vidsrc.io';
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  }

  async extractStreamingLinks(url) {
    try {
      console.log(`[VidSrc] Extraction depuis: ${url}`);
      
      if (!url.includes('vidsrc.io')) {
        throw new Error('URL VidSrc invalide');
      }

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
      
      // Chercher les liens m3u8 dans le HTML
      const m3u8Matches = html.match(/https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/g);
      
      if (m3u8Matches && m3u8Matches.length > 0) {
        const m3u8Url = m3u8Matches[0];
        console.log(`[VidSrc] Lien m3u8 trouvé: ${m3u8Url}`);
        
        return {
          success: true,
          m3u8Url: m3u8Url,
          players: [{
            name: 'VidSrc Player',
            url: m3u8Url,
            type: 'm3u8'
          }]
        };
      }

      // Chercher les iframes embed
      const iframeMatches = html.match(/<iframe[^>]+src="([^"]+)"/g);
      if (iframeMatches && iframeMatches.length > 0) {
        const iframeSrc = iframeMatches[0].match(/src="([^"]+)"/)[1];
        console.log(`[VidSrc] Iframe trouvé: ${iframeSrc}`);
        
        return {
          success: true,
          m3u8Url: iframeSrc,
          players: [{
            name: 'VidSrc Embed',
            url: iframeSrc,
            type: 'embed'
          }]
        };
      }

      throw new Error('Aucun lien de streaming trouvé');
      
    } catch (error) {
      console.error('[VidSrc] Erreur:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async extractM3u8(url) {
    try {
      const result = await this.extractStreamingLinks(url);
      return result.success ? result.m3u8Url : null;
    } catch (error) {
      console.error('[VidSrc] Erreur extraction m3u8:', error.message);
      return null;
    }
  }
}

const vidsrcScraper = new VidSrcScraper();

module.exports = { 
  vidsrcScraper,
  extractVidSrcM3u8: (url) => vidsrcScraper.extractM3u8(url)
};
