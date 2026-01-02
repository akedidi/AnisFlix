import type { VercelRequest, VercelResponse } from '@vercel/node';

const TRAKT_CLIENT_ID = process.env.TRAKT_CLIENT_ID!;
const TRAKT_CLIENT_SECRET = process.env.TRAKT_CLIENT_SECRET!;
const REDIRECT_URI = 'https://anisflix.vercel.app/auth/trakt/callback';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { action } = req.query;

    try {
        switch (action) {
            case 'auth':
                return handleAuth(req, res);
            case 'callback':
                return handleCallback(req, res);
            case 'device-code':
                return handleDeviceCode(req, res);
            case 'device-token':
                return handleDeviceToken(req, res);
            case 'scrobble':
                return handleScrobble(req, res);
            case 'checkin':
                return handleCheckin(req, res);
            case 'status':
                return handleStatus(req, res);
            case 'disconnect':
                return handleDisconnect(req, res);
            default:
                return res.status(404).json({ error: 'Not found' });
        }
    } catch (error) {
        console.error('Trakt API error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

// Auth - Initiate OAuth
async function handleAuth(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const authUrl = new URL('https://trakt.tv/oauth/authorize');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', TRAKT_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', REDIRECT_URI);

    return res.status(200).json({ authUrl: authUrl.toString() });
}

// Callback - Exchange code for token
async function handleCallback(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { code } = req.query;

    if (!code || typeof code !== 'string') {
        return res.status(400).json({ error: 'Missing authorization code' });
    }

    const response = await fetch('https://api.trakt.tv/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            code,
            client_id: TRAKT_CLIENT_ID,
            client_secret: TRAKT_CLIENT_SECRET,
            redirect_uri: REDIRECT_URI,
            grant_type: 'authorization_code',
        }),
    });

    if (!response.ok) {
        return res.redirect(302, '/settings?trakt=error');
    }

    const data = await response.json();

    res.setHeader('Set-Cookie', [
        `trakt_access_token=${data.access_token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${data.expires_in}`,
        `trakt_refresh_token=${data.refresh_token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=7776000`,
    ]);

    return res.redirect(302, '/settings?trakt=connected');
}

// Device Code - Generate for iOS
async function handleDeviceCode(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const response = await fetch('https://api.trakt.tv/oauth/device/code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: TRAKT_CLIENT_ID }),
    });

    if (!response.ok) {
        throw new Error('Failed to generate device code');
    }

    const data = await response.json();

    return res.status(200).json({
        device_code: data.device_code,
        user_code: data.user_code,
        verification_url: data.verification_url,
        expires_in: data.expires_in,
        interval: data.interval,
    });
}

// Device Token - Poll for token
async function handleDeviceToken(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { device_code } = req.body;

    if (!device_code) {
        return res.status(400).json({ error: 'Missing device_code' });
    }

    const response = await fetch('https://api.trakt.tv/oauth/device/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            code: device_code,
            client_id: TRAKT_CLIENT_ID,
            client_secret: TRAKT_CLIENT_SECRET,
        }),
    });

    const data = await response.json();

    if (!response.ok) {
        if (response.status === 400) return res.status(400).json({ error: 'pending' });
        if (response.status === 404) return res.status(404).json({ error: 'not_found' });
        if (response.status === 409) return res.status(409).json({ error: 'already_used' });
        if (response.status === 410) return res.status(410).json({ error: 'expired' });
        if (response.status === 418) return res.status(418).json({ error: 'denied' });
        if (response.status === 429) return res.status(429).json({ error: 'slow_down' });
        throw new Error('Unknown error');
    }

    return res.status(200).json({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_in: data.expires_in,
        token_type: data.token_type,
    });
}

// Scrobble
async function handleScrobble(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { access_token, movie, episode, progress, action } = req.body;

    if (!access_token) {
        return res.status(401).json({ error: 'Missing access token' });
    }

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
        body: JSON.stringify({ movie, episode, progress }),
    });

    if (!response.ok) {
        return res.status(response.status).json({ error: 'Scrobble failed' });
    }

    const data = await response.json();
    return res.status(200).json(data);
}

// Checkin
async function handleCheckin(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { access_token, movie, episode } = req.body;

    if (!access_token) {
        return res.status(401).json({ error: 'Missing access token' });
    }

    const response = await fetch('https://api.trakt.tv/checkin', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${access_token}`,
            'trakt-api-version': '2',
            'trakt-api-key': TRAKT_CLIENT_ID,
        },
        body: JSON.stringify({ movie, episode }),
    });

    if (!response.ok) {
        return res.status(response.status).json({ error: 'Checkin failed' });
    }

    const data = await response.json();
    return res.status(200).json(data);
}

// Status
async function handleStatus(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const cookies = req.headers.cookie?.split(';').map(c => c.trim()) || [];
    const hasToken = cookies.some(c => c.startsWith('trakt_access_token='));

    if (hasToken) {
        return res.status(200).json({ connected: true });
    }

    return res.status(401).json({ connected: false });
}

// Disconnect
async function handleDisconnect(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    res.setHeader('Set-Cookie', [
        'trakt_access_token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0',
        'trakt_refresh_token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0',
    ]);

    return res.status(200).json({ success: true });
}
