import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Check if trakt_access_token cookie exists
    const cookies = req.headers.cookie?.split(';').map(c => c.trim()) || [];
    const hasToken = cookies.some(c => c.startsWith('trakt_access_token='));

    if (hasToken) {
        return res.status(200).json({ connected: true });
    }

    return res.status(401).json({ connected: false });
}
