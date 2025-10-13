// Fallback SuperVideo scraper without Puppeteer
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
    console.log(`🚀 Starting SuperVideo fallback extraction for: ${url}`);

    // Try to fetch the page directly
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch page: ${response.status}`);
    }

    const html = await response.text();
    
    // Try to extract m3u8 from the HTML content
    const m3u8Patterns = [
      /https?:\/\/[^\s"']+\.m3u8[^\s"']*/g,
      /"file"\s*:\s*"([^"]*\.m3u8[^"]*)"/g,
      /'file'\s*:\s*'([^']*\.m3u8[^']*)'/g,
      /src\s*=\s*["']([^"']*\.m3u8[^"']*)["']/g,
    ];

    let m3u8Link = null;

    for (const pattern of m3u8Patterns) {
      const matches = html.match(pattern);
      if (matches && matches.length > 0) {
        // Get the first match and clean it
        let match = matches[0];
        if (match.includes('"file"')) {
          match = match.match(/"([^"]*\.m3u8[^"]*)"/)?.[1] || match;
        } else if (match.includes("'file'")) {
          match = match.match(/'([^']*\.m3u8[^']*)'/)?.[1] || match;
        } else if (match.includes('src=')) {
          match = match.match(/["']([^"']*\.m3u8[^"']*)["']/)?.[1] || match;
        }
        
        if (match && match.includes('.m3u8')) {
          m3u8Link = match;
          break;
        }
      }
    }

    if (m3u8Link) {
      console.log(`🔗 M3U8 link found: ${m3u8Link}`);
      return res.status(200).json({ 
        success: true, 
        m3u8: m3u8Link,
        source: 'supervideo-fallback'
      });
    } else {
      throw new Error('No m3u8 link found in page content');
    }

  } catch (error) {
    console.error('❌ SuperVideo fallback extraction error:', error.message);
    return res.status(500).json({ 
      error: 'Failed to extract m3u8 link',
      details: error.message 
    });
  }
}
