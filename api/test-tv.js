export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { channelId } = req.query;

    if (!channelId) {
      return res.status(400).json({ error: 'Channel ID required' });
    }

    const testUrl = `https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/${channelId}.m3u8`;
    
    console.log(`[TEST] Testing URL: ${testUrl}`);

    // Test avec redirect manual
    const res1 = await fetch(testUrl, { 
      method: "GET", 
      redirect: "manual",
      headers: {
        "User-Agent": "Mozilla/5.0 (Node HLS Proxy)",
        "Accept": "*/*",
        "Referer": "https://fremtv.lol/"
      }
    });

    console.log(`[TEST] Status: ${res1.status}`);
    console.log(`[TEST] Headers:`, Object.fromEntries(res1.headers.entries()));

    if (res1.status >= 300 && res1.status < 400) {
      const location = res1.headers.get('location');
      console.log(`[TEST] Redirect to: ${location}`);
      
      return res.json({
        status: res1.status,
        redirect: true,
        location: location,
        headers: Object.fromEntries(res1.headers.entries())
      });
    }

    if (res1.ok) {
      const contentType = res1.headers.get('content-type');
      const contentLength = res1.headers.get('content-length');
      
      // Lire seulement les premiers caractères pour voir le type de contenu
      const text = await res1.text();
      const preview = text.substring(0, 200);
      
      console.log(`[TEST] Content-Type: ${contentType}`);
      console.log(`[TEST] Content-Length: ${contentLength}`);
      console.log(`[TEST] Preview: ${preview}`);
      
      return res.json({
        status: res1.status,
        redirect: false,
        contentType: contentType,
        contentLength: contentLength,
        preview: preview,
        isM3U8: text.includes("#EXTM3U"),
        isMP4: contentType?.includes('video/mp4'),
        headers: Object.fromEntries(res1.headers.entries())
      });
    }

    return res.json({
      status: res1.status,
      error: "Request failed",
      headers: Object.fromEntries(res1.headers.entries())
    });

  } catch (error) {
    console.error('[TEST ERROR]', error);
    return res.status(500).json({ 
      error: 'Test failed',
      details: error.message 
    });
  }
}
