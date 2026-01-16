import { AfterDarkScraper } from './api/_services/afterdark/index.js';

async function testChain() {
    console.log("🚀 Testing Vercel Service -> Worker Chain...");
    const scraper = new AfterDarkScraper();

    // Test parameters (Fight Club)
    const tmdbId = 550;
    const type = 'movie';
    const title = 'Fight Club';
    const year = 1999;
    const originalTitle = 'Fight Club';

    try {
        const sources = await scraper.getStreams(tmdbId, type, title, year, null, null, originalTitle);
        console.log("\n✅ Result from Service:");
        console.log(JSON.stringify(sources, null, 2));

        const workerSource = sources.find(s => s.name && !s.name.includes("DEBUG"));
        if (workerSource) {
            console.log("\n🎉 SUCCESS: Received valid sources via Worker chain!");
        } else {
            console.log("\n⚠️ WARNING: No valid sources found. Check DEBUG messages.");
        }

    } catch (e) {
        console.error("\n❌ Chain Test Failed:", e);
    }
}

testChain();
