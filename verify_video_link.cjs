const axios = require('axios');

const url = "https://proxy.afterdark.baby/rolly?url=https://v6.vidzy.org/hls2/01/00030/3p7en2qlurah_n/master.m3u8?t=WYE-jIIOl8oNcc60LLF2_zJZltReMWKvbWPDKHnSFRg&s=1768503795&e=172800&f=150455&i=0.0&sp=0";

const headersSet1 = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

const headersSet2 = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://afterdark.mom/',
    'Origin': 'https://afterdark.mom'
};

const headersSet3 = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://proxy.afterdark.baby/',
    'Origin': 'https://proxy.afterdark.baby'
};

async function test(name, headers) {
    try {
        console.log(`\n--- Testing ${name} ---`);
        const res = await axios.get(url, {
            headers,
            validateStatus: () => true,
            maxRedirects: 0 // Don't follow redirects automatically, see what it returns
        });
        console.log(`Status: ${res.status}`);
        console.log(`Headers:`, res.headers);
        if (res.status === 301 || res.status === 302) {
            console.log(`Redirect Location: ${res.headers.location}`);
        } else if (res.status === 200) {
            console.log(`Body generic content: ${res.data.substring(0, 100)}...`);
        }
    } catch (e) {
        console.log(`Error: ${e.message}`);
    }
}

async function run() {
    await test("No Headers", {});
    await test("Generic UA", headersSet1);
    await test("Referer: afterdark.mom", headersSet2);
    await test("Referer: proxy.afterdark.baby", headersSet3);
}

run();
