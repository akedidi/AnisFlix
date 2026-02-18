
import fs from 'fs';

const id = '4m0a4it8eu6q';
const headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': `https://bysebuho.com/e/${id}`,
    'Origin': 'https://bysebuho.com',
    'Accept': 'application/json, text/plain, */*',
};

async function probe() {
    // 1. Get full video info
    console.log('=== Full /api/videos/{id} response ===\n');
    const resp = await fetch(`https://bysebuho.com/api/videos/${id}`, { headers });
    const videoInfo = await resp.json();
    console.log(JSON.stringify(videoInfo, null, 2));

    // 2. Try stream with cookies (simulate browser session)
    // First get cookies from the embed page
    console.log('\n=== Getting cookies from embed page ===\n');
    const embedResp = await fetch(`https://bysebuho.com/e/${id}`, { headers });
    const cookies = embedResp.headers.get('set-cookie');
    console.log('Cookies:', cookies);

    // 3. Try stream endpoint with cookies
    const streamHeaders = { ...headers };
    if (cookies) {
        streamHeaders['Cookie'] = cookies;
    }

    const streamEndpoints = [
        `https://bysebuho.com/api/videos/stream/${id}`,
        `https://bysebuho.com/api/videos/${id}/stream`,
        `https://bysebuho.com/api/videos/${id}/hls`,
        `https://bysebuho.com/api/videos/${id}/sources`,
        `https://bysebuho.com/api/videos/${id}/player`,
    ];

    console.log('\n=== Testing stream endpoints with cookies ===\n');
    for (const url of streamEndpoints) {
        try {
            const r = await fetch(url, { headers: streamHeaders });
            const text = await r.text();
            console.log(`[${r.status}] ${url}`);
            if (r.ok || r.status !== 404) {
                console.log(`  Response: ${text.substring(0, 300)}`);
            }
        } catch (e) {
            console.log(`[ERR] ${url}: ${e.message}`);
        }
    }

    // 4. Look at what the video bundle does after getting video info
    // Search for patterns like "stream_url", "hls_url", "sources" in the response
    console.log('\n=== Checking video info for stream-related fields ===\n');
    const keys = Object.keys(videoInfo);
    console.log('Available fields:', keys);

    // Check if there's a stream_url or similar
    for (const key of keys) {
        if (key.includes('stream') || key.includes('hls') || key.includes('url') || key.includes('source')) {
            console.log(`${key}:`, videoInfo[key]);
        }
    }
}

probe().catch(console.error);
