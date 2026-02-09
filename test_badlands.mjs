import { CineproScraper } from "./api/_services/cinepro/index.js";

async function test() {
    console.log("Testing MegaCDN extraction for Badlands (TMDB 1242898)...");
    const scraper = new CineproScraper();
    // TMDB ID 1242898 (Predator: Badlands), runtime ~100min
    const streams = await scraper.getAutoEmbed(1242898, null, null, null, null, null, 100);

    if (streams.length > 0) {
        console.log("✅ Success! Found streams:");
        console.log(JSON.stringify(streams.map(s => ({ server: s.server, link: s.link, quality: s.quality })), null, 2));
    } else {
        console.log("❌ Failed to find streams.");
    }
}

test();
