const axios = require('axios');

const url = 'https://luluvid.com/e/7zvwze4duita';
const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function run() {
    try {
        console.log(`🚀 Extracting: ${url}`);
        const response = await axios.get(url, {
            headers: {
                'User-Agent': userAgent,
                'Referer': 'https://luluvid.com/'
            }
        });

        const html = response.data;

        let match = html.match(/sources:\s*\[\{file:"([^"]+)"/);
        if (!match) match = html.match(/file:"([^"]+)"/);

        if (match && match[1]) {
            console.log(`✅ Extracted: ${match[1]}`);
        } else {
            console.log('❌ No match found using current regex.');
        }

        // Dump relevant part of HTML for analysis
        const idx = html.indexOf('sources:');
        if (idx !== -1) {
            console.log('\n🔍 Context in HTML:');
            console.log(html.substring(idx, idx + 200));
        }

    } catch (e) {
        console.error(e.message);
    }
}

run();
