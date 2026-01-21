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

async function previewCompleteDateSorting() {
    console.log('🧪 APERÇU COMPLET - Tri par DATE\n');

    const language = 'fr-FR';
    const allowedNetworkIds = "213|1024|2552|2739|453|1112|49|3186|8304|6783|67|318|3353|4330|6|2|16|19|88|3267|4|332|285|290|712|6694|662|1628|2278|302|23|94|160|2363|4661|43|174|218|4590|7635|827|80|384|141|3877|156";

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 60);
    const pastDateStr = pastDate.toISOString().slice(0, 10);

    console.log(`📅 Période: ${pastDateStr} → ${todayStr}\n`);

    // Fetch multiple pages for more complete view
    console.log('📡 Fetching TMDB data (pages 1-3)...');

    const onTheAirData = await tmdbFetch('/tv/on_the_air', { language, page: 1 });
    const airingTodayData = await tmdbFetch('/tv/airing_today', { language, page: 1 });

    const [discover1, discover2, discover3] = await Promise.all([
        tmdbFetch('/discover/tv', {
            language, page: 1, 'with_networks': allowedNetworkIds,
            'air_date.lte': todayStr, 'air_date.gte': pastDateStr,
            'sort_by': 'popularity.desc'
        }),
        tmdbFetch('/discover/tv', {
            language, page: 2, 'with_networks': allowedNetworkIds,
            'air_date.lte': todayStr, 'air_date.gte': pastDateStr,
            'sort_by': 'popularity.desc'
        }),
        tmdbFetch('/discover/tv', {
            language, page: 3, 'with_networks': allowedNetworkIds,
            'air_date.lte': todayStr, 'air_date.gte': pastDateStr,
            'sort_by': 'popularity.desc'
        })
    ]);

    // Combine all sources
    const allShows = [
        ...onTheAirData.results,
        ...airingTodayData.results,
        ...discover1.results,
        ...discover2.results,
        ...discover3.results
    ];

    // Deduplicate
    const uniqueCandidates = allShows.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);

    console.log(`📊 ${uniqueCandidates.length} candidats uniques trouvés`);
    console.log('📡 Enrichissement de toutes les séries...\n');

    const unwantedGenres = [10763, 10764, 10767];

    const enrichedResults = await Promise.all(
        uniqueCandidates.map(async (show) => {
            try {
                const details = await tmdbFetch(`/tv/${show.id}`, { language });

                if (details.genres?.some(g => unwantedGenres.includes(g.id))) return null;

                let latestEp = details.last_episode_to_air;
                const nextEp = details.next_episode_to_air;
                const todayDate = new Date().toISOString().slice(0, 10);

                if (nextEp && nextEp.air_date && nextEp.air_date <= todayDate) {
                    latestEp = nextEp;
                }

                if (!latestEp || !details.poster_path) return null;

                return {
                    id: show.id,
                    name: show.name,
                    popularity: show.popularity,
                    networks: details.networks?.map(n => n.name).join(', ') || 'N/A',
                    episodeInfo: {
                        season: latestEp.season_number,
                        episode: latestEp.episode_number,
                        date: latestEp.air_date
                    }
                };
            } catch {
                return null;
            }
        })
    );

    const validResults = enrichedResults.filter(item => item !== null && item.episodeInfo);

    // Sort by DATE (newest first), then by popularity for same date
    const sortedByDate = [...validResults].sort((a, b) => {
        const dateA = new Date(a.episodeInfo.date || '1970-01-01');
        const dateB = new Date(b.episodeInfo.date || '1970-01-01');

        const dateDiff = dateB - dateA;
        if (dateDiff !== 0) return dateDiff;

        return (b.popularity || 0) - (a.popularity || 0);
    });

    // Display results grouped by date
    console.log('📋 RÉSULTATS COMPLETS TRIÉS PAR DATE:\n');
    console.log('='.repeat(120));

    let currentDate = null;
    let position = 0;

    for (const item of sortedByDate) {
        const episodeDate = item.episodeInfo.date;

        if (episodeDate !== currentDate) {
            currentDate = episodeDate;
            const daysOld = Math.max(0, (today - new Date(episodeDate)) / (1000 * 60 * 60 * 24));
            console.log(`\n📅 ${episodeDate} (il y a ${daysOld.toFixed(0)} jours)`);
            console.log('-'.repeat(120));
        }

        position++;
        const popStr = item.popularity.toFixed(0).padStart(4);
        const epStr = `S${item.episodeInfo.season}E${item.episodeInfo.episode.toString().padStart(2)}`;
        console.log(`  ${position.toString().padStart(2)}. ${item.name.slice(0, 40).padEnd(40)} | ${epStr.padEnd(7)} | Pop: ${popStr} | ${item.networks.slice(0, 25)}`);
    }

    console.log('\n' + '='.repeat(120));
    console.log(`\n✅ Total: ${sortedByDate.length} séries triées par date décroissante (3 pages TMDB)`);

    // Show date distribution
    console.log('\n📊 Distribution par date:');
    const dateCount = {};
    sortedByDate.forEach(item => {
        const d = item.episodeInfo.date;
        dateCount[d] = (dateCount[d] || 0) + 1;
    });
    Object.entries(dateCount).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 15).forEach(([date, count]) => {
        console.log(`   ${date}: ${count} série(s)`);
    });
}

previewCompleteDateSorting().catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
});
