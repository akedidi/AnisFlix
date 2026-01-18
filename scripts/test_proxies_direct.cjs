
const axios = require('axios');

const targetUrl = 'https://afterdark.mom/api/sources/movies?tmdbId=1242898&title=Predator%3A+Badlands&year=2025&originalTitle=Predator%3A+Badlands';
const encodedUrl = encodeURIComponent(targetUrl);

const proxies = [
    {
        name: 'Direct (Reference)',
        url: targetUrl,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://afterdark.mom/',
            'Origin': 'https://afterdark.mom'
        }
    },
    {
        name: 'CorsProxy.io',
        url: `https://corsproxy.io/?${targetUrl}`,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Origin': 'https://afterdark.mom',
            'Referer': 'https://afterdark.mom/'
        }
    },
    {
        name: 'Cors.eu.org',
        url: `https://cors.eu.org/${targetUrl}`,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Origin': 'https://afterdark.mom',
            'Referer': 'https://afterdark.mom/'
        }
    },
    {
        name: 'CodeTabs',
        url: `https://api.codetabs.com/v1/proxy?quest=${encodedUrl}`,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Origin': 'https://afterdark.mom',
            'Referer': 'https://afterdark.mom/'
        }
    },
    {
        name: 'AllOrigins',
        url: `https://api.allorigins.win/raw?url=${encodedUrl}`,
        headers: {}
    }
];

async function testProxies() {
    console.log("🚀 Testing External Proxies for AfterDark...");

    for (const proxy of proxies) {
        console.log(`\n---------------------------------------------------`);
        console.log(`📡 Testing: ${proxy.name}`);
        console.log(`🔗 URL: ${proxy.url}`);

        try {
            const start = Date.now();
            const response = await axios.get(proxy.url, {
                headers: proxy.headers,
                timeout: 10000,
                validateStatus: null // Capture all status codes
            });
            const duration = Date.now() - start;

            console.log(`📊 Status: ${response.status}`);
            console.log(`⏱️ Time: ${duration}ms`);

            let data = response.data;
            let isValid = false;

            if (typeof data === 'string') {
                // Try parsing if string (some proxies return stringified JSON)
                try {
                    data = JSON.parse(data);
                } catch (e) { }
            }

            if (data && (Array.isArray(data) || Array.isArray(data.sources))) {
                isValid = true;
                const count = Array.isArray(data) ? data.length : data.sources.length;
                console.log(`✅ Success! Found ${count} sources.`);
            } else {
                const preview = typeof response.data === 'string' ? response.data.substring(0, 100).replace(/\n/g, ' ') : 'Object/Unknown';
                console.log(`⚠️ Invalid format. Body preview: ${preview}`);
            }

        } catch (error) {
            console.log(`❌ Error: ${error.message}`);
        }
    }
}

testProxies();
