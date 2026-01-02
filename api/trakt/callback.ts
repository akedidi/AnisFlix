import type { VercelRequest, VercelResponse } from '@vercel/node';

const TRAKT_CLIENT_ID = process.env.TRAKT_CLIENT_ID!;
const TRAKT_CLIENT_SECRET = process.env.TRAKT_CLIENT_SECRET!;
const REDIRECT_URI = 'https://anisflix.vercel.app/auth/trakt/callback';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { code } = req.query;

    if (!code || typeof code !== 'string') {
        return res.status(400).json({ error: 'Missing authorization code' });
    }

    try {
        // Exchange code for access token
        const response = await fetch('https://api.trakt.tv/oauth/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                code,
                client_id: TRAKT_CLIENT_ID,
                client_secret: TRAKT_CLIENT_SECRET,
                redirect_uri: REDIRECT_URI,
                grant_type: 'authorization_code',
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to exchange code for token');
        }

        const data = await response.json();

        // Set httpOnly cookie with access token
        res.setHeader('Set-Cookie', [
            `trakt_access_token=${data.access_token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${data.expires_in}`,
            `trakt_refresh_token=${data.refresh_token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=7776000`, // 90 days
        ]);

        // Redirect to settings page with success
        return res.redirect(302, '/settings?trakt=connected');
    } catch (error) {
        console.error('Trakt OAuth error:', error);
        return res.redirect(302, '/settings?trakt=error');
    }
}
