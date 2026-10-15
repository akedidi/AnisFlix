/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc` or `wrangler.toml`.
 */

import { connect } from 'cloudflare:sockets';

export interface Env {
}

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': '*',
};

const MOVIEBOX_API_HOSTS = new Set([
    'apig.inmoviebox.com',
    'api6.aoneroom.com',
    'api5.aoneroom.com',
    'api4.aoneroom.com',
    'api4sg.aoneroom.com',
    'api3.aoneroom.com',
]);

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
function findBytes(haystack: Uint8Array, needle: number[], start = 0): number {
    outer: for (let i = start; i <= haystack.length - needle.length; i++) {
        for (let j = 0; j < needle.length; j++) {
            if (haystack[i + j] !== needle[j]) continue outer;
        }
        return i;
    }
    return -1;
}

function decodeChunkedBody(input: Uint8Array): Uint8Array {
    const chunks: Uint8Array[] = [];
    let totalLength = 0;
    let offset = 0;
    const decoder = new TextDecoder();

    while (offset < input.length) {
        const lineEnd = findBytes(input, [13, 10], offset);
        if (lineEnd < 0) break;
        const sizeText = decoder.decode(input.slice(offset, lineEnd)).split(';')[0].trim();
        const size = Number.parseInt(sizeText, 16);
        if (!Number.isFinite(size) || size <= 0) break;

        const chunkStart = lineEnd + 2;
        const chunkEnd = chunkStart + size;
        if (chunkEnd > input.length) break;
        const chunk = input.slice(chunkStart, chunkEnd);
        chunks.push(chunk);
        totalLength += chunk.length;
        offset = chunkEnd + 2;
    }

    const output = new Uint8Array(totalLength);
    let writeOffset = 0;
    for (const chunk of chunks) {
        output.set(chunk, writeOffset);
        writeOffset += chunk.length;
    }
    return output;
}

function isAllowedMovieBoxSocketHost(hostname: string): boolean {
    const host = hostname.toLowerCase();
    if (MOVIEBOX_API_HOSTS.has(host)) return true;
    if (host.endsWith('hakunaymatata.com')) return true;
    if (host === 'hm-cinema.me') return true;
    return false;
}

function isBlockedMovieBoxUpstreamStatus(status: number): boolean {
    // 1010 is Cloudflare's browser-signature ban (surfaced as 403).
    // 427 is MovieBox CDN's custom block for CF HTTP egress.
    return status === 403 || status === 427 || status === 440;
}

/**
 * MovieBox rejects the normal Workers HTTP egress with code 440. TCP socket
 * egress uses a separate Cloudflare address pool, so retry the same signed
 * request over a small HTTP/1.1 TLS client. This is deliberately restricted to
 * the known MovieBox API hosts and is never used for arbitrary proxy targets.
 */
async function fetchMovieBoxViaSocket(
    targetUrl: string,
    method: string,
    headers: Record<string, string>,
    body: any,
): Promise<Response> {
    const url = new URL(targetUrl);
    if (url.protocol !== 'https:' || !MOVIEBOX_API_HOSTS.has(url.hostname.toLowerCase())) {
        throw new Error('Socket fallback is restricted to MovieBox API hosts');
    }

    const encodedBody = body
        ? new TextEncoder().encode(typeof body === 'string' ? body : JSON.stringify(body))
        : new Uint8Array();
    const requestHeaders = new Headers(headers);
    requestHeaders.set('Host', url.host);
    requestHeaders.set('Connection', 'close');
    requestHeaders.set('Accept-Encoding', 'identity');
    if (encodedBody.length > 0) requestHeaders.set('Content-Length', String(encodedBody.length));
    else requestHeaders.delete('Content-Length');

    let head = `${method.toUpperCase()} ${url.pathname}${url.search} HTTP/1.1\r\n`;
    requestHeaders.forEach((value, key) => {
        head += `${key}: ${value}\r\n`;
    });
    head += '\r\n';

    const encodedHead = new TextEncoder().encode(head);
    const requestBytes = new Uint8Array(encodedHead.length + encodedBody.length);
    requestBytes.set(encodedHead);
    requestBytes.set(encodedBody, encodedHead.length);

    const socket = connect(
        { hostname: url.hostname, port: 443 },
        { secureTransport: 'on', allowHalfOpen: true },
    );
    await socket.opened;
    const writer = socket.writable.getWriter();
    await writer.write(requestBytes);
    writer.releaseLock();

    const reader = socket.readable.getReader();
    const responseChunks: Uint8Array[] = [];
    let responseLength = 0;
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        responseChunks.push(value);
        responseLength += value.length;
    }
    await socket.close();

    const raw = new Uint8Array(responseLength);
    let rawOffset = 0;
    for (const chunk of responseChunks) {
        raw.set(chunk, rawOffset);
        rawOffset += chunk.length;
    }

    const headerEnd = findBytes(raw, [13, 10, 13, 10]);
    if (headerEnd < 0) throw new Error('Invalid HTTP response from MovieBox');

    const headerText = new TextDecoder().decode(raw.slice(0, headerEnd));
    const headerLines = headerText.split('\r\n');
    const statusMatch = headerLines.shift()?.match(/^HTTP\/\d(?:\.\d)?\s+(\d{3})\s*(.*)$/i);
    if (!statusMatch) throw new Error('Invalid MovieBox HTTP status line');

    const responseHeaders = new Headers();
    for (const line of headerLines) {
        const separator = line.indexOf(':');
        if (separator <= 0) continue;
        responseHeaders.append(line.slice(0, separator).trim(), line.slice(separator + 1).trim());
    }

    let responseBody = raw.slice(headerEnd + 4);
    if (responseHeaders.get('transfer-encoding')?.toLowerCase().includes('chunked')) {
        responseBody = decodeChunkedBody(responseBody);
        responseHeaders.delete('transfer-encoding');
    }
    responseHeaders.delete('content-length');
    responseHeaders.delete('connection');

    return new Response(responseBody, {
        status: Number(statusMatch[1]),
        statusText: statusMatch[2],
        headers: responseHeaders,
    });
}

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

        // MovieBox blocks normal Cloudflare HTTP egress with 403/440. Retry
        // through Workers TCP socket egress, which uses a separate IP pool.
        if (isBlockedMovieBoxUpstreamStatus(response.status)) {
            console.log(`[Worker] Direct fetch blocked (${response.status}), trying socket fallback...`);
            response = await fetchMovieBoxViaSocket(targetUrl, targetMethod, finalHeaders, requestBody);
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
        const parsed = new URL(targetUrl);
        const host = parsed.hostname.toLowerCase();
        if (host.endsWith('hakunaymatata.com')) return true;
        if (host !== 'hm-cinema.me') return false;
        return [
            '/api/mp4/stream/',
            '/api/dash/manifest/',
            '/api/dash/segment/',
        ].some((prefix) => parsed.pathname.startsWith(prefix));
    } catch {
        return false;
    }
}

/**
 * Stream MovieBox CDN over Workers TCP sockets when HTTP egress is blocked.
 * Unlike the API socket helper, this streams the body so Range video requests
 * do not buffer multi‑GB MP4s into Worker memory.
 */
async function fetchMovieBoxCdnViaSocket(
    targetUrl: string,
    headers: Record<string, string>,
): Promise<Response> {
    const url = new URL(targetUrl);
    if (url.protocol !== 'https:' || !isAllowedMovieBoxSocketHost(url.hostname)) {
        throw new Error('Socket CDN fallback is restricted to MovieBox CDN hosts');
    }

    const requestHeaders = new Headers(headers);
    requestHeaders.set('Host', url.host);
    requestHeaders.set('Connection', 'close');
    requestHeaders.set('Accept-Encoding', 'identity');

    let head = `GET ${url.pathname}${url.search} HTTP/1.1\r\n`;
    requestHeaders.forEach((value, key) => {
        head += `${key}: ${value}\r\n`;
    });
    head += '\r\n';

    const socket = connect(
        { hostname: url.hostname, port: 443 },
        { secureTransport: 'on', allowHalfOpen: true },
    );
    await socket.opened;
    const writer = socket.writable.getWriter();
    await writer.write(new TextEncoder().encode(head));
    writer.releaseLock();

    const reader = socket.readable.getReader();
    let buffer = new Uint8Array(0);

    const append = (chunk: Uint8Array) => {
        const next = new Uint8Array(buffer.length + chunk.length);
        next.set(buffer);
        next.set(chunk, buffer.length);
        buffer = next;
    };

    while (true) {
        const headerEnd = findBytes(buffer, [13, 10, 13, 10]);
        if (headerEnd >= 0) {
            const headerText = new TextDecoder().decode(buffer.slice(0, headerEnd));
            const headerLines = headerText.split('\r\n');
            const statusMatch = headerLines.shift()?.match(/^HTTP\/\d(?:\.\d)?\s+(\d{3})\s*(.*)$/i);
            if (!statusMatch) throw new Error('Invalid MovieBox CDN HTTP status line');

            const responseHeaders = new Headers();
            for (const line of headerLines) {
                const separator = line.indexOf(':');
                if (separator <= 0) continue;
                responseHeaders.append(line.slice(0, separator).trim(), line.slice(separator + 1).trim());
            }

            // Transfer-Encoding: chunked cannot be streamed raw into a Fetch body.
            // Buffer small chunked payloads (manifests / errors); reject huge ones.
            if (responseHeaders.get('transfer-encoding')?.toLowerCase().includes('chunked')) {
                let rawBody = buffer.slice(headerEnd + 4);
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    const next = new Uint8Array(rawBody.length + value.length);
                    next.set(rawBody);
                    next.set(value, rawBody.length);
                    rawBody = next;
                    if (rawBody.length > 8 * 1024 * 1024) {
                        await socket.close();
                        throw new Error('Chunked MovieBox CDN response too large for socket buffer');
                    }
                }
                await socket.close();
                const decoded = decodeChunkedBody(rawBody);
                responseHeaders.delete('transfer-encoding');
                responseHeaders.delete('content-length');
                responseHeaders.delete('connection');
                return new Response(decoded, {
                    status: Number(statusMatch[1]),
                    statusText: statusMatch[2],
                    headers: responseHeaders,
                });
            }

            const pending = buffer.slice(headerEnd + 4);
            responseHeaders.delete('connection');

            const stream = new ReadableStream<Uint8Array>({
                start(controller) {
                    if (pending.length) controller.enqueue(pending);
                    (async () => {
                        try {
                            while (true) {
                                const { done, value } = await reader.read();
                                if (done) break;
                                controller.enqueue(value);
                            }
                            controller.close();
                        } catch (error) {
                            controller.error(error);
                        } finally {
                            try {
                                await socket.close();
                            } catch {
                                // ignore close races
                            }
                        }
                    })();
                },
                cancel() {
                    reader.cancel().catch(() => undefined);
                    socket.close().catch(() => undefined);
                },
            });

            return new Response(stream, {
                status: Number(statusMatch[1]),
                statusText: statusMatch[2],
                headers: responseHeaders,
            });
        }

        const { done, value } = await reader.read();
        if (done) throw new Error('Invalid HTTP response from MovieBox CDN');
        append(value);
        if (buffer.length > 256 * 1024) {
            await socket.close();
            throw new Error('MovieBox CDN headers too large');
        }
    }
}

function buildHmDashSegmentWorkerUrl(workerOrigin: string, assetPath: string): string {
    // Keep DASH $RepresentationID$ / $Number%05d$ templates visible to the
    // player. Encoding them as a normal query value prevents substitution.
    return `${workerOrigin}/?path=moviebox-cdn&hmPath=${assetPath}`;
}

function buildMovieBoxCdnWorkerUrl(
    workerOrigin: string,
    absoluteUrl: string,
    referer: string,
    cookie: string,
    userAgent: string,
    bare = false,
): string {
    const qs = new URLSearchParams({
        path: 'moviebox-cdn',
        url: absoluteUrl,
    });
    if (bare) {
        qs.set('bare', '1');
    } else {
        qs.set('referer', referer);
        if (cookie) qs.set('cookie', cookie);
        if (userAgent) qs.set('ua', userAgent);
    }
    return `${workerOrigin}/?${qs.toString()}`;
}

function buildMovieBoxDashTemplateWorkerUrl(
    workerOrigin: string,
    absoluteUrl: string,
    referer: string,
    cookie: string,
    userAgent: string,
    bare = false,
): string {
    const dashTokens: string[] = [];
    const protectedUrl = absoluteUrl.replace(/\$(?:RepresentationID|Bandwidth|Time|Number(?:%0\d+d)?)\$/g, (token) => {
        const placeholder = `__ANISFLIX_DASH_${dashTokens.length}__`;
        dashTokens.push(token);
        return placeholder;
    });

    let encodedUrl = encodeURIComponent(protectedUrl);
    dashTokens.forEach((token, index) => {
        encodedUrl = encodedUrl.replace(`__ANISFLIX_DASH_${index}__`, token);
    });

    let result = `${workerOrigin}/?path=moviebox-cdn&url=${encodedUrl}`;
    if (bare) {
        result += '&bare=1';
    } else {
        result += `&referer=${encodeURIComponent(referer)}`;
        if (cookie) result += `&cookie=${encodeURIComponent(cookie)}`;
        if (userAgent) result += `&ua=${encodeURIComponent(userAgent)}`;
    }
    return result;
}

/**
 * Stream MovieBox CDN (MP4/HLS) with Referer + CloudFront signed cookies.
 * Detector-fallback links (`bare=1`) reject Cookie/Referer/UA — fetch bare.
 */
async function handleMovieBoxCdnRequest(request: Request): Promise<Response> {
    const params = new URL(request.url).searchParams;
    const hmPath = params.get('hmPath');
    const targetUrl = hmPath?.startsWith('/api/dash/segment/')
        ? `https://hm-cinema.me${hmPath}`
        : params.get('url');
    const bare = params.get('bare') === '1';
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

    const upstreamHeaders: Record<string, string> = bare
        ? { 'Accept': '*/*' }
        : {
            'User-Agent': userAgent,
            'Referer': referer,
            'Origin': origin,
            'Accept': '*/*',
            'Accept-Language': 'en-US,en;q=0.5',
        };
    if (!bare && cookie) {
        upstreamHeaders['Cookie'] = cookie;
    }

    const range = request.headers.get('Range');
    if (range) {
        upstreamHeaders['Range'] = range;
    }

    try {
        let response = await fetch(targetUrl, {
            method: 'GET',
            headers: upstreamHeaders,
        });

        // CDN blocks Cloudflare HTTP egress (403/1010, 427). TCP sockets use a
        // different address pool — same trick as the MovieBox API `mob` path.
        if (isBlockedMovieBoxUpstreamStatus(response.status)) {
            console.log(`[Worker] MovieBox CDN blocked (${response.status}), trying socket fallback...`);
            response = await fetchMovieBoxCdnViaSocket(targetUrl, upstreamHeaders);
        }

        const outHeaders = new Headers(CORS_HEADERS);
        const forward = ['content-type', 'content-length', 'content-range', 'accept-ranges', 'cache-control', 'etag', 'last-modified'];
        for (const h of forward) {
            const v = response.headers.get(h);
            if (v) outHeaders.set(h, v);
        }
        outHeaders.set('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');

        const contentType = response.headers.get('content-type') || '';
        const isMpd = targetUrl.includes('.mpd') || contentType.includes('dash+xml');
        const isPlaylist = targetUrl.includes('.m3u8')
            || contentType.includes('mpegurl')
            || contentType.includes('m3u8');

        if (isMpd && response.ok) {
            const text = await response.text();
            const workerOrigin = new URL(request.url).origin;
            let rewritten = text.replace(
                /(["'])(\/api\/dash\/segment\/[^"']+)\1/g,
                (_match, quote, assetPath) => {
                    const proxyUrl = buildHmDashSegmentWorkerUrl(workerOrigin, assetPath)
                        .replace(/&/g, '&amp;');
                    return `${quote}${proxyUrl}${quote}`;
                },
            );
            rewritten = rewritten.replace(
                /\b(initialization|media|sourceURL)=(["'])([^"']+)\2/g,
                (match, attribute, quote, assetValue) => {
                    if (assetValue.includes('path=moviebox-cdn')) return match;
                    try {
                        const decodedAsset = assetValue.replace(/&amp;/g, '&');
                        const absolute = new URL(decodedAsset, targetUrl).href;
                        if (!isAllowedMovieBoxCdnUrl(absolute)) return match;
                        const proxyUrl = buildMovieBoxDashTemplateWorkerUrl(
                            workerOrigin,
                            absolute,
                            referer,
                            cookie,
                            userAgent,
                            bare,
                        ).replace(/&/g, '&amp;');
                        return `${attribute}=${quote}${proxyUrl}${quote}`;
                    } catch {
                        return match;
                    }
                },
            );
            outHeaders.set('Content-Type', 'application/dash+xml');
            outHeaders.delete('Content-Length');
            return new Response(rewritten, {
                status: response.status,
                statusText: response.statusText,
                headers: outHeaders,
            });
        }

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
                        return buildMovieBoxCdnWorkerUrl(workerOrigin, absolute, referer, cookie, userAgent, bare);
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
