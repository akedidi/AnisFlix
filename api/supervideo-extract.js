// SuperVideo scraper using your working approach adapted for Vercel
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

    // Try multiple proxy services to bypass Cloudflare
    const proxyServices = [
      {
        name: 'AllOrigins',
        url: `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
        }
      },
      {
        name: 'CORSProxy',
        url: `https://corsproxy.io/?${encodeURIComponent(url)}`,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
        }
      },
      {
        name: 'ThingProxy',
        url: `https://thingproxy.freeboard.io/fetch/${url}`,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
        }
      },
      {
        name: 'ProxyCurl',
        url: `https://napi.phantomjscloud.com/single/browser/v1?token=free&url=${encodeURIComponent(url)}`,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
        }
      },
      {
        name: 'ScraperAPI',
        url: `https://api.scraperapi.com/?api_key=free&url=${encodeURIComponent(url)}&render=true&country_code=us`,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
        }
      },
      {
        name: 'ScrapingBee',
        url: `https://app.scrapingbee.com/api/v1/?api_key=free&url=${encodeURIComponent(url)}&render_js=true&premium_proxy=true`,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
        }
      }
    ];

    let html = null;
    let successfulService = null;

    for (const service of proxyServices) {
      try {
        console.log(`Trying ${service.name}...`);
        const response = await fetch(service.url, {
          method: 'GET',
          headers: service.headers,
          timeout: 30000
        });

        if (response.ok) {
          let responseText = await response.text();
          
          // Check if we got Cloudflare page
          if (responseText.includes('Attention Required!') || responseText.includes('Cloudflare') || responseText.includes('Just a moment')) {
            console.log(`❌ ${service.name} returned Cloudflare page`);
            continue;
          }
          
          html = responseText;
          successfulService = service.name;
          console.log(`✅ ${service.name} successful`);
          break;
        } else {
          console.log(`❌ ${service.name} failed: ${response.status}`);
        }
      } catch (error) {
        console.log(`❌ ${service.name} error:`, error.message);
      }
    }

    if (!html) {
      // If all proxy services fail, try one more approach with different headers
      console.log('All proxy services failed, trying direct approach with advanced headers...');
      
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Language': 'en-US,en;q=0.9,fr;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"Windows"',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1',
            'Referer': 'https://supervideo.cc/',
          },
          timeout: 30000
        });

        if (response.ok) {
          html = await response.text();
          successfulService = 'Direct Advanced';
          console.log(`✅ Direct Advanced successful`);
        } else {
          throw new Error(`Direct approach failed: ${response.status}`);
        }
      } catch (error) {
        console.log(`❌ Direct Advanced error:`, error.message);
      }
    }

    if (!html) {
      return res.status(500).json({ 
        error: 'All extraction methods failed',
        details: 'Could not bypass Cloudflare protection. SuperVideo may have enhanced their protection.',
        suggestion: 'Try again later or contact support if the issue persists.'
      });
    }

    console.log(`Content fetched using: ${successfulService}, length: ${html.length}`);

    // Extract m3u8 using your working patterns
    const m3u8Patterns = [
      // Direct m3u8 URLs
      /https?:\/\/[^\s"']+\.m3u8[^\s"']*/g,
      // JWPlayer configuration
      /"file"\s*:\s*"([^"]*\.m3u8[^"]*)"/g,
      /'file'\s*:\s*'([^']*\.m3u8[^']*)'/g,
      /file\s*:\s*["']([^"']*\.m3u8[^"']*)["']/g,
      // JWPlayer sources array
      /sources\s*:\s*\[[^\]]*"([^"]*\.m3u8[^"]*)"[^\]]*\]/g,
      /sources\s*:\s*\[[^\]]*'([^']*\.m3u8[^']*)'[^\]]*\]/g,
      // Base64 encoded URLs
      /"([A-Za-z0-9+/=]{50,})"/g,
      /'([A-Za-z0-9+/=]{50,})'/g,
      // Encoded URLs with atob
      /atob\s*\(\s*["']([^"']+)["']\s*\)/g,
      /atob\s*\(\s*'([^']+)'\s*\)/g,
      // JavaScript variables
      /var\s+\w+\s*=\s*["']([^"']*\.m3u8[^"']*)["']/g,
      /const\s+\w+\s*=\s*["']([^"']*\.m3u8[^"']*)["']/g,
      /let\s+\w+\s*=\s*["']([^"']*\.m3u8[^"']*)["']/g,
      // Object properties
      /\w+\.src\s*=\s*["']([^"']*\.m3u8[^"']*)["']/g,
      /\w+\.file\s*=\s*["']([^"']*\.m3u8[^"']*)["']/g,
      // SuperVideo specific patterns
      /playerInstance\.load\s*\(\s*["']([^"']*\.m3u8[^"']*)["']/g,
      /jwplayer\([^)]+\)\.load\s*\(\s*["']([^"']*\.m3u8[^"']*)["']/g,
      // URL patterns in JavaScript
      /url\s*:\s*["']([^"']*\.m3u8[^"']*)["']/g,
      /source\s*:\s*["']([^"']*\.m3u8[^"']*)["']/g,
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
          } else if (candidate.includes('sources:')) {
            candidate = candidate.match(/"([^"]*\.m3u8[^"]*)"/)?.[1] || candidate;
          } else if (candidate.includes('atob(')) {
            candidate = candidate.match(/["']([^"']+)["']/)?.[1] || candidate;
          } else if (candidate.includes('var ')) {
            candidate = candidate.match(/["']([^"']*\.m3u8[^"']*)["']/)?.[1] || candidate;
          } else if (candidate.includes('.src =')) {
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
        source: 'supervideo-extracted'
      });
    } else {
      // Log some debug info
      console.log('HTML preview:', html.substring(0, 2000));
      return res.status(500).json({ 
        error: 'No m3u8 link found in page content',
        details: 'Could not extract m3u8 from SuperVideo page'
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