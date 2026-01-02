export default async function handler(req, res) {
    const { code } = req.query;

    if (!code) {
        return res.redirect(302, '/settings?trakt=error');
    }

    // Forward to proxy.js handler
    const proxyUrl = `/api/proxy?type=trakt-callback&code=${encodeURIComponent(code)}`;

    try {
        // Make internal request to proxy handler
        const baseUrl = `https://${req.headers.host}`;
        const response = await fetch(`${baseUrl}${proxyUrl}`, {
            method: 'GET',
            headers: {
                'cookie': req.headers.cookie || '',
            },
        });

        // Forward cookies from proxy response
        // Forward cookies from proxy response
        // Use getSetCookie() if available (Node 18+), otherwise split manually if needed
        let cookies = [];
        if (typeof response.headers.getSetCookie === 'function') {
            cookies = response.headers.getSetCookie();
        } else {
            // Fallback for older environments, though imperfect for dates with commas
            const cookieHeader = response.headers.get('set-cookie');
            if (cookieHeader) cookies = [cookieHeader];
        }

        if (cookies.length > 0) {
            res.setHeader('Set-Cookie', cookies);
        }

        // Redirect to settings
        if (response.ok) {
            return res.redirect(302, '/settings?trakt=connected');
        } else {
            return res.redirect(302, '/settings?trakt=error');
        }
    } catch (error) {
        console.error('Callback error:', error);
        return res.redirect(302, '/settings?trakt=error');
    }
}
