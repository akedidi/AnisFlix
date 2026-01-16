import { CineproScraper } from './api/_services/cinepro/index.js';

console.log("🎬 Testing MegaCDN API Integration\n");

const scraper = new CineproScraper();

// Test with Fight Club (TMDB: 550)
const tmdbId = '550';
console.log(`📽️ Testing with Fight Club (TMDB: ${tmdbId})\n`);

try {
    const streams = await scraper.getAutoEmbed(tmdbId, null, null, null, null);

    console.log(`\n${"=".repeat(80)}`);
    console.log(`✅ Found ${streams.length} streams:\n`);

    for (const stream of streams) {
        console.log(`[${stream.server}] ${stream.quality}`);
        console.log(`   Type: ${stream.type}`);
        console.log(`   Lang: ${stream.lang}`);
        console.log(`   URL: ${stream.link.substring(0, 100)}...`);
        console.log();
    }

    console.log(`${"=".repeat(80)}`);

    // Output JSON format like the API would
    console.log("\n📋 API Response Format:\n");
    console.log(JSON.stringify({ streams }, null, 2));

} catch (e) {
    console.error(`❌ Error: ${e.message}`);
}
