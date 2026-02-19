import fetch from 'node-fetch';

const indexUrl = "https://moo265724.moovbob.fr/files/aa/2z9kdqQTZIFxdTc01M4dvIE5Q7Jc1JF3iPo.m3u8";

async function testFetch(name, headers = {}) {
    console.log(`\n--- Testing ${name} ---`);
    console.log(`Headers:`, headers);
    try {
        const response = await fetch(indexUrl, { headers });
        console.log(`Status: ${response.status} ${response.statusText}`);

        if (!response.ok) {
            console.log("❌ Failed to fetch playlist");
            return;
        }

        const text = await response.text();
        console.log("✅ Playlist fetched!");
        console.log("First 5 lines:");
        console.log(text.split('\n').slice(0, 5).join('\n'));

        // Extract a segment or key to test
        const lines = text.split('\n');
        const segmentLine = lines.find(l => !l.startsWith('#') && l.trim().length > 0);

        if (segmentLine) {
            console.log(`\nAttempting to fetch segment: ${segmentLine}`);
            const segmentUrl = new URL(segmentLine, indexUrl).toString();
            console.log(`Resolved Segment URL: ${segmentUrl}`);

            const segResponse = await fetch(segmentUrl, { headers });
            console.log(`Segment Status: ${segResponse.status} ${segResponse.statusText}`);
            if (segResponse.ok) {
                console.log("✅ Segment fetched successfully!");
            } else {
                console.log("❌ Segment fetch failed!");
            }
        } else {
            console.log("⚠️ No segments found in playlist (Master playlist?)");
        }

    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
    }
}

async function run() {
    await testFetch("No Headers");
    await testFetch("With Referer", { "Referer": "https://moovbob.fr/" });
    await testFetch("With Origin", { "Origin": "https://moovbob.fr" });
    await testFetch("With User-Agent", {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
    });
}

run();
