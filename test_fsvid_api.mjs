/**
 * Test FSVid extraction via API
 */

async function testFSVidAPI() {
    const testUrl = 'https://fsvid.lol/embed-iepyict7yj59.html';

    console.log('🧪 Testing FSVid API extraction...\n');
    console.log(`📡 URL: ${testUrl}\n`);

    try {
        // Test with local API endpoint
        const response = await fetch('http://localhost:3000/api/extract', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                type: 'fsvid',
                url: testUrl
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        console.log('✅ API Response:');
        console.log(JSON.stringify(result, null, 2));

        // Verify result structure
        if (result.success && result.m3u8Url) {
            console.log('\n🎉 Test PASSED!');
            console.log(`M3U8 URL: ${result.m3u8Url}`);
        } else {
            console.log('\n❌ Test FAILED: Missing m3u8Url in response');
        }

    } catch (error) {
        console.error('\n💥 Test FAILED:', error.message);
    }
}

testFSVidAPI();
