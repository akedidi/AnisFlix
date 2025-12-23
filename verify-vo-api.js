import { handleUniversalVO } from './services/universalvo/index.js';

async function runTest() {
    console.log('--- Testing MOVIE (Gladiator 2) ---');
    await testRequest({
        tmdbId: '798645',
        type: 'movie'
    });

    console.log('\n--- Testing TV SHOW (Arcane S02E01) ---');
    await testRequest({
        tmdbId: '94605',
        type: 'tv',
        season: '2',
        episode: '1'
    });
}

async function testRequest(query) {
    const req = {
        query: query,
        protocol: 'http',
        get: (header) => (header === 'host' ? 'localhost:3000' : '')
    };

    const res = {
        statusCode: 200,
        headers: {},
        status: function (code) {
            this.statusCode = code;
            return this;
        },
        json: function (data) {
            console.log(`Response Status: ${this.statusCode}`);
            if (data.files && data.files.length > 0) {
                console.log(`Found ${data.files.length} streams:`);
                data.files.forEach(f => {
                    console.log(`- [${f.provider}] ${f.extractor} (${f.type}): ${f.file.substring(0, 50)}...`);
                });
            } else {
                console.log('No files found or error:', JSON.stringify(data, null, 2));
            }
            return this;
        },
        setHeader: function (key, value) {
            this.headers[key] = value;
        }
    };

    try {
        await handleUniversalVO(req, res);
    } catch (err) {
        console.error('Handler Error:', err);
    }
}

runTest();
