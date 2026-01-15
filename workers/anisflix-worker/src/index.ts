/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc` or `wrangler.toml`.
 */

export interface Env {
}

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': '*',
};

export default {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
        const url = new URL(request.url);
        const params = url.searchParams;

        // Handle CORS Preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                status: 204,
                headers: CORS_HEADERS
            });
        }

        // Health Check
        if (url.pathname === '/health') {
            return new Response('ok', {
                status: 200,
                headers: CORS_HEADERS
            });
        }

        const path = params.get('path');

        if (path === 'afterdark') {
            return handleAfterDarkRequest(request);
        }

        return new Response('AnisFlix Worker Active. Specify ?path=...', {
            status: 200,
            headers: CORS_HEADERS
        });
    },
};

async function handleAfterDarkRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const params = url.searchParams;

    const type = params.get('type') || (url.pathname.includes('movie') ? 'movie' : 'tv');
    const endpoint = type === 'movie' ? 'movies' : 'shows';

    const targetBase = `https://afterdark.mom/api/sources/${endpoint}`;
    const targetUrl = new URL(targetBase);

    // Copy params
    params.forEach((value, key) => {
        if (key !== 'type' && key !== 'path') {
            targetUrl.searchParams.append(key, value);
        }
    });

    const fullTargetUrl = targetUrl.toString();
    console.log(`[Worker] Target URL: ${fullTargetUrl}`);

    // 1. Construct URL for CorsProxy
    // Use encodeURIComponent to avoid parsing errors
    const proxyUrl = "https://corsproxy.io/?" + encodeURIComponent(fullTargetUrl);

    // 2. CRITICAL: Hardcoded clean headers.
    // Do NOT use request.headers from Vercel.
    const cleanHeaders = {
        // Impersonate Chrome
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",

        // Lie about origin. Tell target: "I am coming from you"
        // CorsProxy forwards this.
        "Origin": "https://afterdark.mom",
        "Referer": "https://afterdark.mom/",

        // Explicitly disable cache
        "Cache-Control": "no-cache",
        "Pragma": "no-cache"
    };

    try {
        // 3. Call CorsProxy with clean headers
        const response = await fetch(proxyUrl, {
            method: "GET",
            headers: cleanHeaders
        });

        // 4. Clean response before sending back to Vercel
        const newResponse = new Response(response.body, response);
        newResponse.headers.set("Access-Control-Allow-Origin", "*");
        newResponse.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

        return newResponse;

    } catch (e: any) {
        return new Response("Worker Error: " + e.message, { status: 500, headers: CORS_HEADERS });
    }
}
