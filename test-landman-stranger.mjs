import axios from 'axios';

const TMDB_API_KEY = 'f3d757824f08ea2cff45eb8f47ca3a1e';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

async function tmdbFetch(endpoint, params = {}) {
    const url = `${TMDB_BASE_URL}${endpoint}`;
    const response = await axios.get(url, {
        params: { api_key: TMDB_API_KEY, ...params }
    });
    return response.data;
}

async function compareLandmanStranger() {
    console.log('🧪 Comparing Landman vs Stranger Things episode dates\n');

    const language = 'fr-FR';

    // Search for shows
    const landmanSearch = await tmdbFetch('/search/tv', { query: 'Landman', language });
    const strangerSearch = await tmdbFetch('/search/tv', { query: 'Stranger Things', language });

    const landman = landmanSearch.results[0];
    const stranger = strangerSearch.results[0];

    console.log('📺 Shows found:');
    console.log(`   Landman: ${landman.name} (ID: ${landman.id})`);
    console.log(`   Stranger Things: ${stranger.name} (ID: ${stranger.id})\n`);

    // Get details
    const landmanDetails = await tmdbFetch(`/tv/${landman.id}`, { language });
    const strangerDetails = await tmdbFetch(`/tv/${stranger.id}`, { language });

    // Helper to get effective latest episode
    const getLatestEp = (details) => {
        let ep = details.last_episode_to_air;
        const next = details.next_episode_to_air;
        const today = new Date().toISOString().slice(0, 10);
        if (next && next.air_date && next.air_date <= today) ep = next;
        return ep;
    };

    const landmanEp = getLatestEp(landmanDetails);
    const strangerEp = getLatestEp(strangerDetails);

    console.log('📌 Landman:');
    console.log(`   Latest Ep: S${landmanEp?.season_number}E${landmanEp?.episode_number}`);
    console.log(`   Date: ${landmanEp?.air_date}`);
    console.log(`   Popularity: ${landman.popularity}\n`);

    console.log('📌 Stranger Things:');
    console.log(`   Latest Ep: S${strangerEp?.season_number}E${strangerEp?.episode_number}`);
    console.log(`   Date: ${strangerEp?.air_date}`);
    console.log(`   Popularity: ${stranger.popularity}\n`);

    const landmanDate = new Date(landmanEp?.air_date || '1970-01-01');
    const strangerDate = new Date(strangerEp?.air_date || '1970-01-01');

    console.log('='.repeat(80));
    console.log('\n🔍 Sort Analysis (Date DESC):\n');

    if (landmanDate > strangerDate) {
        console.log(`✅ Landman (${landmanEp?.air_date}) is NEWER than Stranger Things (${strangerEp?.air_date})`);
        console.log('   → Landman should appear BEFORE Stranger Things');
    } else if (landmanDate < strangerDate) {
        console.log(`✅ Landman (${landmanEp?.air_date}) is OLDER than Stranger Things (${strangerEp?.air_date})`);
        console.log('   → Landman should appear AFTER Stranger Things');
    } else {
        console.log(`🔄 Same Date (${landmanEp?.air_date})`);
        if (landman.popularity > stranger.popularity) {
            console.log(`   Popularity: Landman (${landman.popularity}) > Stranger Things (${stranger.popularity})`);
            console.log('   → Landman should appear BEFORE Stranger Things');
        } else {
            console.log(`   Popularity: Stranger Things (${stranger.popularity}) > Landman (${landman.popularity})`);
            console.log('   → Landman should appear AFTER Stranger Things');
        }
    }
}

compareLandmanStranger().catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
});
