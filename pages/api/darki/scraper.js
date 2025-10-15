import axios from 'axios';

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
    const { m3u8Url } = req.body;

    if (!m3u8Url || typeof m3u8Url !== 'string') {
      return res.status(400).json({ error: 'URL m3u8 Darki requise' });
    }

    if (!m3u8Url.includes('darkibox.com')) {
      return res.status(400).json({ error: 'URL Darki invalide' });
    }

    console.log(`🎬 Validation du lien m3u8 Darki : ${m3u8Url}`);

    // Pour Darki, on utilise directement le lien m3u8 fourni
    // Pas besoin de scraping, le lien est déjà dans la réponse API
    console.log(`✅ Lien m3u8 Darki validé : ${m3u8Url}`);

    return res.status(200).json({
      success: true,
      streamUrl: m3u8Url,
      originalUrl: m3u8Url,
      source: 'darki'
    });

  } catch (error) {
    console.error('❌ Erreur lors du traitement Darki:', error);
    
    return res.status(500).json({ 
      error: 'Erreur serveur lors du traitement Darki',
      details: error.message 
    });
  }
}
