import type { VercelRequest, VercelResponse } from '@vercel/node';

const TRAKT_CLIENT_ID = process.env.TRAKT_CLIENT_ID!;

interface CheckinRequest {
    access_token: string;
    movie?: {
        ids: {
            tmdb: number;
        };
    };
    episode?: {
        ids: {
            tmdb: number;
        };
    };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { access_token, movie, episode }: CheckinRequest = req.body;

    if (!access_token) {
        return res.status(401).json({ error: 'Missing access token' });
    }

    if (!movie && !episode) {
        return res.status(400).json({ error: 'Must provide either movie or episode' });
    }

    try {
        const response = await fetch('https://api.trakt.tv/checkin', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${access_token}`,
                'trakt-api-version': '2',
                'trakt-api-key': TRAKT_CLIENT_ID,
            },
            body: JSON.stringify({
                movie,
                episode,
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('Trakt checkin error:', error);
            return res.status(response.status).json({ error: 'Checkin failed' });
        }

        const data = await response.json();
        return res.status(200).json(data);
    } catch (error) {
        console.error('Trakt checkin error:', error);
        return res.status(500).json({ error: 'Failed to checkin' });
    }
}
