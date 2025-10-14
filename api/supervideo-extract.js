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
      // Approach 1: ScraperAPI (best for Cloudflare bypass)
      {
        name: 'ScraperAPI',
        url: `https://api.scraperapi.com/?api_key=free&url=${encodeURIComponent(url)}&render=true`,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
        }
      },
      // Approach 2: ProxyCurl (Cloudflare bypass)
      {
        name: 'ProxyCurl',
        url: `https://napi.phantomjscloud.com/single/browser/v1?token=free&url=${encodeURIComponent(url)}`,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
        }
      },
      // Approach 3: ScrapingBee
      {
        name: 'ScrapingBee',
        url: `https://app.scrapingbee.com/api/v1/?api_key=free&url=${encodeURIComponent(url)}&render_js=true`,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
        }
      },
      // Approach 4: Bright Data (free tier)
      {
        name: 'Bright Data',
        url: `https://api.brightdata.com/dca/trigger?collector=c_1234567890&queue_next=1&url=${encodeURIComponent(url)}`,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
        }
      },
      // Approach 5: AllOrigins with different endpoint
      {
        name: 'AllOrigins Get',
        url: `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
        }
      },
      // Approach 6: CORSProxy.io with different format
      {
        name: 'CORSProxy.io',
        url: `https://corsproxy.io/?${encodeURIComponent(url)}`,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
        }
      },
      // Approach 7: ThingProxy with different endpoint
      {
        name: 'ThingProxy',
        url: `https://thingproxy.freeboard.io/fetch/${url}`,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
        }
      },
      // Approach 8: Direct fetch with advanced headers
      {
        name: 'Direct Advanced',
        url: url,
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
        }
      }
    ];

    let html = null;
    let successfulMethod = null;

    // Try each approach
    for (const approach of approaches) {
      try {
        console.log(`Trying ${approach.name}...`);
        const targetUrl = approach.url || url;
        const response = await fetch(targetUrl, {
          method: 'GET',
          headers: approach.headers,
          timeout: 20000
        });
        
        if (response.ok) {
          let responseText = await response.text();
          
          // Handle different proxy response formats
          if (approach.name === 'AllOrigins Get') {
            try {
              const data = JSON.parse(responseText);
              responseText = data.contents;
            } catch (e) {
              // If not JSON, use as-is
            }
          }
          
          // Check if we got Cloudflare page
          if (responseText.includes('Attention Required!') || responseText.includes('Cloudflare')) {
            console.log(`❌ ${approach.name} returned Cloudflare page`);
            continue;
          }
          
          html = responseText;
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
      console.log('All proxy approaches failed');
      return res.status(500).json({ 
        error: 'All extraction methods failed',
        details: 'Could not fetch SuperVideo page content'
      });
    }

    console.log(`Content fetched using: ${successfulMethod}`);

    // Extract m3u8 using comprehensive patterns
    const m3u8Patterns = [
      // Direct m3u8 URLs
      /https?:\/\/[^\s"']+\.m3u8[^\s"']*/g,
      // JWPlayer configuration (most common for SuperVideo)
      /"file"\s*:\s*"([^"]*\.m3u8[^"]*)"/g,
      /'file'\s*:\s*'([^']*\.m3u8[^']*)'/g,
      /file\s*:\s*["']([^"']*\.m3u8[^"']*)["']/g,
      // JWPlayer sources array
      /sources\s*:\s*\[[^\]]*"([^"]*\.m3u8[^"]*)"[^\]]*\]/g,
      /sources\s*:\s*\[[^\]]*'([^']*\.m3u8[^']*)'[^\]]*\]/g,
      // Video element sources
      /src\s*=\s*["']([^"']*\.m3u8[^"']*)["']/g,
      /data-src\s*=\s*["']([^"']*\.m3u8[^"']*)["']/g,
      // HLS specific patterns
      /hls\s*:\s*["']([^"']*\.m3u8[^"']*)["']/g,
      /\.loadSource\s*\(\s*["']([^"']*\.m3u8[^"']*)["']/g,
      // Base64 encoded URLs (common in SuperVideo)
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
      // Iframe sources
      /iframe[^>]*src\s*=\s*["']([^"']*\.m3u8[^"']*)["']/g,
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