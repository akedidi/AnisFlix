import type { VercelRequest, VercelResponse } from '@vercel/node';

const TRAKT_CLIENT_ID = process.env.TRAKT_CLIENT_ID!;
const REDIRECT_URI = 'https://anisflix.vercel.app/auth/trakt/callback';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Generate OAuth authorization URL
    const authUrl = new URL('https://trakt.tv/oauth/authorize');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', TRAKT_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', REDIRECT_URI);

    return res.status(200).json({ authUrl: authUrl.toString() });
}
