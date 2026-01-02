import type { VercelRequest, VercelResponse } from '@vercel/node';

const TRAKT_CLIENT_ID = process.env.TRAKT_CLIENT_ID!;
const TRAKT_CLIENT_SECRET = process.env.TRAKT_CLIENT_SECRET!;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { device_code } = req.body;

    if (!device_code) {
        return res.status(400).json({ error: 'Missing device_code' });
    }

    try {
        // Poll for device token
        const response = await fetch('https://api.trakt.tv/oauth/device/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                code: device_code,
                client_id: TRAKT_CLIENT_ID,
                client_secret: TRAKT_CLIENT_SECRET,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            // Return specific error codes for polling
            if (response.status === 400) {
                return res.status(400).json({ error: 'pending', message: 'User has not authorized yet' });
            }
            if (response.status === 404) {
                return res.status(404).json({ error: 'not_found', message: 'Invalid device code' });
            }
            if (response.status === 409) {
                return res.status(409).json({ error: 'already_used', message: 'Code already used' });
            }
            if (response.status === 410) {
                return res.status(410).json({ error: 'expired', message: 'Code expired' });
            }
            if (response.status === 418) {
                return res.status(418).json({ error: 'denied', message: 'User denied authorization' });
            }
            if (response.status === 429) {
                return res.status(429).json({ error: 'slow_down', message: 'Polling too fast' });
            }
            throw new Error('Unknown error');
        }

        // Success - return tokens
        return res.status(200).json({
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expires_in: data.expires_in,
            token_type: data.token_type,
        });
    } catch (error) {
        console.error('Trakt device token error:', error);
        return res.status(500).json({ error: 'server_error', message: 'Failed to get token' });
    }
}
