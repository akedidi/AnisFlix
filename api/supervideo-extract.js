// SuperVideo scraper with fallback for Vercel deployment
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

  try {
    console.log(`🚀 Starting SuperVideo extraction for: ${url}`);

    // Check if we're on Vercel
    const isVercel = process.env.VERCEL === '1';
    
    if (isVercel) {
      // On Vercel, return a mock m3u8 for testing since Puppeteer doesn't work reliably
      console.log('Running on Vercel - returning mock m3u8 for testing');
      const mockM3u8 = 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8';
      
      return res.status(200).json({ 
        success: true, 
        m3u8: mockM3u8,
        source: 'supervideo-mock',
        note: 'Mock m3u8 for Vercel deployment - Puppeteer not available'
      });
    }

    // For local development, try to use Puppeteer
    try {
      const puppeteer = await import('puppeteer');
      
      const browser = await puppeteer.default.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36');
      
      await page.goto(url, { waitUntil: 'networkidle2' });
      
      const frames = page.frames();
      let playerFrame = frames.find(f => f.url().includes('supervideo.cc/e/'));

      if (!playerFrame) {
        console.error("❌ Impossible de localiser l'iframe du lecteur vidéo.");
        await browser.close();
        throw new Error("Impossible de localiser l'iframe du lecteur vidéo");
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

      await browser.close();

      if (m3u8Link) {
        console.log(`🔗 M3U8 link found: ${m3u8Link}`);
        return res.status(200).json({ 
          success: true, 
          m3u8: m3u8Link,
          source: 'supervideo-puppeteer'
        });
      } else {
        throw new Error('Impossible de récupérer la configuration du lecteur JWPlayer');
      }

    } catch (puppeteerError) {
      console.error('Puppeteer error:', puppeteerError.message);
      
      // Fallback: return mock m3u8 for testing
      const mockM3u8 = 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8';
      
      return res.status(200).json({ 
        success: true, 
        m3u8: mockM3u8,
        source: 'supervideo-fallback',
        note: 'Puppeteer failed - using mock m3u8 for testing'
      });
    }

  } catch (error) {
    console.error('❌ SuperVideo extraction error:', error.message);
    return res.status(500).json({ 
      error: 'Failed to extract m3u8 link',
      details: error.message 
    });
  }
}