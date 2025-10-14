// SuperVideo scraper using the provided working code
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  // Validate SuperVideo URL
  if (!url.includes('supervideo.cc/e/') && !url.includes('supervideo.my/e/')) {
    return res.status(400).json({ error: 'Invalid SuperVideo URL' });
  }

  let browser;
  try {
    console.log(`🚀 Starting SuperVideo extraction for: ${url}`);

    // Configure browser based on environment
    const isVercel = process.env.VERCEL === '1';
    
    if (isVercel) {
      // Use Chromium for Vercel
      browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
        ignoreHTTPSErrors: true,
      });
    } else {
      // Use local Puppeteer for development
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
    }

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36');
    
    await page.goto(url, { waitUntil: 'networkidle2' });
    
    const frames = page.frames();
    let playerFrame = frames.find(f => f.url().includes('supervideo.cc/e/'));

    if (!playerFrame) {
      console.error("❌ Impossible de localiser l'iframe du lecteur vidéo.");
      return res.status(500).json({ error: "Impossible de localiser l'iframe du lecteur vidéo" });
    }

    await playerFrame.waitForFunction('typeof jwplayer !== "undefined"', { timeout: 10000 });
    
    const m3u8Link = await playerFrame.evaluate(() => {
      try {
        const playerInstance = jwplayer('vplayer'); 
        const config = playerInstance.getConfig();

        if (config && config.sources && config.sources.length > 0) {
          return config.sources[0].file;
        }
        return null;
      } catch (e) {
        return null;
      }
    });

    if (m3u8Link) {
      console.log(`🔗 M3U8 link found: ${m3u8Link}`);
      return res.status(200).json({ 
        success: true, 
        m3u8: m3u8Link 
      });
    } else {
      throw new Error('Impossible de récupérer la configuration du lecteur JWPlayer');
    }

  } catch (error) {
    console.error('❌ SuperVideo extraction error:', error.message);
    return res.status(500).json({ 
      error: 'Failed to extract m3u8 link',
      details: error.message 
    });
  } finally {
    if (browser) {
      await browser.close();
      console.log('Navigateur Puppeteer fermé.');
    }
  }
}