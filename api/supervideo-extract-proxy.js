// SuperVideo scraper using proxy services to bypass 403 errors
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
    console.log(`🚀 Starting SuperVideo proxy extraction for: ${url}`);

    // Try different proxy services and methods
    const proxyMethods = [
      // Method 1: Use a public proxy service
      {
        name: 'Proxy Service 1',
        url: `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
        extract: (data) => {
          try {
            const parsed = JSON.parse(data);
            return parsed.contents;
          } catch (e) {
            return data;
          }
        }
      },
      // Method 2: Use another proxy service
      {
        name: 'Proxy Service 2', 
        url: `https://cors-anywhere.herokuapp.com/${url}`,
        extract: (data) => data,
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        }
      },
      // Method 3: Use a different CORS proxy
      {
        name: 'Proxy Service 3',
        url: `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
        extract: (data) => data
      },
      // Method 4: Try with different referer
      {
        name: 'Direct with Referer',
        url: url,
        extract: (data) => data,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://google.com/',
          'Origin': 'https://google.com',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'cross-site',
          'Cache-Control': 'max-age=0'
        }
      },
      // Method 5: Try with mobile headers and different referer
      {
        name: 'Mobile with Referer',
        url: url,
        extract: (data) => data,
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
          'Referer': 'https://www.google.com/search?q=supervideo',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive'
        }
      }
    ];

    let html = null;
    let successfulMethod = null;

    // Try each proxy method
    for (const method of proxyMethods) {
      try {
        console.log(`Trying ${method.name}...`);
        
        const response = await fetch(method.url, {
          method: 'GET',
          headers: method.headers || {
            'User-Agent': 'Mozilla/5.0 (compatible; SuperVideoBot/1.0)',
          },
          timeout: 10000
        });
        
        if (response.ok) {
          const data = await response.text();
          html = method.extract(data);
          successfulMethod = method.name;
          console.log(`✅ ${method.name} successful`);
          break;
        } else {
          console.log(`❌ ${method.name} failed: ${response.status}`);
        }
      } catch (error) {
        console.log(`❌ ${method.name} error:`, error.message);
      }
    }

    if (!html) {
      throw new Error('All proxy methods failed');
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
        source: 'supervideo-proxy',
        method: successfulMethod
      });
    } else {
      // Log some debug info
      console.log('HTML preview:', html.substring(0, 1000));
      throw new Error('No m3u8 link found in page content');
    }

  } catch (error) {
    console.error('❌ SuperVideo proxy extraction error:', error.message);
    return res.status(500).json({ 
      error: 'Failed to extract m3u8 link',
      details: error.message 
    });
  }
}
