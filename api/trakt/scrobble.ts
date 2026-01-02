import type { VercelRequest, VercelResponse } from '@vercel/node';

const TRAKT_CLIENT_ID = process.env.TRAKT_CLIENT_ID!;

interface ScrobbleRequest {
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
    progress: number; // 0-100
    action: 'start' | 'pause' | 'stop';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { access_token, movie, episode, progress, action }: ScrobbleRequest = req.body;

    if (!access_token) {
        return res.status(401).json({ error: 'Missing access token' });
    }

    if (!movie && !episode) {
        return res.status(400).json({ error: 'Must provide either movie or episode' });
    }

    if (progress < 0 || progress > 100) {
        return res.status(400).json({ error: 'Progress must be between 0 and 100' });
    }

    try {
        const endpoint = action === 'start'
            ? 'https://api.trakt.tv/scrobble/start'
            : action === 'pause'
                ? 'https://api.trakt.tv/scrobble/pause'
                : 'https://api.trakt.tv/scrobble/stop';

        const response = await fetch(endpoint, {
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
                progress,
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('Trakt scrobble error:', error);
            return res.status(response.status).json({ error: 'Scrobble failed' });
        }

        const data = await response.json();
        return res.status(200).json(data);
    } catch (error) {
        console.error('Trakt scrobble error:', error);
        return res.status(500).json({ error: 'Failed to scrobble' });
    }
}
