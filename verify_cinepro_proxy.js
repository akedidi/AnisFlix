import { CineproScraper } from './api/_services/cinepro/index.js';

console.log("🚀 Starting Cinepro Proxy Verification...");

const scraper = new CineproScraper();

// TMDB ID from user report: 798645 (Deadpool & Wolverine / maybe? or similar recent movie)
// Actually user said 798645
const tmdbId = '798645';
const type = 'movie';

async function test() {
    try {
        console.log(`🔎 Fetching streams for TMDB ID: ${tmdbId}`);
        // We pass 'localhost:3000' as host just to satisfy the parameter, 
        // though our proxy change for corsproxy.io is independent of host for the *fetching* part.
        const streams = await scraper.getStreams(tmdbId, null, null, null, 'localhost:3000');

        console.log(`\n✅ Finished. Found ${streams.length} streams.`);
        if (streams.length > 0) {
            console.log("Samples:");
            streams.slice(0, 3).forEach(s => {
                console.log(`- [${s.server}] ${s.quality} : ${s.link.substring(0, 50)}...`);
            });
        }
    } catch (e) {
        console.error("❌ Error during verification:", e);
    }
}

test();
