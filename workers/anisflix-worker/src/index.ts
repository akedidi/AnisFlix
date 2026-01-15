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
        "Origin": "https://afterdark.mom"
    };

    try {
        // On appelle DIRECTEMENT le site avec les headers propres
        // Note: Si Cloudflare bloque l'IP du worker, on devra remettre corsproxy ici.
        const response = await fetch(targetUrl.toString(), {
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
