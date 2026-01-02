import type { VercelRequest, VercelResponse } from '@vercel/node';

const TRAKT_CLIENT_ID = process.env.TRAKT_CLIENT_ID!;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Request device code from Trakt
        const response = await fetch('https://api.trakt.tv/oauth/device/code', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                client_id: TRAKT_CLIENT_ID,
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to generate device code');
        }

        const data = await response.json();

        // Return device code info to iOS app
        return res.status(200).json({
            device_code: data.device_code,
            user_code: data.user_code,
            verification_url: data.verification_url,
            expires_in: data.expires_in,
            interval: data.interval,
        });
    } catch (error) {
        console.error('Trakt device code error:', error);
        return res.status(500).json({ error: 'Failed to generate device code' });
    }
}
