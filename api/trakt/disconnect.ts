import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Clear Trakt cookies
    res.setHeader('Set-Cookie', [
        'trakt_access_token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0',
        'trakt_refresh_token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0',
    ]);

    return res.status(200).json({ success: true });
}
