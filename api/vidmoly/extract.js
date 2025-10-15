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

  let browser;
  try {
    const { url } = req.body;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL VidMoly requise' });
    }

    if (!url.includes('vidmoly.net')) {
      return res.status(400).json({ error: 'URL VidMoly invalide' });
    }

    console.log(`🚀 Lancement du scraping pour : ${url}`);

    // Lancer Puppeteer exactement comme dans votre code
    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });

    // Extraction exactement comme dans votre code
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
      return res.status(404).json({ 
        error: 'Impossible de trouver le lien m3u8 sur la page.' 
      });
    }
    
    const masterM3u8Url = brokenUrl.replace(/,/g, '');
    console.log(`✅ Lien master.m3u8 trouvé : ${masterM3u8Url}`);

    return res.status(200).json({ 
      success: true,
      m3u8Url: masterM3u8Url,
      source: 'vidmoly',
      originalUrl: url
    });

  } catch (error) {
    console.error(`❌ Erreur critique lors du scraping : ${error.message}`);
    return res.status(500).json({ 
      error: 'Erreur serveur lors de l\'extraction VidMoly',
      details: error.message 
    });
  } finally {
    if (browser) {
      await browser.close();
      console.log("✅ Navigateur Puppeteer fermé.");
    }
  }
}
