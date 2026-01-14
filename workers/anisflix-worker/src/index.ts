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

export default {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
        const url = new URL(request.url);
        const params = url.searchParams;

        // Handle CORS Preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': '*',
                }
            });
        }

        const path = params.get('path');

        if (path === 'afterdark') {
            return handleAfterDarkRequest(request);
        }

        return new Response('AnisFlix Worker Active. Specify ?path=...', {
            status: 200,
            headers: { 'Access-Control-Allow-Origin': '*' }
        });
    },
};

async function handleAfterDarkRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const params = url.searchParams;

    // Determine target path based on params (similar to Vercel logic or explicit path)
    // User said: worker calls https://afterdark.mom/api/sources/movies?...
    // We can expect params: type (movie/tv), tmdbId, title, year, season, episode...

    // Check if path includes 'movie' or 'tv' explicitly or if we rely on 'type' param
    // The user example for Vercel call was: path=afterdark&tmdbId=...&type=movie
    // The USER said "worker calls https://afterdark.mom/api/sources/movies..."
    // So let's extract 'type' from query params

    const type = params.get('type') || (url.pathname.includes('movie') ? 'movie' : 'tv');
    const endpoint = type === 'movie' ? 'movies' : 'shows';

    const targetBase = `https://afterdark.mom/api/sources/${endpoint}`;
    const targetUrl = new URL(targetBase);

    // Copy relevant params
    // We iterate over known params to ensure we construct a clean URL or just forward all?
    // User example targets included: title, tmdbId, year, originalTitle (for movies)
    // title, season, episode, tmdbId (for tv)

    params.forEach((value, key) => {
        // Exclude our own internal routing params if any
        if (key !== 'type' && key !== 'path') {
            targetUrl.searchParams.append(key, value);
        }
    });

    console.log(`[Worker] Proxying to: ${targetUrl.toString()}`);

    try {
        const response = await fetch(targetUrl.toString(), {
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1'
            }
        });

        // Create new response with CORS
        const data = await response.text();
        return new Response(data, {
            status: response.status,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'X-Debug-Target-URL': targetUrl.toString() // Debugging header
            }
        });
    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            }
        });
    }
}
