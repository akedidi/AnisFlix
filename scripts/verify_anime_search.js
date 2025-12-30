
import handler from '../api/movix-proxy/index.js';

const mockRes = () => {
    const res = {};
    res.statusCode = 200; // Default status
    res.status = (code) => {
        res.statusCode = code;
        return res;
    };
    res.setHeader = (name, value) => {
        return res;
    };
    res.json = (data) => {
        res.data = data;
        return res;
    };
    return res;
};

const runTest = async (name, queryParams) => {
    console.log(`\n--------------------------------------------------`);
    console.log(`🧪 Running Test: ${name}`);
    console.log(`   Params:`, queryParams);

    const req = {
        method: 'GET',
        url: '/api/movix-proxy?path=anime-api',
        query: {
            path: 'anime-api',
            ...queryParams
        },
        headers: {
            'x-forwarded-for': '127.0.0.1' // Fake IP
        }
    };

    const res = mockRes();

    try {
        await handler(req, res);

        console.log(`   Status: ${res.statusCode}`);
        if (res.data && res.data.success) {
            console.log(`   ✅ Success! Found ${res.data.results?.length || 0} streams.`);
            if (res.data.results?.length > 0) {
                console.log(`   Stream 0: ${res.data.results[0].server} - ${res.data.results[0].quality}`);
                console.log(`   Episode Title: ${res.data.meta?.episodeTitle || 'N/A'}`);
            } else {
                console.log(`   ⚠️  No streams found.`);
            }
        } else {
            console.log(`   ❌ Failed.`);
            console.log('   Error:', res.data);
        }

    } catch (error) {
        console.error(`   🔥 Exception:`, error);
    }
};

const main = async () => {
    // Test 1: Jujutsu Kaisen 2nd Season
    // Expected: Should find "Jujutsu Kaisen 2nd Season" and return streams.
    await runTest('JJK Season 2 Episode 1', {
        title: 'Jujutsu Kaisen',
        season: '2',
        episode: '1',
        tmdbId: '95479' // JJK TMDB ID
    });

    // Test 2: Attack on Titan Season 4 Part 3 (The Final Chapters)
    // AOT S4 Ep 1 is "The Other Side of the Sea".
    // AOT S4 Part 3 starts much later. 
    // Let's try a late episode in S4.
    // TMDB Season 4 has ~30 episodes?
    // Let's try Episode 1 (Part 1) first to ensure basic S4 works.
    await runTest('Desperate Housewives (Control)', {
        title: 'Desperate Housewives', // Should fail or use TV logic if I wasn't restricting to anime-api, but anime-api is forced in path
        season: '1',
        episode: '1'
    });
    // Actually anime-api path is specific.

    await runTest('Attack on Titan S4 Ep 1 (Part 1)', {
        title: 'Attack on Titan',
        season: '4',
        episode: '1',
        tmdbId: '1429'
    });

    // Test 3: Attack on Titan S4 Ep 17 (Part 2) - Tests Iteration
    // Should fail on "Final Season Part 1" and succeed on "Final Season Part 2"
    await runTest('Attack on Titan S4 Ep 17 (Part 2)', {
        title: 'Attack on Titan',
        season: '4',
        episode: '17',
        tmdbId: '1429'
    });

    // Test 3: One Piece (Long running, Season 1)
    await runTest('One Piece Ep 1', {
        title: 'One Piece',
        season: '1',
        episode: '1',
        tmdbId: '37854'
    });
};

main();
