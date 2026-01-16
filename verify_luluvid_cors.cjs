const axios = require('axios');

const url = 'https://luluvid.com/e/7zvwze4duita';

async function checkCors() {
    try {
        console.log(`🚀 Checking CORS for: ${url}`);
        const response = await axios.get(url, {
            headers: {
                'Origin': 'http://localhost:3000',
                'Referer': 'http://localhost:3000'
            },
            validateStatus: () => true
        });

        console.log(`✅ Status: ${response.status}`);
        console.log('🔒 Access-Control-Allow-Origin:', response.headers['access-control-allow-origin'] || 'NONE');
        console.log('🔒 Referrer-Policy:', response.headers['referrer-policy'] || 'N/A');

    } catch (e) {
        console.error(e.message);
    }
}

checkCors();
