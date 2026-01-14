import axios from 'axios';

async function testAllOrigins() {
    const targetUrl = 'https://test.autoembed.cc/api/server?id=19995&sr=1';
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;

    console.log(`Testing AutoEmbed via AllOrigins...`);

    try {
        const response = await axios.get(proxyUrl, { timeout: 10000 });
        console.log(`Status: ${response.status}`);

        if (response.data && response.data.contents) {
            console.log('Contents received (snippet):', response.data.contents.substring(0, 200));
            try {
                const json = JSON.parse(response.data.contents);
                console.log('JSON Parse success (keys):', Object.keys(json));
            } catch (e) {
                console.log('JSON Parse failed. Content might be HMTL (Cloudflare Block).');
            }
        } else {
            console.log('No contents field.');
        }

    } catch (e) {
        console.error('Request failed:', e.message);
    }
}

testAllOrigins();
