export default async function handler(req, res) {
    // Redirect to proxy.js with trakt-callback type
    const { code } = req.query;

    if (!code) {
        return res.redirect(302, '/settings?trakt=error');
    }

    // Forward to proxy.js handler
    return res.redirect(302, `/api/proxy?type=trakt-callback&code=${encodeURIComponent(code)}`);
}
