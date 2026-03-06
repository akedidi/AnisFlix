const axios = require('axios');

async function test() {
    const targetUrl = 'https://viamotionhsi.netplus.ch/live/eds/tf1hd/browser-HLS8/tf1hd.m3u8';

    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/vnd.apple.mpegurl, application/x-mpegURL, application/octet-stream, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
    };

    try {
        console.log('Fetching', targetUrl);
        const response = await axios.get(targetUrl, {
            headers: headers,
            timeout: 10000,
            responseType: 'text'
        });

        console.log('Status:', response.status);
        console.log('Final URL:', response.request.res.responseUrl);
        console.log('Data (first 100 chars):', typeof response.data === 'string' ? response.data.substring(0, 100) : typeof response.data);

    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response headers:', error.response.headers);
        }
    }
}

test();
