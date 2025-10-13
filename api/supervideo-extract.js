// SuperVideo scraper using Puppeteer
import puppeteer from 'puppeteer';

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

    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ],
    });

    const page = await browser.newPage();
    
    // Set user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36');
    
    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 });

    // Navigate to the SuperVideo URL
    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });

    console.log('✅ Page loaded successfully');

    // Wait for the iframe to load
    await page.waitForSelector('iframe', { timeout: 10000 });
    
    // Get all frames
    const frames = page.frames();
    console.log(`📋 Found ${frames.length} frames`);

    // Find the player iframe
    let playerFrame = frames.find(f => 
      f.url().includes('supervideo.cc/e/') || 
      f.url().includes('supervideo.my/e/')
    );

    if (!playerFrame) {
      // Try to find any iframe that might contain the player
      playerFrame = frames.find(f => f.url() !== page.url());
    }

    if (!playerFrame) {
      throw new Error("❌ Impossible de localiser l'iframe du lecteur vidéo");
    }

    console.log(`✅ Player iframe found: ${playerFrame.url().substring(0, 80)}...`);

    // Wait for jwplayer to be available
    try {
      await playerFrame.waitForFunction('typeof jwplayer !== "undefined"', { 
        timeout: 15000 
      });
      console.log('✨ JWPlayer detected');
    } catch (e) {
      console.log('⚠️ JWPlayer not found, trying alternative approach');
    }

    // Extract m3u8 link
    const m3u8Link = await playerFrame.evaluate(() => {
      try {
        // Try to get jwplayer instance
        if (typeof jwplayer !== 'undefined') {
          const playerInstance = jwplayer('vplayer');
          const config = playerInstance.getConfig();
          
          if (config && config.sources && config.sources.length > 0) {
            return config.sources[0].file;
          }
        }

        // Alternative: look for video sources in the DOM
        const videoElements = document.querySelectorAll('video source');
        for (const source of videoElements) {
          if (source.src && source.src.includes('.m3u8')) {
            return source.src;
          }
        }

        // Alternative: look for script tags with m3u8 URLs
        const scripts = document.querySelectorAll('script');
        for (const script of scripts) {
          const content = script.textContent || script.innerHTML;
          const m3u8Match = content.match(/https?:\/\/[^\s"']+\.m3u8[^\s"']*/g);
          if (m3u8Match && m3u8Match.length > 0) {
            return m3u8Match[0];
          }
        }

        return null;
      } catch (e) {
        console.error('Error in frame evaluation:', e);
        return null;
      }
    });

    if (m3u8Link) {
      console.log(`🔗 M3U8 link extracted: ${m3u8Link}`);
      return res.status(200).json({ 
        success: true, 
        m3u8: m3u8Link,
        source: 'supervideo'
      });
    } else {
      throw new Error('❌ Impossible de récupérer le lien m3u8');
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
      console.log('🔒 Browser closed');
    }
  }
}
