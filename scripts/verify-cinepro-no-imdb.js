import { CineproScraper } from '../api/_services/cinepro/index.js';

async function test() {
    console.log('--- Testing AutoEmbed ONLY (No IMDB ID) ---');
    const scraper = new CineproScraper();
    const tmdbId = 19995;

    // FORCE NULL IMDB ID to test AutoEmbed fallback
    const imdbId = null;

    // Simulate host (irrelevant for fetching, only for proxy string gen)
    const host = 'anisflix.vercel.app';

    try {
        const streams = await scraper.getStreams(tmdbId, null, null, imdbId, host);
        console.log(`Found ${streams.length} streams.`);
        streams.forEach(s => console.log(` - ${s.server} [${s.quality}]`));
    } catch (e) {
        console.error('Error:', e);
    }
}

test();
