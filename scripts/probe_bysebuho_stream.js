
import fs from 'fs';

const id = '4m0a4it8eu6q';
const headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': `https://bysebuho.com/e/${id}`,
    'Origin': 'https://bysebuho.com',
    'Accept': 'application/json, text/plain, */*',
    'X-Requested-With': 'XMLHttpRequest',
};

async function probe() {
    // 1. Test the /api/videos/stream/ endpoint
    const streamUrls = [
        `https://bysebuho.com/api/videos/stream/${id}`,
        `https://bysebuho.com/api/videos/stream?code=${id}`,
        `https://bysebuho.com/api/videos/stream?id=${id}`,
        `https://bysebuho.com/api/videos/${id}`,
        `https://bysebuho.com/api/videos/${id}/stream`,
        `https://bysebuho.com/api/videos?code=${id}`,
    ];

    console.log('=== Testing /api/videos/stream/ endpoints ===\n');
    for (const url of streamUrls) {
        try {
            const resp = await fetch(url, { headers });
            console.log(`[${resp.status}] ${url}`);
            if (resp.ok) {
                const text = await resp.text();
                console.log(`  ✅ Response (${text.length} bytes): ${text.substring(0, 200)}`);
                if (text.includes('m3u8') || text.includes('hls')) {
                    console.log(`  🎯 CONTAINS STREAM DATA!`);
                    fs.writeFileSync(`bysebuho_stream_${Date.now()}.json`, text);
                }
            }
        } catch (e) {
            console.log(`[ERR] ${url}: ${e.message}`);
        }
    }

    // 2. Extract the full injected HTML from the video bundle to see the full JWPlayer config
    console.log('\n=== Extracting full injected HTML from video bundle ===\n');
    const bundle = fs.readFileSync('bysebuho_video_bundle.js', 'utf-8');

    // Find the mi= variable which contains the HTML template
    const miIdx = bundle.indexOf("mi='");
    if (miIdx < 0) {
        // Try other patterns
        const miIdx2 = bundle.indexOf('mi=`');
        console.log('mi= not found with single quote, trying backtick:', miIdx2 >= 0);
    }

    // Find the full string starting from bafsd context
    const bafsdIdx = bundle.indexOf('bafsd');
    if (bafsdIdx >= 0) {
        // Go back to find the start of the string
        const contextStart = Math.max(0, bafsdIdx - 500);
        const contextEnd = Math.min(bundle.length, bafsdIdx + 3000);
        const context = bundle.substring(contextStart, contextEnd);
        console.log('Full context around bafsd (3000 chars):');
        console.log(context);
        fs.writeFileSync('bysebuho_bafsd_context.txt', context);
        console.log('\n💾 Saved to bysebuho_bafsd_context.txt');
    }
}

probe();
