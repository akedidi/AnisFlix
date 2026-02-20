import { handleUniversalVO } from '../api/_services/universalvo/index.js';

// Mock Request/Response
const req = {
    query: {
        tmdbId: '1242898', // Predator: Badlands
        type: 'movie'
    },
    headers: {
        'x-forwarded-proto': 'https',
        'host': 'anisflix.vercel.app'
    }
};

const res = {
    status: (code) => {
        console.log(`\nResponse Status: ${code}`);
        return res;
    },
    json: (data) => {
        console.log("\nResponse JSON:");
        console.log(JSON.stringify(data, null, 2));
        return res;
    }
};

console.log("🚀 Testing UniversalVO for Predator: Badlands (TMDB 1242898)...");
handleUniversalVO(req, res).catch(err => {
    console.error("❌ Error:", err);
});
