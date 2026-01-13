const axios = require('axios');
const fs = require('fs');

async function testDownloadProxy() {
    console.log('🧪 Testing Download Proxy...');

    // Test with a known direct MP4 link (or simulate one)
    // For real test, we need a valid URL that requires headers.
    // Since we can't easily scrape a fresh protected link here without running the whole stack,
    // we will test the proxy mechanism with a public file but pass dummy headers to verify they are processed.

    const targetUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
    const proxyEndpoint = 'http://localhost:3000/api/proxy';

    const headers = JSON.stringify({
        'User-Agent': 'TestAgent/1.0',
        'X-Custom-Header': 'Verified'
    });

    const url = `${proxyEndpoint}?action=video&url=${encodeURIComponent(targetUrl)}&headers=${encodeURIComponent(headers)}`;

    console.log(`🔗 Requesting: ${url}`);

    try {
        const response = await axios.get(url, {
            responseType: 'stream'
        });

        console.log(`✅ Status: ${response.status}`);
        console.log(`✅ Content-Type: ${response.headers['content-type']}`);
        console.log(`✅ Content-Disposition: ${response.headers['content-disposition']}`);

        const writer = fs.createWriteStream('test_download.mp4');
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', () => {
                console.log('✅ Download completed: test_download.mp4');
                resolve();
            });
            writer.on('error', reject);
        });

    } catch (error) {
        console.error('❌ Proxy failed:', error.message);
        if (error.response) {
            console.error('Data:', error.response.data);
        }
    }
}

testDownloadProxy();
