import { getFrenchProviderStreams } from './_services/french-providers/index.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { provider, tmdbId, type = 'movie', season, episode } = req.query;
  if (!provider || !tmdbId) {
    return res.status(400).json({ error: 'Paramètres provider et tmdbId requis' });
  }

  try {
    const streams = await getFrenchProviderStreams({
      provider: String(provider).toLowerCase(),
      tmdbId: Number(tmdbId),
      mediaType: type,
      season: season ? Number(season) : undefined,
      episode: episode ? Number(episode) : undefined,
    });
    return res.status(200).json({ success: true, provider, streams });
  } catch (error) {
    console.error('❌ [French Providers]', error.message);
    return res.status(500).json({ success: false, streams: [], error: error.message });
  }
}
