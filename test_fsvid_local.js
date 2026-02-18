import fetch from 'node-fetch';

const url = "https://fsvid.lol/embed-iepyict7yj59.html";

async function test() {
    console.log(`Testing FSVid static extraction for: ${url}`);

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Referer': 'https://french-stream.one/',
                'Origin': 'https://french-stream.one'
            }
        });

        console.log(`Status: ${response.status}`);
        const html = await response.text();
        console.log(`HTML Length: ${html.length}`);

        const m3u8Match = html.match(/(https:\/\/[^"']+\.m3u8[^"']*)/) ||
            html.match(/file:\s*["']([^"']+\.m3u8[^"']*)["']/) ||
            html.match(/source:\s*["']([^"']+\.m3u8[^"']*)["']/);

        if (m3u8Match) {
            console.log("✅ Found M3U8:", m3u8Match[1]);
        } else {
            console.log("❌ No M3U8 found in HTML.");
            console.log("Partial HTML:", html.substring(0, 500));
        }

    } catch (error) {
        console.error("Error:", error);
    }
}

test();
