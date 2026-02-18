import fetch from 'node-fetch';

const targetUrl = "https://fsvid.lol/embed-iepyict7yj59.html";
const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;

async function test() {
    console.log(`Testing FSVid via CORS Proxy: ${proxyUrl}`);

    try {
        const response = await fetch(proxyUrl);
        console.log(`Status: ${response.status}`);

        if (response.ok) {
            const html = await response.text();
            console.log(`HTML Length: ${html.length}`);
            console.log("Snippet:", html.substring(0, 200));

            // Check for m3u8 patterns
            const hasM3u8 = html.includes('.m3u8') || html.match(/file:\s*["']([^"']+\.m3u8[^"']*)["']/);
            console.log(`Contains M3U8 pattern? ${!!hasM3u8}`);
        } else {
            console.log("Response text:", await response.text());
        }

    } catch (error) {
        console.error("Error:", error);
    }
}

test();
