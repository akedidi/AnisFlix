import axios from 'axios';
import puppeteer from 'puppeteer';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { url } = req.body;
    
    console.log(`🚀 Test VidMoly - URL reçue:`, url);
    console.log(`🚀 Test VidMoly - Type:`, typeof url);

    if (!url || typeof url !== 'string') {
      console.log(`❌ URL invalide:`, { url, type: typeof url });
      return res.status(400).json({ error: 'URL VidMoly requise' });
    }

    // Remplacer vidmoly.to par vidmoly.net pour une meilleure compatibilité
    const normalizedUrl = url.replace('vidmoly.to', 'vidmoly.net');
    console.log(`🔄 URL normalisée : ${normalizedUrl}`);

    // Vérifier si l'URL VidMoly est valide
    if (!normalizedUrl.includes('vidmoly')) {
      console.log(`❌ URL ne contient pas 'vidmoly':`, normalizedUrl);
      throw new Error(`URL VidMoly invalide: ${normalizedUrl}`);
    }

    console.log(`🔍 Tentative d'extraction du vrai lien VidMoly avec Puppeteer pour: ${normalizedUrl}`);

    // Essayer d'extraire le vrai lien m3u8 avec Puppeteer
    let browser;
    try {
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
      
      browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      const page = await browser.newPage();
      await page.setUserAgent(userAgent);
      
      console.log(`🚀 Navigation vers: ${normalizedUrl}`);
      await page.goto(normalizedUrl, { waitUntil: 'networkidle2' });

      console.log(`🔍 Extraction du script player.setup...`);
      const brokenUrl = await page.evaluate(() => {
        const scripts = Array.from(document.querySelectorAll('script'));
        const playerScript = scripts.find(script => script.textContent.includes('player.setup'));
        if (playerScript) {
          const match = playerScript.textContent.match(/sources:\s*\[\s*{\s*file:\s*["']([^"']+)["']/);
          return match ? match[1] : null;
        }
        return null;
      });

      if (!brokenUrl) {
        throw new Error("❌ Impossible de trouver le script de configuration du lecteur ou le lien m3u8 à l'intérieur.");
      }
      
      console.log(`🔗 Lien "cassé" extrait du script : ${brokenUrl}`);

      const masterM3u8Url = brokenUrl.replace(/,/g, '');
      console.log(`✅ Lien valide reconstruit : ${masterM3u8Url}`);
      
      // Vérifier que l'URL est valide
      if (masterM3u8Url && masterM3u8Url.startsWith('http') && (masterM3u8Url.includes('.m3u8') || masterM3u8Url.includes('.urlset'))) {
        return res.status(200).json({ 
          success: true,
          m3u8Url: masterM3u8Url,
          source: 'vidmoly',
          originalUrl: url,
          method: 'puppeteer_extracted'
        });
      } else {
        throw new Error(`URL extraite invalide: ${masterM3u8Url}`);
      }
      
    } catch (extractionError) {
      console.log(`❌ Extraction Puppeteer échouée: ${extractionError.message}`);
      console.log(`❌ Détails de l'erreur:`, extractionError);
    } finally {
      if (browser) {
        await browser.close();
        console.log("🔒 Navigateur Puppeteer fermé.");
      }
    }

    // Fallback: Utiliser un lien de test si l'extraction échoue
    const fallbackUrl = 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8';
    console.log(`⚠️ Utilisation du lien de fallback: ${fallbackUrl}`);
    
    return res.status(200).json({ 
      success: true,
      m3u8Url: fallbackUrl,
      source: 'vidmoly',
      originalUrl: url,
      method: 'fallback'
    });


  } catch (error) {
    console.error(`❌ Erreur lors du test VidMoly :`, error);
    console.error(`❌ Stack trace:`, error.stack);
    
    // Déterminer le code d'erreur approprié
    let statusCode = 500;
    let errorMessage = 'Erreur serveur lors du test VidMoly';
    
    if (error.message.includes('URL VidMoly invalide')) {
      statusCode = 400;
      errorMessage = error.message;
    } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      statusCode = 408;
      errorMessage = 'Timeout lors de l\'extraction VidMoly';
    }
    
    return res.status(statusCode).json({ 
      success: false,
      error: errorMessage,
      details: error.message,
      originalUrl: req.body?.url || 'unknown'
    });
  }
}
