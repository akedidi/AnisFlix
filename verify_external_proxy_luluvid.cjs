const axios = require('axios');

const targetUrl = 'https://luluvid.com/e/7zvwze4duita';
// Testing multiple common CORS proxies
const proxies = [
    'https://corsproxy.io/?',
    'https://api.allorigins.win/raw?url=',
    'https://cors-anywhere.herokuapp.com/' // Often requires demo opt-in, might fail
];

async function testProxy(proxyBase) {
    const proxiedPageUrl = `${proxyBase}${encodeURIComponent(targetUrl)}`;
    console.log(`\n🚀 Testing Proxy: ${proxyBase}`);
    console.log(`   Fetching Page: ${proxiedPageUrl.substring(0, 60)}...`);

    try {
        // 1. Fetch Page
        const pageResp = await axios.get(proxiedPageUrl, { timeout: 10000 });
        const html = pageResp.data;

        // 2. Extract M3U8
        let match = html.match(/sources:\s*\[\{file:"([^"]+)"/);
        if (!match) match = html.match(/file:"([^"]+)"/);

        if (match && match[1]) {
            const m3u8Url = match[1];
            console.log(`   ✅ Extracted M3U8: ${m3u8Url.substring(0, 60)}...`);

            // 3. Try to Stream via SAME proxy (to maintain IP binding?)
            const proxiedStreamUrl = `${proxyBase}${encodeURIComponent(m3u8Url)}`;
            console.log(`   ▶️  Fetching Stream: ${proxiedStreamUrl.substring(0, 60)}...`);

            try {
                const streamResp = await axios.get(proxiedStreamUrl, {
                    headers: { 'Referer': 'https://luluvid.com/' }, // Some proxies strip this
                    timeout: 10000
                });

                if (streamResp.status === 200) {
                    console.log(`   ✅ Stream Valid! (200 OK)`);
                    console.log(`   📄 Content Start: ${streamResp.data.substring(0, 50)}...`);

                    // 4. Test Segment Fetching
                    const lines = streamResp.data.split('\n');
                    let segmentUrl = lines.find(l => l.includes('.ts') || l.includes('http'));

                    if (segmentUrl) {
                        // Resolve relative URL if needed (Luluvid usually absolute but verify)
                        if (!segmentUrl.startsWith('http')) {
                            // Simple resolve logic (assuming m3u8Url base)
                            const basePath = m3u8Url.substring(0, m3u8Url.lastIndexOf('/') + 1);
                            segmentUrl = basePath + segmentUrl;
                        }

                        const proxiedSegment = `${proxyBase}${encodeURIComponent(segmentUrl)}`;
                        console.log(`   🎬 Test Segment: ${proxiedSegment.substring(0, 60)}...`);
                        try {
                            const segResp = await axios.get(proxiedSegment, {
                                headers: { 'Referer': 'https://luluvid.com/' },
                                responseType: 'stream',
                                timeout: 10000
                            });
                            console.log(`   ✅ Segment Status: ${segResp.status}`);
                            // Check content length or type if possible
                            console.log(`   📦 Headers: ${JSON.stringify(segResp.headers['content-type'])}`);
                        } catch (segErr) {
                            console.log(`   ❌ Segment Failed: ${segErr.message}`);
                        }
                    } else {
                        console.log('   ⚠️ No segment found in M3U8 to test.');
                    }

                    return true;
                } else {
                    console.log(`   ❌ Stream Failed: ${streamResp.status}`);
                }
            } catch (err) {
                console.log(`   ❌ Stream Error: ${err.message}`);
                if (err.response) console.log(`      Status: ${err.response.status}`);
            }

        } else {
            console.log('   ❌ Extraction Failed (No token found or blocked)');
        }

    } catch (e) {
        console.log(`   ❌ Page Fetch Error: ${e.message}`);
    }
    return false;
}

async function run() {
    for (const p of proxies) {
        await testProxy(p);
    }
}

run();
