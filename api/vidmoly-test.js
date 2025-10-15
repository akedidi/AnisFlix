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

  try {
    const { url } = req.body;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL VidMoly requise' });
    }

    console.log(`🚀 Test VidMoly pour : ${url}`);

    // URL de test hardcodée pour tester le système
    const testM3u8Url = 'https://box-1102-t.vmeas.cloud/hls/xqx2pxnzzzokjiqbtgisd6qmvcyphadnb2tywbp4bj36pfsnanpurt7mpaea.urlset/master.m3u8';
    
    console.log(`✅ Lien m3u8 de test : ${testM3u8Url}`);

    return res.status(200).json({ 
      success: true,
      m3u8Url: testM3u8Url,
      source: 'vidmoly',
      originalUrl: url,
      method: 'test'
    });

  } catch (error) {
    console.error(`❌ Erreur lors du test VidMoly : ${error.message}`);
    return res.status(500).json({ 
      error: 'Erreur serveur lors du test VidMoly',
      details: error.message 
    });
  }
}
