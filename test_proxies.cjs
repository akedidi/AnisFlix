const fetch = require('node-fetch'); // If not available, we use https module. Let's just use axios or native fetch.
const { HttpsProxyAgent } = require('https-proxy-agent');

async function testProxies() {
    console.log('Fetching proxy list...');
    // We fetch a list of free HTTP proxies
    const res = await fetch('https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt');
    const text = await res.text();
    const proxies = text.split('\n').filter(p => p.trim() !== '').slice(0, 40);

    console.log(`Testing ${proxies.length} proxies against Vixsrc...`);

    let successCount = 0;
    
    // We test in parallel to save time, but not all 40 at once to avoid crashing
    for (let i = 0; i < proxies.length; i += 10) {
        const batch = proxies.slice(i, i + 10);
        await Promise.all(batch.map(async (proxy) => {
            const agent = new HttpsProxyAgent(`http://${proxy.trim()}`);
            try {
                const start = Date.now();
                // Set a timeout of 10s
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000);
                
                const response = await fetch('https://vixsrc.to', {
                    agent: agent,
                    signal: controller.signal,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36'
                    }
                });
                clearTimeout(timeoutId);
                
                if (response.ok) {
                    console.log(`[SUCCESS] Proxy: ${proxy} | Status: ${response.status} | Time: ${Date.now() - start}ms`);
                    successCount++;
                } else {
                    console.log(`[BLOCKED] Proxy: ${proxy} | Status: ${response.status}`);
                }
            } catch (err) {
                console.log(`[FAILED] Proxy: ${proxy} | Error: ${err.message}`);
            }
        }));
    }
    
    console.log(`\nFinished testing. ${successCount} out of ${proxies.length} proxies succeeded.`);
}

testProxies();
