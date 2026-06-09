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

        if (path === 'moviebox-cdn') {
            return handleMovieBoxCdnRequest(request);
        }

        if (path === 'animepahe') {
            return handleAnimePaheRequest(request);
        }

        // Legacy AnimePahe proxy (?url= only, no path param)
        if (!path && params.get('url')) {
            return handleAnimePaheRequest(request);
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
        const outHeaders: Record<string, string> = {
            ...CORS_HEADERS,
            "Content-Type": response.headers.get("Content-Type") || "application/json",
            "X-Proxy-Status": response.status.toString(),
            "Cache-Control": "no-cache",
        };
        const xUser = response.headers.get('x-user');
        if (xUser) outHeaders['x-user'] = xUser;

        return new Response(data, {
            status: response.status,
            statusText: response.statusText,
            headers: outHeaders,
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

function isAllowedAnimePaheUrl(targetUrl: string): boolean {
    try {
        const host = new URL(targetUrl).hostname.toLowerCase();
        return host === 'animepahe.pw' || host.endsWith('.animepahe.pw')
            || host === 'animepahe.com' || host.endsWith('.animepahe.com')
            || host === 'kwik.cx' || host.endsWith('.kwik.cx');
    } catch {
        return false;
    }
}

/**
 * Proxy animepahe.pw / kwik.cx with browser headers + cookie priming (replaces dead phisher worker).
 */
async function handleAnimePaheRequest(request: Request): Promise<Response> {
    const params = new URL(request.url).searchParams;
    const targetUrl = params.get('url');

    if (!targetUrl || !isAllowedAnimePaheUrl(targetUrl)) {
        return new Response(JSON.stringify({ error: 'Invalid or missing animepahe url' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
        });
    }

    const browserHeaders: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9,fr;q=0.8',
        'Referer': 'https://animepahe.pw/',
        'Origin': 'https://animepahe.pw',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
    };

    try {
        let cookieHeader = '';

        // Prime DDoS-Guard session cookie from homepage
        const prime = await fetch('https://animepahe.pw/', {
            method: 'GET',
            headers: browserHeaders,
            redirect: 'follow',
        });

        const setCookies: string[] = [];
        if (typeof prime.headers.getSetCookie === 'function') {
            setCookies.push(...prime.headers.getSetCookie());
        } else {
            const single = prime.headers.get('set-cookie');
            if (single) setCookies.push(single);
        }
        if (setCookies.length > 0) {
            cookieHeader = setCookies.map((c) => c.split(';')[0]).join('; ');
        }

        const upstreamHeaders: Record<string, string> = {
            ...browserHeaders,
            ...(cookieHeader ? { Cookie: cookieHeader } : { Cookie: '__ddg2_=1234567890' }),
        };

        let response = await fetch(targetUrl, {
            method: 'GET',
            headers: upstreamHeaders,
            redirect: 'follow',
        });

        const contentType = response.headers.get('Content-Type') || '';
        const isChallenge = response.status === 403
            || contentType.includes('text/html')
            && !(targetUrl.includes('/api?') || targetUrl.includes('kwik.cx'));

        if (isChallenge && cookieHeader) {
            console.log(`[Worker] AnimePahe retry after challenge (${response.status})`);
            response = await fetch(targetUrl, {
                method: 'GET',
                headers: upstreamHeaders,
                redirect: 'follow',
            });
        }

        const outHeaders = new Headers(CORS_HEADERS);
        const ct = response.headers.get('Content-Type');
        if (ct) outHeaders.set('Content-Type', ct);
        outHeaders.set('Cache-Control', 'no-cache');
        outHeaders.set('X-Anisflix-Proxy', 'animepahe');

        return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: outHeaders,
        });
    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), {
            status: 502,
            headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
        });
    }
}

function isAllowedMovieBoxCdnUrl(targetUrl: string): boolean {
    try {
        const host = new URL(targetUrl).hostname.toLowerCase();
        return host.endsWith('hakunaymatata.com');
    } catch {
        return false;
    }
}

function buildMovieBoxCdnWorkerUrl(
    workerOrigin: string,
    absoluteUrl: string,
    referer: string,
    cookie: string,
    userAgent: string
): string {
    const qs = new URLSearchParams({
        path: 'moviebox-cdn',
        url: absoluteUrl,
        referer,
    });
    if (cookie) qs.set('cookie', cookie);
    if (userAgent) qs.set('ua', userAgent);
    return `${workerOrigin}/?${qs.toString()}`;
}

/**
 * Stream MovieBox CDN (MP4/HLS) with Referer + CloudFront signed cookies.
 */
async function handleMovieBoxCdnRequest(request: Request): Promise<Response> {
    const params = new URL(request.url).searchParams;
    const targetUrl = params.get('url');
    const referer = params.get('referer') || 'https://api3.aoneroom.com/';
    const cookie = params.get('cookie') || '';
    const userAgent = params.get('ua')
        || 'com.community.mbox.in/50020042 (Linux; U; Android 16; en_IN; MovieBox; Build/BP22.250325.006; Cronet/133.0.6876.3)';

    if (!targetUrl || !isAllowedMovieBoxCdnUrl(targetUrl)) {
        return new Response(JSON.stringify({ error: 'Invalid or missing CDN url' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
        });
    }

    let origin = 'https://api3.aoneroom.com';
    try {
        origin = new URL(referer).origin;
    } catch {
        // keep default
    }

    const upstreamHeaders: Record<string, string> = {
        'User-Agent': userAgent,
        'Referer': referer,
        'Origin': origin,
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.5',
    };
    if (cookie) {
        upstreamHeaders['Cookie'] = cookie;
    }

    const range = request.headers.get('Range');
    if (range) {
        upstreamHeaders['Range'] = range;
    }

    try {
        const response = await fetch(targetUrl, {
            method: 'GET',
            headers: upstreamHeaders,
        });

        const outHeaders = new Headers(CORS_HEADERS);
        const forward = ['content-type', 'content-length', 'content-range', 'accept-ranges', 'cache-control', 'etag', 'last-modified'];
        for (const h of forward) {
            const v = response.headers.get(h);
            if (v) outHeaders.set(h, v);
        }
        outHeaders.set('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');

        const contentType = response.headers.get('content-type') || '';
        const isPlaylist = targetUrl.includes('.m3u8')
            || contentType.includes('mpegurl')
            || contentType.includes('m3u8');

        if (isPlaylist && response.ok) {
            const text = await response.text();
            if (text.includes('#EXTM3U')) {
                const workerOrigin = new URL(request.url).origin;
                const basePath = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);
                const rewritten = text.split('\n').map((line) => {
                    const trimmed = line.trim();
                    if (!trimmed || trimmed.startsWith('#')) return line;
                    try {
                        const absolute = new URL(trimmed, basePath).href;
                        return buildMovieBoxCdnWorkerUrl(workerOrigin, absolute, referer, cookie, userAgent);
                    } catch {
                        return line;
                    }
                }).join('\n');

                outHeaders.set('Content-Type', 'application/vnd.apple.mpegurl');
                return new Response(rewritten, {
                    status: response.status,
                    statusText: response.statusText,
                    headers: outHeaders,
                });
            }
        }

        return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: outHeaders,
        });
    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), {
            status: 502,
            headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
        });
    }
}
