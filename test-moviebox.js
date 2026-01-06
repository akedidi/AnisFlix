// Test MovieBox endpoint locally
const axios = require('axios');

const testEndpoint = async () => {
    console.log('🧪 Testing MovieBox Endpoint...\n');

    try {
        // Test 1: Avatar (TMDB ID: 19995)
        console.log('Test 1: Avatar (2009)');
        const url1 = 'http://localhost:3000/api/movix-proxy?path=moviebox&tmdbId=19995&type=movie';
        console.log(`GET ${url1}\n`);

        const response1 = await axios.get(url1, { timeout: 60000 });
        console.log('✅ Response:', JSON.stringify(response1.data, null, 2));

        if (response1.data.success && response1.data.streams.length > 0) {
            console.log(`\n📊 Found ${response1.data.streams.length} quality options:`);
            response1.data.streams.forEach(s => {
                console.log(`  - ${s.quality}: ${s.size} (${s.language})`);
            });
        }

        console.log('\n---\n');

        // Test 2: Game of Thrones S1E1 (TMDB ID: 1399)
        console.log('Test 2: Game of Thrones S1E1');
        const url2 = 'http://localhost:3000/api/movix-proxy?path=moviebox&tmdbId=1399&type=tv&season=1&episode=1';
        console.log(`GET ${url2}\n`);

        const response2 = await axios.get(url2, { timeout: 60000 });
        console.log('✅ Response:', JSON.stringify(response2.data, null, 2));

        if (response2.data.success && response2.data.streams.length > 0) {
            console.log(`\n📊 Found ${response2.data.streams.length} quality options`);
        }

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
        process.exit(1);
    }
};

testEndpoint();
