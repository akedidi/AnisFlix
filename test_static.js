
import fetch from 'node-fetch';

async function testStatic() {
    const url = 'https://bysebuho.com/e/08yulfkjcvd2';
    console.log(`⚡ Testing static extraction for: ${url}`);

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://bysebuho.com/'
            }
        });

        if (!response.ok) {
            console.error('❌ Fetch failed:', response.status);
            return;
        }

        const html = await response.text();
        console.log('📄 HTML Length:', html.length);

        // Regex test
        const m3u8Match = html.match(/(https:\/\/[^"']+\.m3u8[^"']*)/) ||
            html.match(/file:\s*["']([^"']+\.m3u8[^"']*)["']/) ||
            html.match(/source:\s*["']([^"']+\.m3u8[^"']*)["']/);

        if (m3u8Match) {
            console.log('✅ Found M3U8:', m3u8Match[1]);
        } else {
            console.log('❌ No M3U8 found in static HTML. Content preview:');
            console.log(html.substring(0, 500));
        }

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

testStatic();
