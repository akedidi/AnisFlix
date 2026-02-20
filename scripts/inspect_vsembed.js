
import fetch from 'node-fetch';

const url = "https://vsembed.ru/embed/movie?tmdb=198471";

async function inspect() {
    try {
        console.log(`Fetching ${url}...`);
        const res = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
                "Referer": "https://vsembed.ru/"
            }
        });

        console.log(`Status: ${res.status}`);
        const html = await res.text();
        console.log("--- HTML Content Preview ---");
        console.log(html.substring(0, 2000));

        // Check for common patterns
        if (html.includes("m3u8")) console.log("✅ Found 'm3u8'");
        if (html.includes("iframe")) console.log("✅ Found 'iframe'");
        if (html.includes("eval(function")) console.log("⚠️ Found packed JS (eval)");
        if (html.includes("player")) console.log("✅ Found 'player'");
        if (html.includes("sources")) console.log("✅ Found 'sources'");

        // Look for iframe src
        const iframeMatch = html.match(/<iframe[^>]+src=["']([^"']+)["']/);
        if (iframeMatch) {
            console.log(`\nFound Iframe Source: ${iframeMatch[1]}`);
        }

    } catch (e) {
        console.error(e);
    }
}

inspect();
