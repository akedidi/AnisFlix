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

        if (path === 'mob') {
            return handleMobRequest(request);
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

    // Determine endpoint based on type
    const type = params.get('type') || (url.pathname.includes('movie') ? 'movie' : 'tv');
    const endpoint = type === 'movie' ? 'movies' : 'shows';

    // Construct the Target URL
    // We use the URL object to ensure proper encoding of parameters
    const targetBase = `https://afterdark.mom/api/sources/${endpoint}`;
    const targetUrl = new URL(targetBase);

    // Copy params manually to ensure we control exactly what goes in
    const tmdbId = params.get('tmdbId');
    const title = params.get('title');
    const year = params.get('year');
    const originalTitle = params.get('originalTitle');
    const season = params.get('season');
    const episode = params.get('episode');

    if (tmdbId) targetUrl.searchParams.append('tmdbId', tmdbId);
    if (title) targetUrl.searchParams.append('title', title);
    if (year) targetUrl.searchParams.append('year', year);
    if (originalTitle) targetUrl.searchParams.append('originalTitle', originalTitle);

    if (type === 'tv') {
        if (season) targetUrl.searchParams.append('season', season);
        if (episode) targetUrl.searchParams.append('episode', episode);
    }

    console.log(`[Worker] Direct Target: ${targetUrl.toString()}`);

    // FALLBACK: Direct fetch failed (403), so we MUST use CorsProxy.
    const fullTargetUrl = targetUrl.toString();
    const proxyUrl = "https://corsproxy.io/?" + encodeURIComponent(fullTargetUrl);

    // --- LE SECRET EST ICI ---
    // On ne copie PAS les headers de 'request'. On en crée de nouveaux.
    // Cela supprime 'x-vercel-id', 'cf-connecting-ip', etc.
    const cleanHeaders = {
        // On se fait passer pour un navigateur standard
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        // On fait croire au site qu'on vient de chez lui (Anti-Hotlink bypass)
        "Referer": "https://afterdark.mom/",
        "Origin": "https://afterdark.mom",

        "Cache-Control": "no-cache",
        "Pragma": "no-cache",

        // IP Spoofing (Essentiel pour Vercel -> CorsProxy)
        "X-Forwarded-For": "1.1.1.1",
        "X-Real-IP": "1.1.1.1",
        "CF-Connecting-IP": "1.1.1.1"
    };

    try {
        // On appelle via CorsProxy avec les headers propres
        const response = await fetch(proxyUrl, {
            method: "GET",
            headers: cleanHeaders
        });

        // On crée une reponse propre pour Vercel
        const newResponse = new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: {
                "Content-Type": response.headers.get("Content-Type") || "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                "Cache-Control": "no-cache"
            }
        });

        return newResponse;

    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), {
            status: 500,
            headers: {
                "Content-Type": "application/json",
                ...CORS_HEADERS
            }
        });
    }
}

/**
 * Handle generic proxying for MovieBox (Mob) API
 * Supports POST/GET with custom headers and body
 */
async function handleMobRequest(request: Request): Promise<Response> {
    const urlParams = new URL(request.url).searchParams;
    const targetUrl = urlParams.get('url');
    const targetMethod = urlParams.get('method') || 'POST';

    if (!targetUrl) {
        return new Response(JSON.stringify({ error: 'Missing target url' }), { status: 400 });
    }

    let requestBody: any = null;
    let targetHeaders: any = {};

    try {
        if (request.method === 'POST') {
            const payload: any = await request.json();
            requestBody = payload.body;
            targetHeaders = payload.headers || {};
        }
    } catch (e) {
        console.warn("[Worker] Failed to parse payload for Mob request");
    }

    // Prepare clean headers with IP spoofing
    const finalHeaders: any = {
        ...targetHeaders,
        "X-Forwarded-For": "1.1.1.1",
        "X-Real-IP": "1.1.1.1",
        "CF-Connecting-IP": "1.1.1.1"
    };

    // Ensure Host header is correct if provided or let it be set by fetch
    delete finalHeaders['Host'];
    delete finalHeaders['host'];

    try {
        console.log(`[Worker] Mob Request: ${targetMethod} ${targetUrl}`);

        let response = await fetch(targetUrl, {
            method: targetMethod,
            headers: finalHeaders,
            body: requestBody ? (typeof requestBody === 'string' ? requestBody : JSON.stringify(requestBody)) : null
        });

        // If Cloudflare IP is blocked (403), try via CorsProxy as fallback
        if (response.status === 403) {
            console.log(`[Worker] Direct fetch blocked (403), trying CorsProxy fallback...`);
            const proxyRelayUrl = "https://corsproxy.io/?" + encodeURIComponent(targetUrl);

            response = await fetch(proxyRelayUrl, {
                method: targetMethod,
                headers: finalHeaders, // Keep the spoofed headers
                body: requestBody ? (typeof requestBody === 'string' ? requestBody : JSON.stringify(requestBody)) : null
            });
        }

        const data = await response.arrayBuffer();

        return new Response(data, {
            status: response.status,
            statusText: response.statusText,
            headers: {
                ...CORS_HEADERS,
                "Content-Type": response.headers.get("Content-Type") || "application/json",
                "X-Proxy-Status": response.status.toString(),
                "Cache-Control": "no-cache"
            }
        });

    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), {
            status: 500,
            headers: {
                "Content-Type": "application/json",
                ...CORS_HEADERS
            }
        });
    }
}
