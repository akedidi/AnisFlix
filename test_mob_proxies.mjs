/**
 * Test MovieBox API through various free proxies
 * to find which regions/proxies work
 */

import CryptoJS from 'crypto-js';

const API_BASE = "https://api.inmoviebox.com";
const SEARCH_URL = `${API_BASE}/wefeed-mobile-bff/subject-api/search/v2`;

const HEADERS_BASE = {
    'User-Agent': 'com.community.mbox.in/50020042 (Linux; U; Android 16; en_IN; sdk_gphone64_x86_64; Build/BP22.250325.006; Cronet/133.0.6876.3)',
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'x-client-info': '{"package_name":"com.community.mbox.in","version_name":"3.0.03.0529.03","version_code":50020042,"os":"android","os_version":"16","device_id":"da2b99c821e6ea023e4be55b54d5f7d8","install_store":"ps","gaid":"d7578036d13336cc","brand":"google","model":"sdk_gphone64_x86_64","system_language":"en","net":"NETWORK_WIFI","region":"IN","timezone":"Asia/Calcutta","sp_code":""}',
    'x-client-status': '0'
};

// Crypto signing
const KEY_B64 = "NzZpUmwwN3MweFNOOWpxbUVXQXQ3OUVCSlp1bElRSXNWNjRGWnIyTw==";
const SECRET_KEY = CryptoJS.enc.Base64.parse(
    CryptoJS.enc.Base64.parse(KEY_B64).toString(CryptoJS.enc.Utf8)
);

function md5(input) { return CryptoJS.MD5(input).toString(CryptoJS.enc.Hex); }
function hmacMd5(key, data) { return CryptoJS.HmacMD5(data, key).toString(CryptoJS.enc.Base64); }

function generateSignedHeaders(method, url, body) {
    const timestamp = Date.now();
    const ts = timestamp.toString();
    const xClientToken = `${ts},${md5(ts.split('').reverse().join(''))}`;

    const urlObj = new URL(url);
    const path = urlObj.pathname;
    const params = Array.from(urlObj.searchParams.keys()).sort();
    const query = params.length > 0 ? params.map(k => urlObj.searchParams.getAll(k).map(v => `${k}=${v}`).join('&')).join('&') : '';
    const canonicalUrl = query ? `${path}?${query}` : path;

    let bodyHash = "", bodyLength = "";
    if (body) {
        const w = CryptoJS.enc.Utf8.parse(body);
        bodyHash = md5(w);
        bodyLength = w.sigBytes.toString();
    }

    const canonical = `${method}\napplication/json\napplication/json\n${bodyLength}\n${timestamp}\n${bodyHash}\n${canonicalUrl}`;
    const sig = hmacMd5(SECRET_KEY, canonical);

    return {
        ...HEADERS_BASE,
        'x-client-token': xClientToken,
        'x-tr-signature': `${timestamp}|2|${sig}`
    };
}

// ---- CORS/PROXY Services to test ----
const PROXY_SERVICES = [
    // Free CORS proxies / relay services
    { name: "Direct (no proxy)", url: null },
    { name: "corsproxy.io", url: "https://corsproxy.io/?" },
    { name: "api.allorigins.win", url: "https://api.allorigins.win/raw?url=" },
    { name: "api.codetabs.com", url: "https://api.codetabs.com/v1/proxy?quest=" },
    { name: "thingproxy.freeboard.io", url: "https://thingproxy.freeboard.io/fetch/" },
    { name: "cors-anywhere (demo)", url: "https://cors-anywhere.herokuapp.com/" },
    { name: "crossorigin.me", url: "https://crossorigin.me/" },
    { name: "cors.bridged.cc", url: "https://cors.bridged.cc/" },
    { name: "api.scraperapi.com", url: "https://api.scraperapi.com/?url=" },
    { name: "proxy.cors.sh", url: "https://proxy.cors.sh/" },
    { name: "corsproxy.org", url: "https://corsproxy.org/?" },
    { name: "cors-proxy.htmldriven.com", url: "https://cors-proxy.htmldriven.com/?url=" },
    { name: "yacdn.org/proxy", url: "https://yacdn.org/proxy/" },
    { name: "api.webscraping.ai", url: "https://api.webscraping.ai/raw?url=" },
    { name: "gobetween.oklabs.org", url: "https://gobetween.oklabs.org/" },
    { name: "cors.sh", url: "https://cors.sh/" },
    { name: "cors-get-proxy.sirjosh.workers.dev", url: "https://cors-get-proxy.sirjosh.workers.dev/?url=" },
    { name: "corsfix.com", url: "https://corsfix.com/?url=" },
    { name: "test.cors.workers.dev", url: "https://test.cors.workers.dev/?" },
    { name: "proxy.techzbots.live", url: "https://proxy.techzbots.live/" },
    { name: "noCORSproxy (vercel)", url: "https://nocors-proxy.vercel.app/api/proxy?url=" },
    { name: "alloy-proxy.up.railway", url: "https://alloy-proxy.up.railway.app/fetch/" },
    { name: "metalproxy.rest", url: "https://metalproxy.rest/" },
    { name: "noreferrer.vercel.app", url: "https://noreferrer.vercel.app/api?url=" },
    { name: "open-cors-proxy.onrender.com", url: "https://open-cors-proxy.onrender.com/" },
    { name: "proxy.scrapeops.io", url: "https://proxy.scrapeops.io/v1/?url=" },
    { name: "bypass.deno.dev", url: "https://bypass.deno.dev/" },
    { name: "cors-bridge.onrender.com", url: "https://cors-bridge.onrender.com/" },
    { name: "corsproxyio.herokuapp.com", url: "https://corsproxyio.herokuapp.com/" },
    { name: "cors-relay.onrender.com", url: "https://cors-relay.onrender.com/" },
];

const SEARCH_BODY = '{"page": 1, "perPage": 5, "keyword": "Predator Badlands"}';

async function testDirect() {
    const headers = generateSignedHeaders('POST', SEARCH_URL, SEARCH_BODY);
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        const res = await fetch(SEARCH_URL, {
            method: 'POST',
            headers,
            body: SEARCH_BODY,
            signal: controller.signal
        });
        clearTimeout(timeout);
        const text = await res.text();
        return { status: res.status, body: text.substring(0, 200) };
    } catch (e) {
        return { status: 'ERROR', body: e.message };
    }
}

async function testProxy(proxy) {
    const targetUrl = encodeURIComponent(SEARCH_URL);
    const proxyUrl = proxy.url + targetUrl;

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12000);

        // Most CORS proxies only support GET, but let's try POST first
        const headers = generateSignedHeaders('POST', SEARCH_URL, SEARCH_BODY);

        const res = await fetch(proxyUrl, {
            method: 'POST',
            headers: {
                ...headers,
                'x-requested-with': 'XMLHttpRequest', // Some proxies need this
            },
            body: SEARCH_BODY,
            signal: controller.signal
        });
        clearTimeout(timeout);
        const text = await res.text();
        return { status: res.status, body: text.substring(0, 200) };
    } catch (e) {
        return { status: 'ERROR', body: e.message.substring(0, 100) };
    }
}

async function main() {
    console.log('🧪 Testing MovieBox API accessibility through various proxies');
    console.log(`   Target: ${SEARCH_URL}`);
    console.log(`   Query: "Predator Badlands"\n`);

    const results = [];

    // Test all in parallel (batched to avoid overwhelming)
    const batchSize = 6;
    for (let i = 0; i < PROXY_SERVICES.length; i += batchSize) {
        const batch = PROXY_SERVICES.slice(i, i + batchSize);
        const promises = batch.map(async (proxy) => {
            const startTime = Date.now();
            let result;

            if (!proxy.url) {
                result = await testDirect();
            } else {
                result = await testProxy(proxy);
            }

            const elapsed = Date.now() - startTime;
            const success = result.status === 200 && result.body.includes('"data"');
            const isGeoBlock = result.body.includes('not available in current region') || result.body.includes('FORBIDDEN');

            const icon = success ? '✅' : isGeoBlock ? '🚫' : '❌';
            console.log(`${icon} [${String(result.status).padEnd(5)}] ${proxy.name.padEnd(40)} ${elapsed}ms | ${result.body.substring(0, 80)}`);

            results.push({ name: proxy.name, ...result, success, elapsed });
        });
        await Promise.all(promises);
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 SUMMARY');
    console.log('='.repeat(80));

    const working = results.filter(r => r.success);
    const geoBlocked = results.filter(r => r.body?.includes('not available'));
    const errors = results.filter(r => !r.success && !r.body?.includes('not available'));

    console.log(`✅ Working: ${working.length}`);
    console.log(`🚫 Geo-blocked: ${geoBlocked.length}`);
    console.log(`❌ Error/Timeout: ${errors.length}`);

    if (working.length > 0) {
        console.log('\n🎉 WORKING PROXIES:');
        working.forEach(r => console.log(`   - ${r.name} (${r.elapsed}ms)`));
    }
}

main();
