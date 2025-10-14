// SuperVideo scraper using direct fetch approach (no Puppeteer)
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

    // Try multiple approaches to get the page content
    const approaches = [
      // Approach 1: Direct fetch with minimal headers
      {
        name: 'Direct Fetch',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        }
      },
      // Approach 2: With referer
      {
        name: 'With Referer',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
          'Referer': 'https://supervideo.cc/',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        }
      },
      // Approach 3: Mobile headers
      {
        name: 'Mobile Headers',
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }
      }
    ];

    let html = null;
    let successfulMethod = null;

    // Try each approach
    for (const approach of approaches) {
      try {
        console.log(`Trying ${approach.name}...`);
        const response = await fetch(url, {
          method: 'GET',
          headers: approach.headers,
          timeout: 15000
        });
        
        if (response.ok) {
          html = await response.text();
          successfulMethod = approach.name;
          console.log(`✅ ${approach.name} successful`);
          break;
        } else {
          console.log(`❌ ${approach.name} failed: ${response.status}`);
        }
      } catch (error) {
        console.log(`❌ ${approach.name} error:`, error.message);
      }
    }

    if (!html) {
      throw new Error('All fetch approaches failed');
    }

    console.log(`Content fetched using: ${successfulMethod}`);

    // Extract m3u8 using comprehensive patterns
    const m3u8Patterns = [
      // Direct m3u8 URLs
      /https?:\/\/[^\s"']+\.m3u8[^\s"']*/g,
      // JWPlayer configuration
      /"file"\s*:\s*"([^"]*\.m3u8[^"]*)"/g,
      /'file'\s*:\s*'([^']*\.m3u8[^']*)'/g,
      /file\s*:\s*["']([^"']*\.m3u8[^"']*)["']/g,
      // Source attributes
      /src\s*=\s*["']([^"']*\.m3u8[^"']*)["']/g,
      /data-src\s*=\s*["']([^"']*\.m3u8[^"']*)["']/g,
      // Video sources
      /sources\s*:\s*\[[^\]]*"([^"]*\.m3u8[^"]*)"[^\]]*\]/g,
      // HLS URLs
      /hls\s*:\s*["']([^"']*\.m3u8[^"']*)["']/g,
      // Base64 encoded URLs
      /"([A-Za-z0-9+/=]{50,})"/g,
      // Encoded URLs
      /atob\s*\(\s*["']([^"']+)["']\s*\)/g,
      // JavaScript variables
      /var\s+\w+\s*=\s*["']([^"']*\.m3u8[^"']*)["']/g,
      // Object properties
      /\w+\.src\s*=\s*["']([^"']*\.m3u8[^"']*)["']/g,
      // Iframe sources
      /iframe[^>]*src\s*=\s*["']([^"']*\.m3u8[^"']*)["']/g,
    ];

    let m3u8Link = null;

    for (const pattern of m3u8Patterns) {
      const matches = html.match(pattern);
      if (matches && matches.length > 0) {
        for (const match of matches) {
          let candidate = match;
          
          // Clean up the match based on pattern type
          if (candidate.includes('"file"')) {
            candidate = candidate.match(/"([^"]*\.m3u8[^"]*)"/)?.[1] || candidate;
          } else if (candidate.includes("'file'")) {
            candidate = candidate.match(/'([^']*\.m3u8[^']*)'/)?.[1] || candidate;
          } else if (candidate.includes('file:')) {
            candidate = candidate.match(/["']([^"']*\.m3u8[^"']*)["']/)?.[1] || candidate;
          } else if (candidate.includes('src=')) {
            candidate = candidate.match(/["']([^"']*\.m3u8[^"']*)["']/)?.[1] || candidate;
          } else if (candidate.includes('data-src=')) {
            candidate = candidate.match(/["']([^"']*\.m3u8[^"']*)["']/)?.[1] || candidate;
          } else if (candidate.includes('sources:')) {
            candidate = candidate.match(/"([^"]*\.m3u8[^"]*)"/)?.[1] || candidate;
          } else if (candidate.includes('hls:')) {
            candidate = candidate.match(/["']([^"']*\.m3u8[^"']*)["']/)?.[1] || candidate;
          } else if (candidate.includes('atob(')) {
            candidate = candidate.match(/["']([^"']+)["']/)?.[1] || candidate;
          } else if (candidate.includes('var ')) {
            candidate = candidate.match(/["']([^"']*\.m3u8[^"']*)["']/)?.[1] || candidate;
          } else if (candidate.includes('.src =')) {
            candidate = candidate.match(/["']([^"']*\.m3u8[^"']*)["']/)?.[1] || candidate;
          } else if (candidate.includes('iframe')) {
            candidate = candidate.match(/["']([^"']*\.m3u8[^"']*)["']/)?.[1] || candidate;
          }
          
          // Try to decode base64 if it looks like base64
          if (/^[A-Za-z0-9+/=]{20,}$/.test(candidate)) {
            try {
              const decoded = Buffer.from(candidate, 'base64').toString('utf-8');
              if (decoded.includes('.m3u8')) {
                candidate = decoded;
              }
            } catch (e) {
              // Not base64, continue with original
            }
          }
          
          if (candidate && candidate.includes('.m3u8') && candidate.startsWith('http')) {
            m3u8Link = candidate;
            break;
          }
        }
        
        if (m3u8Link) break;
      }
    }

    if (m3u8Link) {
      console.log(`🔗 M3U8 link found: ${m3u8Link}`);
      return res.status(200).json({ 
        success: true, 
        m3u8: m3u8Link,
        source: 'supervideo-direct',
        method: successfulMethod
      });
    } else {
      // Log some debug info
      console.log('HTML preview:', html.substring(0, 1000));
      throw new Error('No m3u8 link found in page content');
    }

  } catch (error) {
    console.error('❌ SuperVideo extraction error:', error.message);
    return res.status(500).json({ 
      error: 'Failed to extract m3u8 link',
      details: error.message 
    });
  }
}