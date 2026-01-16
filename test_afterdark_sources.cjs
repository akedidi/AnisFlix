const axios = require('axios');

const sources = [
    {
        name: "Alpha (Darkibox)",
        url: "https://dl34.darkibox.com/hls2/16/01720/,9rncab6ttpud_x,lang/eng/9rncab6ttpud_eng,lang/fre/9rncab6ttpud_fre,.urlset/master.m3u8?t=VDnB01qjutOPeTeYGotswvdXs_Sl5cHTY2ZxrylCyHU&s=1768516036&e=43200&f=8601756&i=0.0&sp=0&fr=9rncab6ttpud"
    },
    {
        name: "Lisa (Vidzy No-Proxy)",
        url: "https://proxy.afterdark.baby/rolly?url=https://v6.vidzy.org/hls2/01/00030/3p7en2qlurah_n/master.m3u8?t=00ODHKHHw6uE2jX9DnGTQAi0L2oxnc_Si9seyMKaoxo&s=1768516036&e=172800&f=150455&i=0.0&sp=0"
    },
    {
        name: "Fusion (Embed Proxy)",
        url: "https://proxy.afterdark.baby/boom-clap?url=https://ralphysuccessfull.org/e/3zjlmcs97urp"
    },
    {
        name: "Lyssara (MP4 Proxy)",
        url: "https://proxy.afterdark.baby/alejandro?url=https://uqload.bz/embed-peif4j4wgi2u.html"
    }
];

const browserHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://anisflix.vercel.app/',
    'Origin': 'https://anisflix.vercel.app'
};

async function checkUrl(url, headers = {}, label = "") {
    try {
        const start = Date.now();
        const res = await axios.get(url, {
            headers,
            timeout: 5000,
            maxRedirects: 5,
            validateStatus: () => true
        });
        const time = Date.now() - start;
        return { status: res.status, time, type: res.headers['content-type'], preview: res.data.toString().substring(0, 50) };
    } catch (e) {
        return { status: "ERR", msg: e.message };
    }
}

async function run() {
    for (const source of sources) {
        console.log(`\nTesting: ${source.name}`);

        // 1. Direct Clean
        const clean = await checkUrl(source.url, {});
        console.log(`  [Direct Clean] Status: ${clean.status} (${clean.time}ms) Type: ${clean.type}`);

        // 2. Direct Browser
        const chrome = await checkUrl(source.url, browserHeaders);
        console.log(`  [Direct Browser] Status: ${chrome.status} (${chrome.time}ms) - Simulating Client`);

        // 3. CorsProxy
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(source.url)}`;
        const prox = await checkUrl(proxyUrl, {});
        console.log(`  [CorsProxy.io] Status: ${prox.status} (${prox.time}ms)`);
    }
}

run();
