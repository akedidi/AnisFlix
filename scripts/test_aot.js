
import handler from '../api/movix-proxy/index.js';

const mockRes = () => {
    const res = {};
    res.statusCode = 200;
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
            'x-forwarded-for': '127.0.0.1',
            'host': 'anisflix.vercel.app'
        }
    };

    const res = mockRes();

    try {
        await handler(req, res);

        console.log(`   Status: ${res.statusCode}`);
        if (res.data && res.data.success) {
            console.log(`   ✅ Success! Found ${res.data.results?.length || 0} streams.`);
            if (res.data.results?.length > 0) {
                console.log(`   Anime ID: ${res.data.results[0].animeInfo?.id || 'N/A'}`);
                console.log(`   Anime Title: ${res.data.results[0].animeInfo?.title || 'N/A'}`);
            } else {
                console.log(`   ⚠️  No streams found.`);
            }
        } else {
            console.log(`   ❌ Failed.`);
            console.log('   Error:', res.data);
        }

    } catch (error) {
        console.error(`   🔥 Exception:`, error.message);
    }
};

const main = async () => {
    // Test Attack on Titan S4 Ep 1 (Final Season Part 1)
    await runTest('Attack on Titan S4 Ep 1', {
        title: 'Attack on Titan',
        season: '4',
        episode: '1',
        tmdbId: '1429'
    });
};

main();
