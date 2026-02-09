import axios from 'axios';

const serverUrl = 'https://test.autoembed.cc/api/server?id=1242898&sr=10';
const headers = {
    'Referer': 'https://player.vidsrc.co/',
    'Origin': 'https://player.vidsrc.co/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

const proxies = [
    // Standard CORS proxies
    { name: 'CorsProxy.io', url: `https://corsproxy.io/?${serverUrl}` },
    { name: 'AllOrigins', url: `https://api.allorigins.win/raw?url=${encodeURIComponent(serverUrl)}` },
    { name: 'ThingProxy', url: `https://thingproxy.freeboard.io/fetch/${serverUrl}` },
    { name: 'CodeTabs', url: `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(serverUrl)}` },
    { name: 'CorsAnywhere', url: `https://cors-anywhere.herokuapp.com/${serverUrl}` },
    { name: 'JoshProxy', url: `https://cors-get-proxy.sirjosh.workers.dev/?url=${encodeURIComponent(serverUrl)}` },

    // Additional public proxies often used for this
    { name: 'Proxy1', url: `https://cors.bridged.cc/${serverUrl}` },
    { name: 'Proxy2', url: `https://api.xcors.net/?url=${encodeURIComponent(serverUrl)}` },
    { name: 'Proxy3', url: `https://api.cors.lol/?url=${encodeURIComponent(serverUrl)}` },
    { name: 'Proxy4', url: `https://cors-proxy.htmldriven.com/?url=${encodeURIComponent(serverUrl)}` },
    { name: 'Proxy5', url: `https://api.codetabs.com/v1/proxy?quest=${serverUrl}` }, // duplicate check
    { name: 'Proxy6', url: `https://cors.sh/${serverUrl}` },
    { name: 'Proxy7', url: `https://local-cors-proxy.herokuapp.com/${serverUrl}` },
    { name: 'Proxy8', url: `https://cors-proxy.oh-an.info/${serverUrl}` },
    { name: 'Proxy9', url: `https://cors-proxy.tk/?url=${encodeURIComponent(serverUrl)}` },

    // Some common ones that might be dead but worth trying
    { name: 'Yacdn', url: `https://yacdn.org/proxy/${serverUrl}` },
    { name: 'Hiproxy', url: `https://hiproxy.org/${serverUrl}` },
];

async function testProxies() {
    console.log(`Testing ${proxies.length} proxies for Badlands (TMDB 1242898)...`);

    let successCount = 0;

    for (const proxy of proxies) {
        process.stdout.write(`Testing ${proxy.name}... `);
        try {
            const start = Date.now();
            const response = await axios.get(proxy.url, { headers, timeout: 5000 });
            const duration = Date.now() - start;

            if (response.status === 200) {
                // Check if it's the actual JSON or a Cloudflare HTML page
                const data = response.data;
                const isHtml = typeof data === 'string' && data.trim().startsWith('<');
                const isJson = typeof data === 'object' || (typeof data === 'string' && data.includes('"data"'));

                if (isJson && !isHtml) {
                    console.log(`✅ SUCCESS (${duration}ms)`);
                    successCount++;
                } else if (isHtml) {
                    if (data.includes('Challenge') || data.includes('blocked')) {
                        console.log(`❌ CLOUDFLARE BLOCKED (${duration}ms)`);
                    } else {
                        console.log(`⚠️ HTML RESPONSE (Unknown) (${duration}ms)`);
                    }
                } else {
                    console.log(`❓ UNKNOWN RESPONSE TYPE (${duration}ms)`);
                }
            } else {
                console.log(`❌ STATUS ${response.status} (${duration}ms)`);
            }
        } catch (err) {
            let msg = err.message;
            if (err.response) {
                msg = `Status ${err.response.status}`;
            }
            console.log(`❌ FAILED: ${msg}`);
        }
    }

    console.log(`\nTest finished. Success: ${successCount}/${proxies.length}`);
}

testProxies();
