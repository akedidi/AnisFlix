import fetch from 'node-fetch';

const url = 'https://fsvid.lol/embed-iepyict7yj59.html';

async function testStaticExtraction() {
    try {
        console.log(`Testing static fetch for: ${url}`);
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://french-stream.one/', // Common referer
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5'
            }
        });

        console.log(`Status: ${response.status}`);
        const html = await response.text();
        console.log(`Body length: ${html.length}`);

        if (html.includes('eval(function(p,a,c,k,e,d)')) {
            console.log('✅ Packed code found!');
        } else {
            console.log('⚠️ No packed code found. Checking for iframe...');
            if (html.includes('<iframe')) {
                console.log('ℹ️ Iframe detected.');
            }
        }

        // Log a snippet
        console.log('Snippet:', html.substring(0, 500));

    } catch (error) {
        console.error('Fetch failed:', error);
    }
}

testStaticExtraction();
