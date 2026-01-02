export default async function handler(req, res) {
    const { code } = req.query;

    if (!code) {
        return res.redirect(302, '/settings?trakt=error');
    }

    // Redirect user directly to the proxy handler which sets the cookies
    // This avoids issues with forwarding cookies from internal server-side fetches
    const proxyCallbackUrl = `/api/proxy?type=trakt-callback&code=${encodeURIComponent(code)}`;

    return res.redirect(307, proxyCallbackUrl);
}
